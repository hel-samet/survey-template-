import { collections, db, FieldValue } from '../config/database.js';

function toQuestion(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    surveyId: data.surveyId,
    text: data.text ?? {},
    type: data.type,
    options: data.options ?? [],
    settings: data.settings ?? {},
    isRequired: Boolean(data.isRequired),
    position: data.position ?? 0,
  };
}

const byPosition = (a, b) => a.position - b.position || a.id.localeCompare(b.id);

export const Question = {
  async findBySurvey(surveyId) {
    const snapshot = await collections.questions().where('surveyId', '==', surveyId).get();
    return snapshot.docs.map(toQuestion).sort(byPosition);
  },

  async findById(id) {
    const doc = await collections.questions().doc(id).get();
    return doc.exists ? toQuestion(doc) : null;
  },

  async create({ surveyId, text, type, options = [], settings = {}, isRequired = false, position }) {
    if (position === undefined) {
      const existing = await Question.findBySurvey(surveyId);
      position = existing.length ? existing[existing.length - 1].position + 1 : 0;
    }

    const ref = collections.questions().doc();
    const batch = db.batch();
    batch.set(ref, {
      surveyId,
      text,
      type,
      options,
      settings,
      isRequired,
      position,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.update(collections.surveys().doc(surveyId), { questionCount: FieldValue.increment(1) });
    await batch.commit();
    return Question.findById(ref.id);
  },

  async update(id, { text, type, options, settings, isRequired, position }) {
    const ref = collections.questions().doc(id);
    if (!(await ref.get()).exists) return null;
    await ref.update({ text, type, options, settings, isRequired, position, updatedAt: FieldValue.serverTimestamp() });
    return Question.findById(id);
  },

  async remove(id) {
    const question = await Question.findById(id);
    if (!question) return false;

    const batch = db.batch();
    batch.delete(collections.questions().doc(id));
    batch.update(collections.surveys().doc(question.surveyId), { questionCount: FieldValue.increment(-1) });
    await batch.commit();
    return true;
  },

  async reorder(surveyId, orderedIds) {
    const belongsToSurvey = new Set((await Question.findBySurvey(surveyId)).map((q) => q.id));
    const batch = db.batch();
    orderedIds.forEach((id, position) => {
      if (belongsToSurvey.has(id)) batch.update(collections.questions().doc(id), { position });
    });
    await batch.commit();
    return Question.findBySurvey(surveyId);
  },
};
