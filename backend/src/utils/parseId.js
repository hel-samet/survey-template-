import { ApiError } from './ApiError.js';

// Firestore document IDs (auto-generated ones are 20 alphanumeric characters).
const DOC_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function parseId(value, name = 'id') {
  if (typeof value !== 'string' || !DOC_ID.test(value)) {
    throw new ApiError(400, `Invalid ${name}`);
  }
  return value;
}
