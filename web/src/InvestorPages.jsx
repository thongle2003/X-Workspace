import React from 'react';
import { ArrowRight, ChartNoAxesCombined, CircleHelp, FileText, FolderKanban, Handshake, ShieldAlert } from 'lucide-react';
import { money } from '../domain.js';

const card = 'rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm';

function PageTitle({ eyebrow, title, description, children }) {
  return <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[.17em] text-indigo-500">{eyebrow}</p><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p></div>{children}</div>;
}

function ActionLink({ href, children }) {
  return <a href={href} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-600">{children}<ArrowRight size={15} aria-hidden="true" /></a>;
}

function Stat({ label, value, detail }) {
  return <section className={card}><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></section>;
}

export function InvestorDashboard({ state }) {
  const positions = state.portfolio || [];
  const startups = state.startups || [];
  const invested = positions.reduce((sum, position) => sum + position.invested, 0);
  const valued = positions.map(position => {
    const latest = position.updates?.at(-1);
    const valuation = latest?.valuation;
    return { position, value: Number.isFinite(valuation) && valuation > 0 ? valuation * position.ownership / 100 : null };
  });
  const knownValue = valued.reduce((sum, item) => sum + (item.value ?? 0), 0);
  const knownCost = valued.reduce((sum, item) => sum + (item.value === null ? 0 : item.position.invested), 0);
  const valuedCount = valued.filter(item => item.value !== null).length;
  const unrealized = knownValue - knownCost;
  const performance = knownCost > 0 ? unrealized / knownCost * 100 : null;
  const distribution = new Map();
  for (const position of positions) {
    const startup = startups.find(item => item.id === position.startupId || item.id === position.workspaceId);
    const industry = startup?.industry || 'Chưa phân loại';
    distribution.set(industry, (distribution.get(industry) || 0) + position.invested);
  }
  return <div className="mx-auto max-w-[1350px]">
    <PageTitle eyebrow="Dashboard đầu tư" title="Danh mục của bạn, trong một góc nhìn." description="Các số liệu bên dưới được tính từ khoản đầu tư và cập nhật bạn đã ghi nhận."><ActionLink href="#/portfolio">Mở danh mục</ActionLink></PageTitle>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="Tổng vốn đã đầu tư" value={`${money(invested)} triệu ₫`} detail={`${positions.length} khoản đầu tư đã ghi nhận`} />
      <Stat label="Giá trị danh mục hiện tại" value={valuedCount ? `${money(knownValue)} triệu ₫` : 'Chưa có định giá'} detail={`Có định giá cho ${valuedCount}/${positions.length} khoản đầu tư`} />
      <Stat label="Lợi nhuận chưa thực hiện" value={valuedCount ? `${unrealized >= 0 ? '+' : ''}${money(unrealized)} triệu ₫` : 'Chưa đủ dữ liệu'} detail="Chỉ tính các khoản có định giá cập nhật" />
      <Stat label="Lợi nhuận đã thực hiện" value="Chưa ghi nhận" detail="Ứng dụng hiện chưa theo dõi giao dịch thoái vốn" />
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
      <section className={card}><div className="flex items-center gap-2"><ChartNoAxesCombined size={18} className="text-indigo-500" /><h2 className="font-bold text-slate-900">Hiệu quả & phân bổ đầu tư</h2></div><p className="mt-4 text-sm text-slate-500">{performance === null ? 'Chưa có đủ định giá để tính hiệu quả danh mục.' : `Thay đổi ước tính trên ${valuedCount} khoản có định giá: ${performance >= 0 ? '+' : ''}${performance.toFixed(1)}%. Chưa phải lợi nhuận đã thực hiện.`}</p><div className="mt-6 space-y-4">{[...distribution.entries()].map(([industry, amount]) => <div key={industry}><div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="text-slate-600">{industry}</span><strong className="text-slate-800">{money(amount)} triệu ₫</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${invested ? amount / invested * 100 : 0}%` }} /></div></div>)}{!positions.length && <p className="text-sm text-slate-500">Chưa có khoản đầu tư. Mở Marketplace để khám phá startup.</p>}</div></section>
      <section className={card}><div className="flex items-center gap-2"><ShieldAlert size={18} className="text-amber-500" /><h2 className="font-bold text-slate-900">Chỉ báo cần rà soát</h2></div><p className="mt-4 text-sm leading-6 text-slate-500">{positions.length - valuedCount} khoản đầu tư chưa có định giá cập nhật. Đây là tình trạng dữ liệu, chưa phải đánh giá rủi ro kinh doanh.</p><p className="mt-3 text-sm leading-6 text-slate-500">Báo cáo tài chính và các chỉ báo rủi ro nằm trong mục Phân tích tài chính khi có dữ liệu được cấp quyền.</p><div className="mt-5"><ActionLink href="#/analysis">Mở phân tích</ActionLink></div></section>
    </div>
    <div className="mt-5 flex flex-wrap gap-3"><ActionLink href="#/marketplace">Khám phá cơ hội</ActionLink><ActionLink href="#/workspace">Dự án đang theo dõi</ActionLink></div>
  </div>;
}

export function InvestorSectionPage({ section, state }) {
  const workspaces = (state.workspaces || []).filter(item => !item.role || item.role === 'investor');
  const reports = (state.reports || []).filter(item => !item.role || item.role === 'investor');
  const content = {
    'due-diligence': { icon: ShieldAlert, title: 'Thẩm định (Due Diligence)', description: 'Theo dõi hồ sơ đang được cấp quyền và mở phân tích tài chính khi cần.', action: '#/analysis', actionLabel: 'Phân tích tài chính' },
    collaboration: { icon: Handshake, title: 'Hợp tác & Giao dịch', description: 'Tiếp tục trao đổi trong workspace. Luồng giao dịch trực tiếp chưa được triển khai trong ứng dụng.', action: '#/conversations', actionLabel: 'Mở trò chuyện' },
    documents: { icon: FileText, title: 'Tài liệu & Báo cáo', description: 'Mở tài liệu trong workspace và các báo cáo phân tích đã có quyền xem.', action: '#/analysis', actionLabel: 'Mở báo cáo' },
  }[section];
  if (!content) return null;
  const Icon = content.icon;
  return <div className="mx-auto max-w-[1100px]"><PageTitle eyebrow="Workspace · Investor" title={content.title} description={content.description}><ActionLink href={content.action}>{content.actionLabel}</ActionLink></PageTitle><div className="grid gap-5 md:grid-cols-2"><section className={card}><div className="flex items-center gap-2"><FolderKanban size={19} className="text-indigo-500" /><h2 className="font-bold">Workspace có quyền truy cập</h2></div><div className="mt-4 space-y-3">{workspaces.length ? workspaces.map(item => <a key={item.id} href={`#/workspace/${item.id}`} className="block rounded-xl border border-slate-200 p-3.5 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600">{item.profile?.name || item.name}</a>) : <p className="text-sm leading-6 text-slate-500">Chưa có workspace được cấp quyền.</p>}</div></section><section className={card}><div className="flex items-center gap-2"><Icon size={19} className="text-indigo-500" /><h2 className="font-bold">{section === 'documents' ? 'Báo cáo hiện có' : 'Bước tiếp theo'}</h2></div><p className="mt-4 text-sm leading-6 text-slate-500">{section === 'documents' ? `${reports.length} báo cáo hiện có. Mở mục Phân tích tài chính để xem nội dung và nguồn dữ liệu.` : section === 'due-diligence' ? 'Xem hồ sơ trong workspace, đối chiếu tài liệu, rồi mở phân tích tài chính. Chưa có bảng tiến độ thẩm định riêng.' : 'Trao đổi trong workspace hoặc kênh trò chuyện. Chức năng ký kết và chuyển tiền chưa có trong ứng dụng.'}</p><div className="mt-5"><ActionLink href={content.action}>{content.actionLabel}</ActionLink></div></section></div></div>;
}

export function InvestorSupportPage() {
  return <div className="mx-auto max-w-[800px]"><PageTitle eyebrow="Hỗ trợ" title="Trợ giúp & Hỗ trợ" description="Các thông tin có sẵn để bạn tiếp tục công việc trong ứng dụng." /><section className={card}><div className="flex items-center gap-2"><CircleHelp size={20} className="text-indigo-500" /><h2 className="font-bold">Bạn cần hỗ trợ?</h2></div><p className="mt-4 text-sm leading-6 text-slate-500">Kênh hỗ trợ trực tiếp chưa được cấu hình. Bạn có thể xem phạm vi dữ liệu và quyền truy cập, hoặc mở AI Chat để tìm lại cuộc trò chuyện của mình.</p><div className="mt-5 flex flex-wrap gap-3"><ActionLink href="#/privacy">Dữ liệu & quyền truy cập</ActionLink><ActionLink href="#/conversations">Mở AI Chat</ActionLink></div></section></div>;
}
