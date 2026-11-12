import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCaseAction, caseIsConnected, freshCaseWorkflow, loadCaseWorkflow, CASE_WORKFLOW_KEY, CASE_CONNECTION_SHARE_VND } from '../src/caseWorkflow.js';

const startup = 'startup-demo', investor = 'investor-demo';
const apply = (state, actor, type, extra = {}) => applyCaseAction(state, actor, { type, ...extra });

test('sample startup cases appear in demo without overwriting saved cases', () => {
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  const first = loadCaseWorkflow(storage);
  assert.deepEqual(first.cases.map(item => item.id), ['sample-case-lotus', 'sample-case-verda', 'sample-case-medflow']);
  assert.ok(first.cases.every(item => item.stage === 'published' && item.sample && item.publicBrief));
  const existing = apply(freshCaseWorkflow(), startup, 'create-case', { title: 'Case riêng của tôi', industry: 'SaaS', summary: 'Bản nháp của startup để tiếp tục chỉnh sửa sau.' });
  storage.setItem(CASE_WORKFLOW_KEY, JSON.stringify(existing));
  const restored = loadCaseWorkflow(storage);
  assert.equal(restored.cases[0].id, existing.cases[0].id);
  assert.equal(restored.cases[0].stage, 'draft');
  assert.equal(restored.cases.length, 4);
  storage.setItem(CASE_WORKFLOW_KEY, JSON.stringify(restored));
  assert.equal(loadCaseWorkflow(storage).cases.length, 4);
});

test('case stays private until listing and mentor demo steps are complete', () => {
  let state = apply(freshCaseWorkflow(), startup, 'create-case', { title: 'LotusPay Seed', industry: 'Fintech', summary: 'Mở rộng thanh toán cho doanh nghiệp nhỏ tại Việt Nam.' });
  const caseId = state.cases[0].id;
  assert.equal(state.cases[0].stage, 'draft');
  assert.throws(() => apply(state, investor, 'request-connection', { caseId, message: 'Tôi muốn tìm hiểu về case này.' }), /chưa được công bố/);
  state = apply(state, startup, 'submit-case', { caseId });
  assert.equal(state.cases[0].listingPayment, 'simulated');
  assert.equal(state.cases[0].stage, 'mentor');
  assert.throws(() => apply(state, investor, 'request-connection', { caseId, message: 'Tôi muốn tìm hiểu về case này.' }), /chưa được công bố/);
  state = apply(state, startup, 'complete-mentor-sample', { caseId });
  assert.equal(state.cases[0].stage, 'published');
  assert.equal(state.cases[0].mentor.status, 'sample');
});

test('approval creates two 250k demo dues; chat opens only after both sides confirm', () => {
  let state = apply(freshCaseWorkflow(), startup, 'create-case', { title: 'LotusPay Seed', industry: 'Fintech', summary: 'Mở rộng thanh toán cho doanh nghiệp nhỏ tại Việt Nam.' });
  const caseId = state.cases[0].id;
  state = apply(state, startup, 'submit-case', { caseId });
  state = apply(state, startup, 'complete-mentor-sample', { caseId });
  state = apply(state, investor, 'request-connection', { caseId, message: 'Tôi muốn tìm hiểu về case này.' });
  const requestId = state.cases[0].requests[0].id;
  assert.throws(() => apply(state, investor, 'simulate-connection-payment', { caseId, requestId }), /đồng ý/);
  state = apply(state, startup, 'decide-connection', { caseId, requestId, decision: 'approved' });
  assert.equal(CASE_CONNECTION_SHARE_VND, 250000);
  assert.deepEqual(state.cases[0].requests[0].payments, { startup: 'due', investor: 'due' });
  state = apply(state, investor, 'simulate-connection-payment', { caseId, requestId });
  assert.equal(caseIsConnected(state.cases[0].requests[0]), false);
  assert.throws(() => apply(state, investor, 'send-case-message', { caseId, requestId, text: 'Xin chào.' }), /cả hai bên/);
  state = apply(state, startup, 'simulate-connection-payment', { caseId, requestId });
  assert.equal(caseIsConnected(state.cases[0].requests[0]), true);
  state = apply(state, investor, 'send-case-message', { caseId, requestId, text: 'Xin chào.' });
  assert.equal(state.cases[0].requests[0].messages[0].authorId, investor);
  state = apply(state, startup, 'revoke-connection', { caseId, requestId });
  assert.equal(caseIsConnected(state.cases[0].requests[0]), false);
  assert.throws(() => apply(state, investor, 'send-case-message', { caseId, requestId, text: 'Tin sau khi thu hồi.' }), /cả hai bên/);
});

test('rejected request has no payment due and investor can retry', () => {
  let state = apply(freshCaseWorkflow(), startup, 'create-case', { title: 'LotusPay Seed', industry: 'Fintech', summary: 'Mở rộng thanh toán cho doanh nghiệp nhỏ tại Việt Nam.' });
  const caseId = state.cases[0].id;
  state = apply(state, startup, 'submit-case', { caseId });
  state = apply(state, startup, 'complete-mentor-sample', { caseId });
  state = apply(state, investor, 'request-connection', { caseId, message: 'Tôi muốn tìm hiểu về case này.' });
  const requestId = state.cases[0].requests[0].id;
  state = apply(state, startup, 'decide-connection', { caseId, requestId, decision: 'rejected' });
  assert.deepEqual(state.cases[0].requests[0].payments, { startup: 'not-due', investor: 'not-due' });
  state = apply(state, investor, 'request-connection', { caseId, message: 'Tôi xin gửi yêu cầu lại với thông tin mới.' });
  assert.equal(state.cases[0].requests.length, 2);
});
