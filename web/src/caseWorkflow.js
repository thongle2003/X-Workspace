export const CASE_WORKFLOW_KEY = '2g2bt-demo-case-workflow-v1';
export const CASE_CONNECTION_TOTAL_VND = 500000;
export const CASE_CONNECTION_SHARE_VND = CASE_CONNECTION_TOTAL_VND / 2;
// Public prices from the team's financial plan; checkout remains unavailable.
export const STARTUP_LISTING_FEE_VND = 899000;
export const AI_PITCHDECK_REVIEW_FEE_VND = 200000;

const makeId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const stamp = () => new Date().toISOString();
const clean = (value, min, max, label) => {
  const result = String(value ?? '').trim();
  if (result.length < min || result.length > max) throw new Error(`${label} cần từ ${min} đến ${max} ký tự.`);
  return result;
};
const requireRole = (actor, role) => {
  if (actor !== role) throw new Error(`Chỉ ${role === 'startup-demo' ? 'Startup' : 'Investor'} được thực hiện bước này.`);
};
const findCase = (state, caseId) => {
  const item = state.cases.find(entry => entry.id === caseId);
  if (!item) throw new Error('Không tìm thấy case.');
  return item;
};
const latestRequest = item => [...item.requests].reverse().find(request => request.investorId === 'investor-demo');

const sampleCase = ({ id, startupId, title, industry, summary, publicBrief }) => ({
  id, startupId, ownerId: 'startup-demo', sample: true,
  title, industry, summary, publicBrief,
  stage: 'published', listingPayment: 'simulated',
  mentor: { status: 'sample', result: 'Cần đối chiếu nội dung hồ sơ với tài liệu gốc, dòng tiền và kế hoạch sử dụng vốn trước khi đưa ra quyết định đầu tư.' },
  requests: [], createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z',
});

const SAMPLE_CASES = [
  sampleCase({ id: 'sample-case-lotus', startupId: 'lotus', title: 'LotusPay · Mở rộng thanh toán cho SME', industry: 'Fintech', summary: 'Hạ tầng API thu hộ và đối soát giao dịch cho doanh nghiệp nhỏ. Nhu cầu mở rộng sản phẩm và tiếp cận nhà đầu tư vòng Seed.', publicBrief: 'LotusPay giúp doanh nghiệp nhỏ quản lý thanh toán đa kênh và đối soát giao dịch. Pitch deck và báo cáo tài chính riêng chưa được tải lên.' }),
  sampleCase({ id: 'sample-case-verda', startupId: 'verda', title: 'Verda · Dữ liệu phát thải chuỗi cung ứng', industry: 'Climate Tech', summary: 'Công cụ tập hợp dữ liệu phát thải và hỗ trợ nhà cung ứng chuẩn bị báo cáo. Đang tìm nhà đầu tư cho vòng Pre-seed.', publicBrief: 'Verda tập trung vào việc thu thập dữ liệu phát thải từ nhà cung ứng và chuẩn bị báo cáo. Pitch deck và báo cáo tài chính riêng chưa được tải lên.' }),
  sampleCase({ id: 'sample-case-medflow', startupId: 'medflow', title: 'MedFlow · Vận hành phòng khám tư', industry: 'Healthtech', summary: 'Phần mềm lịch hẹn và quản lý vận hành cho phòng khám tư. Nhà đầu tư có thể xem thông tin công khai trước khi yêu cầu kết nối.', publicBrief: 'MedFlow hỗ trợ phòng khám tư quản lý lịch hẹn và công việc vận hành. Pitch deck và báo cáo tài chính riêng chưa được tải lên.' }),
];

const withSampleCases = state => ({
  ...state,
  cases: [
    ...state.cases.map(item => {
      const current = item.sample && SAMPLE_CASES.find(sample => sample.id === item.id);
      return current ? { ...item, title: current.title, industry: current.industry, summary: current.summary, publicBrief: current.publicBrief, mentor: { ...item.mentor, result: current.mentor.result } } : item;
    }),
    ...SAMPLE_CASES.filter(sample => !state.cases.some(item => item.id === sample.id)),
  ],
});

export function freshCaseWorkflow() { return { version: 1, cases: [] }; }

export function loadCaseWorkflow(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(CASE_WORKFLOW_KEY);
    if (!raw) return withSampleCases(freshCaseWorkflow());
    const data = JSON.parse(raw);
    return withSampleCases(data?.version === 1 && Array.isArray(data.cases) ? data : freshCaseWorkflow());
  } catch { return withSampleCases(freshCaseWorkflow()); }
}

export function saveCaseWorkflow(state, storage = globalThis.localStorage) {
  try { storage?.setItem(CASE_WORKFLOW_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}

export function caseIsConnected(request) {
  return request?.status === 'approved' && request.payments?.startup === 'simulated' && request.payments?.investor === 'simulated';
}

export function applyCaseAction(previous, actor, action) {
  if (!['startup-demo', 'investor-demo'].includes(actor)) throw new Error('Tài khoản không hợp lệ.');
  const state = structuredClone(previous);
  if (action.type === 'create-case') {
    requireRole(actor, 'startup-demo');
    state.cases.unshift({
      id: makeId(), ownerId: actor,
      title: clean(action.title, 5, 100, 'Tên case'),
      summary: clean(action.summary, 20, 2000, 'Mô tả case'),
      industry: clean(action.industry, 2, 60, 'Lĩnh vực'),
      stage: 'draft', listingPayment: 'not-confirmed',
      mentor: { status: 'pending', result: '' }, requests: [],
      createdAt: stamp(), updatedAt: stamp(),
    });
    return state;
  }
  const item = findCase(state, action.caseId);
  if (action.type === 'submit-case') {
    requireRole(actor, 'startup-demo');
    if (item.stage !== 'draft') throw new Error('Case này đã gửi xử lý.');
    item.listingPayment = 'simulated';
    item.stage = 'mentor';
  } else if (action.type === 'complete-mentor-sample') {
    requireRole(actor, 'startup-demo');
    if (item.stage !== 'mentor' || item.listingPayment !== 'simulated') throw new Error('Cần hoàn tất bước phí đăng case trước.');
    item.mentor = { status: 'sample', result: 'Cần đối chiếu doanh thu, dòng tiền và kế hoạch sử dụng vốn với tài liệu gốc trước khi quyết định đầu tư.' };
    item.stage = 'published';
  } else if (action.type === 'request-connection') {
    requireRole(actor, 'investor-demo');
    if (item.stage !== 'published') throw new Error('Case chưa được công bố.');
    const current = latestRequest(item);
    if (current && ['pending', 'approved'].includes(current.status)) throw new Error('Bạn đã gửi yêu cầu cho case này.');
    item.requests.push({ id: makeId(), investorId: actor, message: clean(action.message, 10, 1000, 'Lời nhắn'), status: 'pending', payments: { startup: 'not-due', investor: 'not-due' }, messages: [], createdAt: stamp(), updatedAt: stamp() });
  } else {
    const request = item.requests.find(entry => entry.id === action.requestId);
    if (!request) throw new Error('Không tìm thấy yêu cầu kết nối.');
    if (action.type === 'decide-connection') {
      requireRole(actor, 'startup-demo');
      if (request.status !== 'pending') throw new Error('Yêu cầu đã được xử lý.');
      if (!['approved', 'rejected'].includes(action.decision)) throw new Error('Quyết định không hợp lệ.');
      request.status = action.decision;
      if (action.decision === 'approved') request.payments = { startup: 'due', investor: 'due' };
    } else if (action.type === 'simulate-connection-payment') {
      if (request.status !== 'approved') throw new Error('Startup cần đồng ý trước khi hai bên thanh toán.');
      const side = actor === 'startup-demo' ? 'startup' : 'investor';
      if (request.payments[side] !== 'due') throw new Error('Khoản phí này không ở trạng thái cần thanh toán.');
      request.payments[side] = 'simulated';
    } else if (action.type === 'send-case-message') {
      if (!caseIsConnected(request)) throw new Error('Chỉ mở trao đổi sau khi cả hai bên hoàn tất phí kết nối.');
      request.messages.push({ id: makeId(), authorId: actor, text: clean(action.text, 1, 5000, 'Tin nhắn'), createdAt: stamp() });
    } else if (action.type === 'revoke-connection') {
      requireRole(actor, 'startup-demo');
      if (request.status !== 'approved') throw new Error('Kết nối chưa được chấp thuận.');
      request.status = 'revoked';
    } else throw new Error('Thao tác case không hợp lệ.');
    request.updatedAt = stamp();
  }
  item.updatedAt = stamp();
  return state;
}
