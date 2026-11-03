import { collections, deleteQuery, FieldValue, toIso } from '../config/database.js';

// questionCount / responseCount are denormalized counters kept in sync by the
// Question and Response models, so listing surveys never scans child documents.
function toSurvey(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title ?? {},
    description: data.description ?? {},
    isActive: Boolean(data.isActive),
    requireLogin: Boolean(data.requireLogin),
    showScore: Boolean(data.showScore),
    questionCount: data.questionCount ?? 0,
    responseCount: data.responseCount ?? 0,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
}

const newestFirst = (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

export const Survey = {
  async findAll({ activeOnly = false } = {}) {
    // Sorted in memory: filtering and ordering on different fields would need a composite index.
    const query = activeOnly ? collections.surveys().where('isActive', '==', true) : collections.surveys();
    const snapshot = await query.get();
    return snapshot.docs.map(toSurvey).sort(newestFirst);
  },

  async findById(id) {
    const doc = await collections.surveys().doc(id).get();
    return doc.exists ? toSurvey(doc) : null;
  },

  async findTitles(ids) {
    const unique = [...new Set(ids)];
    if (!unique.length) return {};
    const docs = await collections.surveys().firestore.getAll(...unique.map((id) => collections.surveys().doc(id)));
    return Object.fromEntries(docs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data().title ?? {}]));
  },

  async create({ title, description = {}, isActive = true, requireLogin = false, showScore = false }) {
    const ref = collections.surveys().doc();
    await ref.set({
      title,
      description,
      isActive,
      requireLogin,
      showScore,
      questionCount: 0,
      responseCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return Survey.findById(ref.id);
  },

  async update(id, { title, description, isActive, requireLogin, showScore }) {
    const ref = collections.surveys().doc(id);
    if (!(await ref.get()).exists) return null;
    await ref.update({ title, description, isActive, requireLogin, showScore, updatedAt: FieldValue.serverTimestamp() });
    return Survey.findById(id);
  },

  // Deletes the survey together with its questions, responses and sign-in locks.
  async remove(id) {
    const ref = collections.surveys().doc(id);
    if (!(await ref.get()).exists) return false;
    await deleteQuery(collections.questions().where('surveyId', '==', id));
    await deleteQuery(collections.responses().where('surveyId', '==', id));
    await deleteQuery(collections.submissionLocks().where('surveyId', '==', id));
    await ref.delete();
    return true;
  },
};
