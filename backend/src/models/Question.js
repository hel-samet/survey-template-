import { query, toJson, withTransaction } from '../config/database.js';

const SELECT = `
  SELECT id,
         survey_id   AS "surveyId",
         text, type, options,
         is_required AS "isRequired",
         position
  FROM questions`;

export const Question = {
  async findBySurvey(surveyId) {
    const { rows } = await query(`${SELECT} WHERE survey_id = $1 ORDER BY position, id`, [surveyId]);
    return rows;
  },

  async findById(id) {
    const { rows } = await query(`${SELECT} WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async create({ surveyId, text, type, options = [], isRequired = false, position }) {
    const { rows } = await query(
      `INSERT INTO questions (survey_id, text, type, options, is_required, position)
       VALUES ($1, $2, $3, $4, $5,
               COALESCE($6, (SELECT COALESCE(MAX(position) + 1, 0) FROM questions WHERE survey_id = $1)))
       RETURNING id`,
      [surveyId, toJson(text), type, toJson(options), isRequired, position ?? null],
    );
    return Question.findById(rows[0].id);
  },

  async update(id, { text, type, options, isRequired, position }) {
    const { rowCount } = await query(
      `UPDATE questions
          SET text        = COALESCE($2::jsonb, text),
              type        = COALESCE($3, type),
              options     = COALESCE($4::jsonb, options),
              is_required = COALESCE($5, is_required),
              position    = COALESCE($6, position)
        WHERE id = $1`,
      [id, toJson(text), type ?? null, toJson(options), isRequired ?? null, position ?? null],
    );
    return rowCount ? Question.findById(id) : null;
  },

  async remove(id) {
    const { rowCount } = await query('DELETE FROM questions WHERE id = $1', [id]);
    return rowCount > 0;
  },

  async reorder(surveyId, orderedIds) {
    await withTransaction(async (client) => {
      for (const [position, id] of orderedIds.entries()) {
        await client.query('UPDATE questions SET position = $1 WHERE id = $2 AND survey_id = $3', [
          position,
          id,
          surveyId,
        ]);
      }
    });
    return Question.findBySurvey(surveyId);
  },
};
