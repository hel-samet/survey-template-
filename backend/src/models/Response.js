import { collections, db, FieldValue, Timestamp, toIso } from '../config/database.js';
import { Survey } from './Survey.js';

function toResponse(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    surveyId: data.surveyId,
    respondentName: data.respondentName ?? null,
    respondentEmail: data.respondentEmail ?? null,
    signedIn: Boolean(data.respondentUid),
    resubmitAllowed: Boolean(data.resubmitAllowed),
    answers: data.answers ?? {},
    createdAt: toIso(data.createdAt),
  };
}

const newestFirst = (a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

// One lock document per (survey, Google account). `batch.create` fails if it already exists,
// which makes "one answer per person" atomic even when two tabs submit at once.
const lockRef = (surveyId, uid) => collections.submissionLocks().doc(`${surveyId}_${uid}`);
const ALREADY_EXISTS = 6;

export const Response = {
  async create({ surveyId, respondentName = null, respondentUid = null, respondentEmail = null, answers }) {
    const ref = collections.responses().doc();
    const data = {
      surveyId,
      respondentName,
      respondentUid,
      respondentEmail,
      resubmitAllowed: false,
      answers,
      createdAt: Timestamp.now(),
    };

    const batch = db.batch();
    batch.set(ref, data);
    batch.update(collections.surveys().doc(surveyId), { responseCount: FieldValue.increment(1) });
    if (respondentUid) {
      batch.create(lockRef(surveyId, respondentUid), { surveyId, responseId: ref.id, createdAt: data.createdAt });
    }

    try {
      await batch.commit();
    } catch (err) {
      if (err.code === ALREADY_EXISTS) err.alreadySubmitted = true;
      throw err;
    }

    const { respondentUid: _uid, ...rest } = data;
    return { id: ref.id, ...rest, createdAt: toIso(data.createdAt) };
  },

  // The response that currently blocks this person from answering again, if any.
  async findBlocking(surveyId, respondentUid) {
    const lock = await lockRef(surveyId, respondentUid).get();
    if (!lock.exists) return null;
    return Response.findById(lock.data().responseId);
  },

  async allowResubmit(id) {
    const doc = await collections.responses().doc(id).get();
    const uid = doc.exists ? doc.data().respondentUid : null;
    if (!uid) return false;

    const batch = db.batch();
    batch.update(doc.ref, { resubmitAllowed: true });
    batch.delete(lockRef(doc.data().surveyId, uid));
    await batch.commit();
    return true;
  },

  async findById(id) {
    const doc = await collections.responses().doc(id).get();
    return doc.exists ? toResponse(doc) : null;
  },

  // Equality filter + in-memory sort avoids needing a composite (surveyId, createdAt) index.
  async findAllBySurvey(surveyId) {
    const snapshot = await collections.responses().where('surveyId', '==', surveyId).get();
    return snapshot.docs.map(toResponse).sort(newestFirst);
  },

  async findBySurvey(surveyId, { limit = 20, offset = 0 } = {}) {
    const all = await Response.findAllBySurvey(surveyId);
    return all.slice(offset, offset + limit);
  },

  async countBySurvey(surveyId) {
    const snapshot = await collections.responses().where('surveyId', '==', surveyId).count().get();
    return snapshot.data().count;
  },

  async countAll() {
    const snapshot = await collections.responses().count().get();
    return snapshot.data().count;
  },

  async countSince(days) {
    const since = Timestamp.fromMillis(Date.now() - days * 24 * 60 * 60 * 1000);
    const snapshot = await collections.responses().where('createdAt', '>=', since).count().get();
    return snapshot.data().count;
  },

  async findRecent(limit = 8) {
    const snapshot = await collections.responses().orderBy('createdAt', 'desc').limit(limit).get();
    const responses = snapshot.docs.map(toResponse);
    const titles = await Survey.findTitles(responses.map((r) => r.surveyId));
    return responses.map(({ answers: _omit, ...response }) => ({
      ...response,
      surveyTitle: titles[response.surveyId] ?? {},
    }));
  },

  // Deleting a signed-in response also lifts its lock, so that person can answer again.
  async remove(id) {
    const doc = await collections.responses().doc(id).get();
    if (!doc.exists) return false;
    const { surveyId, respondentUid, resubmitAllowed } = doc.data();

    const batch = db.batch();
    batch.delete(doc.ref);
    batch.update(collections.surveys().doc(surveyId), { responseCount: FieldValue.increment(-1) });
    if (respondentUid && !resubmitAllowed) batch.delete(lockRef(surveyId, respondentUid));
    await batch.commit();
    return true;
  },
};
