import React from 'react';
import { ArrowRight, Bot, ChartNoAxesCombined, FolderKanban, MessagesSquare, Rocket } from 'lucide-react';

const tools = [
  { icon: FolderKanban, title: 'Workspace dự án', description: 'Công việc, tài liệu và ghi chú của từng dự án.', href: '#/workspace' },
  { icon: MessagesSquare, title: 'Trò chuyện', description: 'Tạo kênh và giữ các trao đổi theo workspace.', href: '#/conversations' },
  { icon: ChartNoAxesCombined, title: 'Phân tích tài chính', description: 'Đọc số liệu CSV và theo dõi các chỉ báo.', href: '#/analysis' },
  { icon: Rocket, title: 'Startup Marketplace', description: 'Khám phá hồ sơ và cơ hội phù hợp.', href: '#/marketplace' },
];

export function HomePage({ children, onOpenAgent }) {
  return <div className="mx-auto max-w-[1500px]">
    <section className="home-hero relative overflow-hidden rounded-3xl border p-6 sm:p-8 lg:p-10" aria-labelledby="home-title">
      <div className="pointer-events-none absolute -right-20 -top-36 h-96 w-96 rounded-full border border-violet-300/10" aria-hidden="true" />
      <div className="relative flex flex-col justify-between gap-7 xl:flex-row xl:items-end">
        <div className="max-w-2xl">
          <p className="home-eyebrow text-[11px] font-semibold uppercase tracking-[0.18em]">Trang chủ · X Workspace</p>
          <h1 id="home-title" className="home-title mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Không gian làm việc cho startup và nhà đầu tư.</h1>
          <p className="home-description mt-4 max-w-xl text-sm leading-7">X Workspace tập hợp dự án, cuộc trò chuyện và dữ liệu tài chính trong một nơi. Chuẩn bị hồ sơ, theo dõi cơ hội và tiếp tục công việc cùng thông tin tổng quan của bạn ngay bên dưới.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#/workspace" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-500">Vào workspace <ArrowRight size={16} aria-hidden="true" /></a>
            <a href="#/conversations" className="home-secondary-action inline-flex min-h-11 items-center gap-2 rounded-xl border px-5 text-sm font-semibold"><MessagesSquare size={16} aria-hidden="true" />Mở trò chuyện</a>
          </div>
        </div>
        <button type="button" onClick={onOpenAgent} className="home-agent-action inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-xl border px-4 text-sm font-medium xl:self-end"><Bot size={20} aria-hidden="true" />Khám phá AI Agent</button>
      </div>
    </section>
    <nav aria-label="Công cụ trong workspace" className="mb-9 mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tools.map(({ icon: Icon, title, description, href }) => <a key={href} href={href} className="home-tool group flex items-start gap-3 rounded-2xl border p-4 transition">
        <span className="home-tool-icon mt-0.5 rounded-lg p-2"><Icon size={18} aria-hidden="true" /></span>
        <span className="min-w-0"><span className="home-tool-title block text-sm font-semibold">{title}</span><span className="home-tool-description mt-1 block text-xs leading-5">{description}</span></span>
      </a>)}
    </nav>
    {children}
  </div>;
}
