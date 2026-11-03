import { ApiError } from './ApiError.js';

export function parseId(value, name = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new ApiError(400, `Invalid ${name}`);
  }
  return id;
}
