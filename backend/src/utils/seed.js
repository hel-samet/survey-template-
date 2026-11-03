// Usage: npm run db:seed
// Inserts the sample surveys from database/seed.json, only when the surveys collection is empty.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collections, db, FieldValue } from '../config/database.js';

const seedFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../database/seed.json');

try {
  const existing = await collections.surveys().limit(1).get();
  if (!existing.empty) {
    console.log('[seed] surveys collection is not empty, skipping');
  } else {
    const { surveys } = JSON.parse(await readFile(seedFile, 'utf8'));
    for (const { questions = [], ...survey } of surveys) {
      const surveyRef = collections.surveys().doc();
      const batch = db.batch();
      batch.set(surveyRef, {
        ...survey,
        questionCount: questions.length,
        responseCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      questions.forEach((question, position) => {
        batch.set(collections.questions().doc(), {
          ...question,
          surveyId: surveyRef.id,
          position,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      console.log(`[seed] Created survey ${surveyRef.id} with ${questions.length} questions`);
    }
  }
} catch (err) {
  console.error('[seed] Failed:', err.message);
  process.exitCode = 1;
}
