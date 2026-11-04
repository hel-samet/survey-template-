import { query, toJson } from '../config/database.js';

const SELECT = `
  SELECT id,
         survey_id       AS "surveyId",
         respondent_name AS "respondentName",
         respondent_email AS "respondentEmail",
         respondent_uid IS NOT NULL AS "signedIn",
         resubmit_allowed AS "resubmitAllowed",
         answers,
         created_at      AS "createdAt"
  FROM responses`;

// PostgreSQL unique_violation, raised by uq_responses_one_per_user on a double submit.
const UNIQUE_VIOLATION = '23505';

export const Response = {
  async create({ surveyId, respondentName = null, respondentUid = null, respondentEmail = null, answers }) {
    try {
      const { rows } = await query(
        `INSERT INTO responses (survey_id, respondent_name, respondent_uid, respondent_email, answers)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, survey_id AS "surveyId", respondent_name AS "respondentName",
                   respondent_email AS "respondentEmail", answers, created_at AS "createdAt"`,
        [surveyId, respondentName, respondentUid, respondentEmail, toJson(answers)],
      );
      return rows[0];
    } catch (err) {
      if (err.code === UNIQUE_VIOLATION) err.alreadySubmitted = true;
      throw err;
    }
  },

  // The response that currently blocks this person from answering again, if any.
  async findBlocking(surveyId, respondentUid) {
    const { rows } = await query(
      `${SELECT} WHERE survey_id = $1 AND respondent_uid = $2 AND NOT resubmit_allowed LIMIT 1`,
      [surveyId, respondentUid],
    );
    return rows[0] || null;
  },

  async allowResubmit(id) {
    const { rowCount } = await query(
      'UPDATE responses SET resubmit_allowed = TRUE WHERE id = $1 AND respondent_uid IS NOT NULL',
      [id],
    );
    return rowCount > 0;
  },

  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async findBySurvey(surveyId, { limit = 20, offset = 0 } = {}) {
    const { rows } = await query(
      `${SELECT} WHERE survey_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
      [surveyId, limit, offset],
    );
    return rows;
  },

  async findAllBySurvey(surveyId) {
    const { rows } = await query(`${SELECT} WHERE survey_id = $1 ORDER BY created_at DESC, id DESC`, [surveyId]);
    return rows;
  },

  async recentBySurvey(surveyId, limit = 8) {
    const { rows } = await query(`${SELECT} WHERE survey_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2`, [
      surveyId,
      limit,
    ]);
    return rows;
  },

  // Submissions in the last hour, since local midnight in `timezone`, and in total.
  async countsSince(surveyId, timezone) {
    const { rows } = await query(
      `SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::int AS "lastHour",
              COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE $2) AT TIME ZONE $2)::int AS today,
              COUNT(*)::int AS total
         FROM responses WHERE survey_id = $1`,
      [surveyId, timezone],
    );
    return rows[0];
  },

  async countBySurvey(surveyId) {
    const { rows } = await query('SELECT COUNT(*)::int AS count FROM responses WHERE survey_id = $1', [surveyId]);
    return rows[0].count;
  },

  async countAll() {
    const { rows } = await query('SELECT COUNT(*)::int AS count FROM responses');
    return rows[0].count;
  },

  async countSince(days) {
    const { rows } = await query(
      `SELECT COUNT(*)::int AS count FROM responses WHERE created_at >= NOW() - make_interval(days => $1)`,
      [days],
    );
    return rows[0].count;
  },

  async findRecent(limit = 8) {
    const { rows } = await query(
      `SELECT r.id,
              r.survey_id       AS "surveyId",
              s.title           AS "surveyTitle",
              r.respondent_name AS "respondentName",
              r.created_at      AS "createdAt"
         FROM responses r
         JOIN surveys s ON s.id = r.survey_id
        ORDER BY r.created_at DESC
        LIMIT $1`,
      [limit],
    );
    return rows;
  },

  async remove(id) {
    const { rowCount } = await query('DELETE FROM responses WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
