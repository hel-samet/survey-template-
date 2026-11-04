// Styled Excel (.xlsx) export: a "Responses" sheet with one row per submission and a "Summary" sheet
// with per-question counts, mirroring the admin Reports page. CSV stays available as a plain export.
import ExcelJS from 'exceljs';
import { env } from '../config/env.js';
import { Response } from '../models/Response.js';
import { CHOICE_TYPES, OTHER_ID, RANGE_TYPES, otherKey, rangeOf } from '../validators/questionTypes.js';
import { formatAnswer } from './notificationService.js';
import { maxScoreOf, scoreAnswers } from './scoringService.js';
import { buildReport, getSurveyWithQuestions } from './surveyService.js';

const COLOR = {
  primary: 'FF0F766E',
  primaryDark: 'FF0C3F3B',
  primarySoft: 'FFE3F3F0',
  zebra: 'FFF6F9F8',
  border: 'FFDCE4E2',
  text: 'FF10201E',
  muted: 'FF5A6B68',
  white: 'FFFFFFFF',
  good: ['FFE3F6E9', 'FF15803D'],
  mid: ['FFFDF4D8', 'FFA16207'],
  bad: ['FFFDEEE6', 'FFC2410C'],
};

const LABELS = {
  en: {
    responses: 'Responses',
    summary: 'Summary',
    no: 'No.',
    submittedAt: 'Submitted at',
    name: 'Name',
    email: 'Email',
    score: 'Score',
    percent: '%',
    exported: 'Exported',
    count: (n) => `${n} ${n === 1 ? 'response' : 'responses'}`,
    averageScore: 'Average score',
    highest: 'Highest',
    lowest: 'Lowest',
    average: 'Average',
    answered: (n, total) => `Answered by ${n} of ${total}`,
    option: 'Answer',
    votes: 'Count',
    share: '% of responses',
    chart: 'Chart',
    correct: '✓ correct',
    otherAnswers: '"Other" answers',
    seeResponses: 'Written answers are listed on the Responses sheet.',
  },
  km: {
    responses: 'ចម្លើយ',
    summary: 'សង្ខេប',
    no: 'ល.រ',
    submittedAt: 'ពេលបញ្ជូន',
    name: 'ឈ្មោះ',
    email: 'អ៊ីមែល',
    score: 'ពិន្ទុ',
    percent: '%',
    exported: 'នាំចេញ',
    count: (n) => `${n} ចម្លើយ`,
    averageScore: 'ពិន្ទុមធ្យម',
    highest: 'ខ្ពស់បំផុត',
    lowest: 'ទាបបំផុត',
    average: 'មធ្យម',
    answered: (n, total) => `បានឆ្លើយ ${n} នាក់ ក្នុងចំណោម ${total}`,
    option: 'ចម្លើយ',
    votes: 'ចំនួន',
    share: '% នៃចម្លើយ',
    chart: 'តារាង',
    correct: '✓ ត្រឹមត្រូវ',
    otherAnswers: 'ចម្លើយ "ផ្សេងៗ"',
    seeResponses: 'ចម្លើយជាអក្សរ មាននៅក្នុងសន្លឹក ចម្លើយ។',
  },
};

const thin = { style: 'thin', color: { argb: COLOR.border } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const font = (extra = {}) => ({ name: 'Calibri', size: 11, color: { argb: COLOR.text }, ...extra });

// Excel dates carry no time zone, so write the wall-clock time of the configured TIMEZONE.
function localDate(value) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: env.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(value))
      .map((p) => [p.type, p.value]),
  );
  return new Date(Date.UTC(+parts.year, parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second));
}

const pad = (n) => String(n).padStart(2, '0');
const formatLocal = (date) =>
  `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;

const scoreTone = (ratio) => (ratio >= 0.8 ? COLOR.good : ratio >= 0.5 ? COLOR.mid : COLOR.bad);
// Text bar chart for the Summary sheet; 16 blocks fill the Chart column.
const bar = (ratio) => '█'.repeat(Math.round(ratio * 16));

// Title banner (row 1) and subtitle (row 2) across the first `width` columns, then a thin spacer row.
function addBanner(sheet, width, title, subtitle) {
  sheet.mergeCells(1, 1, 1, width);
  sheet.mergeCells(2, 1, 2, width);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = font({ size: 16, bold: true, color: { argb: COLOR.white } });
  titleCell.fill = fill(COLOR.primary);
  titleCell.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(1).height = 34;

  const subCell = sheet.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font = font({ size: 10, color: { argb: COLOR.muted } });
  subCell.fill = fill(COLOR.primarySoft);
  subCell.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(2).height = 22;
  sheet.getRow(3).height = 8;
}

function styleHeader(row) {
  row.height = 32;
  row.eachCell((cell) => {
    cell.font = font({ bold: true, color: { argb: COLOR.white } });
    cell.fill = fill(COLOR.primaryDark);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER;
  });
}

// One line per selected option, so multi-answer cells stay readable.
function answerCell(question, answers, lang) {
  const value = answers[question.id];
  if (value === undefined || value === null || value === '') return { value: null };

  if (CHOICE_TYPES.includes(question.type)) {
    const lines = (Array.isArray(value) ? value : [value]).map((id) => {
      const option = question.options.find((o) => o.id === id);
      const text = option ? option.label[lang] || option.label.en || option.label.km : id;
      const other = id === OTHER_ID && answers[otherKey(question.id)];
      return other ? `${text}: ${other}` : text;
    });
    return { value: lines.join('\n') };
  }
  if (RANGE_TYPES.includes(question.type)) {
    const star = question.type === 'rating' ? ' ★' : '';
    return { value: Number(value), numFmt: `0" / ${rangeOf(question).max}${star}"`, align: 'center' };
  }
  if (question.type === 'number') return { value: Number(value), numFmt: 'General', align: 'right' };
  if (question.type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { value: new Date(`${value}T00:00:00Z`), numFmt: 'dd/mm/yyyy', align: 'center' };
  }
  return { value: formatAnswer(question, answers, lang) };
}

// Width from the longest line in each column, kept between `min` and `max` characters.
function fitColumns(sheet, fromRow, { min = 8, max = 48 } = {}) {
  sheet.columns.forEach((column) => {
    let longest = 0;
    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber < fromRow) return;
      const text = cell.value instanceof Date ? '00/00/0000 00:00' : String(cell.value ?? '');
      for (const line of text.split('\n')) longest = Math.max(longest, line.length);
    });
    column.width = Math.min(max, Math.max(min, longest + 3));
  });
}

function buildResponsesSheet(workbook, survey, responses, t, lang, subtitle) {
  const sheet = workbook.addWorksheet(t.responses, {
    properties: { tabColor: { argb: COLOR.primary } },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4' },
  });
  const pick = (localized) => localized?.[lang] || localized?.en || localized?.km || '';
  const maxScore = maxScoreOf(survey.questions);
  const withEmail = responses.some((r) => r.respondentEmail);

  const fixed = [t.no, t.submittedAt, t.name, ...(withEmail ? [t.email] : []), ...(maxScore ? [t.score, t.percent] : [])];
  const header = [...fixed, ...survey.questions.map((q) => pick(q.text))];
  addBanner(sheet, header.length, pick(survey.title), subtitle);
  const headerRow = sheet.getRow(4);
  headerRow.values = header;
  styleHeader(headerRow);

  responses.forEach((response, index) => {
    const row = sheet.getRow(5 + index);
    const cells = [
      { value: index + 1, align: 'center' },
      { value: localDate(response.createdAt), numFmt: 'dd/mm/yyyy hh:mm', align: 'center' },
      { value: response.respondentName || '' },
      ...(withEmail ? [{ value: response.respondentEmail || '' }] : []),
    ];
    if (maxScore) {
      const { score } = scoreAnswers(survey.questions, response.answers);
      const [bg, fg] = scoreTone(score / maxScore);
      cells.push(
        { value: score, numFmt: `General" / ${maxScore}"`, align: 'center', bold: true },
        { value: score / maxScore, numFmt: '0%', align: 'center', bold: true, bg, fg },
      );
    }
    cells.push(...survey.questions.map((q) => answerCell(q, response.answers, lang)));

    cells.forEach((spec, col) => {
      const cell = row.getCell(col + 1);
      cell.value = spec.value;
      if (spec.numFmt) cell.numFmt = spec.numFmt;
      cell.font = font({ bold: spec.bold, ...(spec.fg && { color: { argb: spec.fg } }) });
      cell.alignment = { vertical: 'top', horizontal: spec.align, wrapText: true };
      cell.border = BORDER;
      const background = spec.bg || (index % 2 ? COLOR.zebra : null);
      if (background) cell.fill = fill(background);
    });
  });

  fitColumns(sheet, 4);
  sheet.getColumn(1).width = 6;
  survey.questions.forEach((_, i) => {
    const column = sheet.getColumn(fixed.length + i + 1);
    column.width = Math.max(column.width, 18);
  });

  sheet.views = [{ state: 'frozen', xSplit: 3, ySplit: 4, activeCell: 'A5' }];
  if (responses.length) {
    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + responses.length, column: header.length } };
  }
}

function buildSummarySheet(workbook, report, t, lang, subtitle) {
  const sheet = workbook.addWorksheet(t.summary, {
    properties: { tabColor: { argb: COLOR.primaryDark } },
    pageSetup: { orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const pick = (localized) => localized?.[lang] || localized?.en || localized?.km || '';
  const total = report.totalResponses;
  sheet.columns = [{ width: 52 }, { width: 11 }, { width: 15 }, { width: 26 }];
  addBanner(sheet, 4, pick(report.survey.title), subtitle);

  let r = 4;
  const put = (values, style = {}) => {
    const row = sheet.getRow(r++);
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1);
      cell.value = value;
      cell.font = font(style.font?.(i) ?? {});
      // Labels and the bar chart column stay left-aligned; numbers are centered.
      const left = i === 0 || String(value).includes('█') || value === t.chart;
      cell.alignment = { vertical: 'middle', wrapText: i === 0, horizontal: left ? undefined : 'center' };
      if (style.numFmt?.[i]) cell.numFmt = style.numFmt[i];
      if (style.bg) cell.fill = fill(style.bg);
      if (style.border) cell.border = BORDER;
    });
    return row;
  };
  const section = (title) => {
    sheet.mergeCells(r, 1, r, 4);
    const row = put([title], { font: () => ({ bold: true, size: 12, color: { argb: COLOR.primaryDark } }), bg: COLOR.primarySoft });
    row.height = 24;
    row.getCell(1).alignment = { vertical: 'middle', wrapText: true, indent: 1 };
  };
  const tableHeader = (labels) =>
    put(labels, { font: () => ({ bold: true, size: 10, color: { argb: COLOR.muted } }), border: true, bg: COLOR.zebra });
  const shareRow = (label, count, highlight) =>
    put([label, count, total ? count / total : 0, bar(total ? count / total : 0)], {
      numFmt: { 2: '0%' },
      border: true,
      font: (i) => (i === 3 ? { color: { argb: COLOR.primary } } : highlight ? { bold: true, color: { argb: COLOR.good[1] } } : {}),
    });

  if (report.scoring && report.scoring.average !== null) {
    const { average, highest, lowest, maxScore } = report.scoring;
    section(t.score);
    tableHeader(['', t.score, t.percent, t.chart]);
    for (const [label, value] of [
      [t.averageScore, average],
      [t.highest, highest],
      [t.lowest, lowest],
    ]) {
      put([label, value, value / maxScore, bar(value / maxScore)], {
        numFmt: { 1: `General" / ${maxScore}"`, 2: '0%' },
        border: true,
        font: (i) => (i === 3 ? { color: { argb: COLOR.primary } } : i === 0 ? { bold: true } : {}),
      });
    }
    r += 1;
  }

  report.questions.forEach((question, index) => {
    section(`${index + 1}. ${pick(question.text)}`);
    put([t.answered(question.answeredCount, total)], { font: () => ({ size: 10, italic: true, color: { argb: COLOR.muted } }) });

    if (CHOICE_TYPES.includes(question.type)) {
      const correct = new Set(question.settings?.correct ?? []);
      tableHeader([t.option, t.votes, t.share, t.chart]);
      for (const option of question.options) {
        const label = pick(option.label) + (correct.has(option.id) ? `   ${t.correct}` : '');
        shareRow(label, option.count, correct.has(option.id));
      }
      if (question.otherAnswers?.length) {
        put([t.otherAnswers], { font: () => ({ bold: true, size: 10, color: { argb: COLOR.muted } }) });
        for (const answer of question.otherAnswers) put([`• ${answer.value}`]);
      }
    } else if (RANGE_TYPES.includes(question.type)) {
      const { max } = rangeOf(question);
      if (question.average !== null) {
        put([t.average, question.average], { font: () => ({ bold: true }), numFmt: { 1: `General" / ${max}"` } });
      }
      tableHeader([t.option, t.votes, t.share, t.chart]);
      for (const point of question.distribution) {
        shareRow(question.type === 'rating' ? `${'★'.repeat(point.value)}  (${point.value})` : String(point.value), point.count);
      }
    } else if (question.type === 'number' && question.stats) {
      tableHeader(['', t.average, t.lowest, t.highest]);
      put(['', question.stats.average, question.stats.min, question.stats.max], { border: true });
    } else {
      put([t.seeResponses], { font: () => ({ size: 10, italic: true, color: { argb: COLOR.muted } }) });
    }
    r += 1;
  });

  sheet.views = [{ showGridLines: false }];
}

const KHMER = /[ក-៿᧠-᧿]/;

// Calibri has no Khmer glyphs and Excel's fallback shapes some clusters wrongly; Khmer UI ships with Windows.
function useKhmerFont(workbook) {
  workbook.eachSheet((sheet) =>
    sheet.eachRow((row) =>
      row.eachCell((cell) => {
        if (typeof cell.value === 'string' && KHMER.test(cell.value)) cell.font = { ...cell.font, name: 'Khmer UI' };
      }),
    ),
  );
}

export async function buildXlsx(surveyId, lang = 'en') {
  const t = LABELS[lang] ?? LABELS.en;
  const [survey, responses, report] = await Promise.all([
    getSurveyWithQuestions(surveyId),
    Response.findAllBySurvey(surveyId),
    buildReport(surveyId),
  ]);
  // Oldest first reads naturally in a spreadsheet; the No. column then matches submission order.
  responses.reverse();

  const parts = [`${t.exported} ${formatLocal(localDate(new Date()))}`, t.count(responses.length)];
  if (report.scoring?.average != null) {
    parts.push(`${t.averageScore} ${report.scoring.average} / ${report.scoring.maxScore}`);
  }
  const subtitle = parts.join('   ·   ');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Survey System';
  workbook.created = new Date();
  buildResponsesSheet(workbook, survey, responses, t, lang, subtitle);
  buildSummarySheet(workbook, report, t, lang, subtitle);
  useKhmerFont(workbook);
  return workbook.xlsx.writeBuffer();
}
