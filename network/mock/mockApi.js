// Simple mock router that reads from bundled db.json
import db from './db.json';

export async function requestMock(method, endpoint, payload) {
  const key = endpoint;
  const entry = db[key];
  if (entry !== undefined) {
    return { status: 'success', data: entry };
  }
  return { status: 'error', code: 'MOCK_NOT_FOUND', message: `No mock for ${method} ${endpoint}` };
}


