// Simple mock router that reads from bundled db.json
import db from './db.json';

export async function requestMock(method, endpoint, payload) {
  // Handle updateDayPassStatus with different actions
  if (endpoint === 'updateDaypassStatus' && payload) {
    if (payload.action === 'Approve' || payload.action === 'redeem') {
      return { status: 'success', data: db['updateDayPassStatus_approve'] };
    }
    if (payload.action === 'Reject' || payload.action === 'reject') {
      return { status: 'success', data: db['updateDayPassStatus_reject'] };
    }
    if (payload.action === 'unredeem') {
      return { status: 'success', data: db['updateDayPassStatus'] };
    }
  }

  // Handle getDaypassStatus with different dayPassNumbers
  if (endpoint === 'getDaypassStatus' && payload?.dayPassNumber) {
    if (payload.dayPassNumber === '2') {
      return { status: 'success', data: db['getDaypassStatus_rishikesh'] }; // active
    }
    if (payload.dayPassNumber === '3') {
      return { status: 'success', data: db['getDaypassStatus_rishikesh_redeemed'] }; // redeemed
    }
    if (payload.dayPassNumber === '4') {
      return { status: 'success', data: db['getDaypassStatus_rishikesh_rejected'] }; // rejected
    }
    if (payload.dayPassNumber === '2232') {
      return { status: 'success', data: db['getDaypassStatus_kartik'] };
    }
    // Any other number returns not found
    return { status: 'success', data: db['getDaypassStatus_not_found'] };
  }

  // Handle loginScanner with different eventIds
  if (endpoint === 'loginScanner' && payload?.eventId) {
    if (payload.eventId === 'RishikeshKirtanFest2026') {
      return { status: 'success', data: db['loginScanner_rishikesh_event'] };
    }
  }

  const key = endpoint;
  const entry = db[key];
  if (entry !== undefined) {
    return { status: 'success', data: entry };
  }
  return { status: 'error', code: 'MOCK_NOT_FOUND', message: `No mock for ${method} ${endpoint}` };
}


