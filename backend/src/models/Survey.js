import { query, toJson } from '../config/database.js';

const SELECT = `
  SELECT s.id, s.title, s.description,
         s.is_active  AS "isActive",
         s.require_login AS "requireLogin",
         s.show_score AS "showScore",
         s.cover_updated_at AS "coverUpdatedAt",
         s.created_at AS "createdAt",
         s.updated_at AS "updatedAt",
         (SELECT COUNT(*)::int FROM questions q WHERE q.survey_id = s.id) AS "questionCount",
         (SELECT COUNT(*)::int FROM responses r WHERE r.survey_id = s.id) AS "responseCount"
  FROM surveys s`;

export const Survey = {
  async findAll({ activeOnly = false } = {}) {
    const where = activeOnly ? 'WHERE s.is_active' : '';
    const { rows } = await query(`${SELECT} ${where} ORDER BY s.created_at DESC`);
    return rows;
  },

  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE s.id = $1`, [id]);
    return rows[0] || null;
  },

  async create({ title, description = {}, isActive = true, requireLogin = false, showScore = false }) {
    const { rows } = await query(
      `INSERT INTO surveys (title, description, is_active, require_login, show_score)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [toJson(title), toJson(description), isActive, requireLogin, showScore],
    );
    return Survey.findById(rows[0].id);
  },

  async update(id, { title, description, isActive, requireLogin, showScore }) {
    const { rowCount } = await query(
      `UPDATE surveys
          SET title         = COALESCE($2::jsonb, title),
              description   = COALESCE($3::jsonb, description),
              is_active     = COALESCE($4, is_active),
              require_login = COALESCE($5, require_login),
              show_score    = COALESCE($6, show_score)
        WHERE id = $1`,
      [id, toJson(title), toJson(description), isActive ?? null, requireLogin ?? null, showScore ?? null],
    );
    return rowCount ? Survey.findById(id) : null;
  },

  async findCover(id) {
    const { rows } = await query(
      `SELECT cover_image AS data, cover_image_type AS type, cover_updated_at AS "updatedAt"
         FROM surveys WHERE id = $1 AND cover_image IS NOT NULL`,
      [id],
    );
    return rows[0] || null;
  },

  // Pass data = null to remove the cover.
  async setCover(id, { data, type }) {
    const { rowCount } = await query(
      `UPDATE surveys
          SET cover_image      = $2,
              cover_image_type = $3,
              cover_updated_at = CASE WHEN $2::bytea IS NULL THEN NULL ELSE NOW() END
        WHERE id = $1`,
      [id, data, data ? type : null],
    );
    return rowCount ? Survey.findById(id) : null;
  },

  async remove(id) {
    const { rowCount } = await query('DELETE FROM surveys WHERE id = $1', [id]);
    return rowCount > 0;
  },
};
