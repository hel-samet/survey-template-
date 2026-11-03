import { query, toJson } from '../config/database.js';

const SELECT = `
  SELECT id,
         survey_id       AS "surveyId",
         respondent_name AS "respondentName",
         answers,
         created_at      AS "createdAt"
  FROM responses`;

export const Response = {
  async create({ surveyId, respondentName = null, answers }) {
    const { rows } = await query(
      `INSERT INTO responses (survey_id, respondent_name, answers)
       VALUES ($1, $2, $3)
       RETURNING id, survey_id AS "surveyId", respondent_name AS "respondentName", answers, created_at AS "createdAt"`,
      [surveyId, respondentName, toJson(answers)],
    );
    return rows[0];
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
