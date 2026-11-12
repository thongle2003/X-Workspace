import React, { useState } from 'react';
import { DEEP_DILIGENCE_FIELDS } from '../diligence.js';
import { capitalAmount } from '../domain.js';
import { TeamRoster } from './TeamRoster.jsx';

const amount = value => new Intl.NumberFormat('vi-VN').format(value || 0);
const publicFieldValues = profile => [profile.summary, profile.traction || profile.customerReferences, profile.market, profile.team || profile.teamRoster?.leader?.name || profile.teamRoster?.coLeader?.name, Number(profile.target) > 0 ? String(profile.target) : ''];
const publicFieldCount = profile => publicFieldValues(profile).filter(value => String(value || '').trim()).length;

function PublicProfileRing({ profile }) {
  const filled = publicFieldCount(profile);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  return <div className="flex shrink-0 items-center gap-3">
    <svg role="img" aria-label={`${filled} trong 5 mục công khai có dữ liệu`} viewBox="0 0 120 120" className="h-[76px] w-[76px]" width="76" height="76">
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
      <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--accent)" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${circumference * filled / 5} ${circumference}`} transform="rotate(-90 60 60)" />
      <text x="60" y="57" textAnchor="middle" fill="var(--text-primary)" fontSize="24" fontWeight="700">{filled}/5</text>
      <text x="60" y="75" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">mục có dữ liệu</text>
    </svg>
  </div>;
}

function MarketEvidence({ profile }) {
  const customers = String(profile.customerReferences || '').split(/\r?\n/).map(value => value.trim()).filter(Boolean);
  return <div className="space-y-2">
    {profile.traction ? <p className="whitespace-pre-wrap">{profile.traction}</p> : !customers.length && <p className="text-slate-400">Startup chưa công bố bằng chứng thị trường.</p>}
    {customers.length ? <div><p className="text-xs font-semibold text-slate-500">Doanh nghiệp tiêu biểu do Startup công bố</p><ul className="mt-1 flex flex-wrap gap-1.5">{customers.map((name,index)=><li key={`${name}-${index}`} className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{name}</li>)}</ul></div> : <p className="text-xs text-slate-500">Chưa công bố tên doanh nghiệp đang sử dụng.</p>}
  </div>;
}

function FundingProgress({ profile }) {
  const target = Number(profile.target);
  const raised = profile.raised == null ? null : Number(profile.raised);
  const hasRaised = raised !== null && Number.isFinite(raised) && raised >= 0;
  const capitalPercent = hasRaised && target > 0 ? Math.min(100, raised / target * 100) : null;
  const capitalPercentLabel = capitalPercent === null ? '' : capitalPercent === 0 ? '0%' : capitalPercent < 0.1 ? `${capitalPercent.toLocaleString('vi-VN',{maximumFractionDigits:4})}%` : capitalPercent < 1 ? `${capitalPercent.toLocaleString('vi-VN',{maximumFractionDigits:2})}%` : `${Math.round(capitalPercent)}%`;
  const current = Number(profile.fundingRoundIndex);
  const total = Number(profile.fundingRoundTotal);
  const hasRoadmap = Number.isInteger(current) && Number.isInteger(total) && current > 0 && total >= current;
  const standardStages = ['Pre-seed', 'Seed', 'Series A', 'Series B'];
  const standardIndex = standardStages.indexOf(profile.stage);
  const timelineCurrent = hasRoadmap ? current : standardIndex + 1;
  const timelineTotal = hasRoadmap ? total : standardIndex >= 0 ? standardStages.length : 0;
  const timelinePoints = timelineTotal <= 5 ? Array.from({length:timelineTotal},(_,index)=>index+1) : [...new Set([1,Math.max(2,timelineCurrent-1),timelineCurrent,Math.min(timelineTotal-1,timelineCurrent+1),timelineTotal])].sort((a,b)=>a-b);
  const uses = String(profile.useOfFunds || '').split(/\r?\n/).map(item => item.trim()).filter(Boolean);

  return <div className="border-l-[3px] border-indigo-500 pl-4">
    <dt className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-600">05 · Tiến độ gọi vốn & sử dụng vốn</dt>
    <dd>
      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500">Giai đoạn huy động vốn</p>
        <p className="mt-1 text-sm font-bold text-slate-900">{profile.stage}{timelineTotal ? ` · ${timelineCurrent}/${timelineTotal}` : ''}</p>
        {timelineTotal > 0 ? <><ol className="mt-3 grid w-full" style={{gridTemplateColumns:`repeat(${timelinePoints.length}, minmax(0, 1fr))`}} aria-label="Timeline các giai đoạn huy động">{timelinePoints.map((step,index)=><li key={step} aria-current={step===timelineCurrent?'step':undefined} className="relative flex min-w-0 flex-col items-center text-center">{index<timelinePoints.length-1&&<span aria-hidden="true" className={`absolute left-1/2 top-[15px] h-0.5 w-full ${step<timelineCurrent?'bg-emerald-500':'bg-slate-200'}`}/>}<span className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${step<=timelineCurrent?'bg-emerald-500 text-white':'bg-slate-200 text-slate-700'} ${step===timelineCurrent?'ring-2 ring-emerald-200':''}`}>{step}</span><span className={`mt-1 min-w-0 px-0.5 text-[10px] leading-4 ${step===timelineCurrent?'font-bold text-emerald-700':'text-slate-600'}`}>{hasRoadmap ? step===timelineCurrent ? profile.stage : `Mốc ${step}` : standardStages[step-1]}</span></li>)}</ol>{!hasRoadmap&&<p className="mt-1 text-[10px] leading-4 text-slate-400">Các giai đoạn phổ biến để tham khảo; Startup chưa công bố lộ trình riêng.</p>}</> : <p className="mt-1 text-xs text-slate-400">Startup chưa công bố giai đoạn huy động</p>}
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold text-slate-500">Vốn huy động / mục tiêu vòng này</p>
        <div className="mt-3 flex items-center gap-4">
          <div role="img" aria-label={hasRaised ? `Biểu đồ tròn: đã huy động ${capitalAmount(raised)} trên ${capitalAmount(target)}, còn lại ${capitalAmount(Math.max(0,target-raised))}` : 'Chưa công bố vốn đã huy động'} className={`grid h-24 w-24 shrink-0 place-items-center rounded-full border ${hasRaised?'border-transparent':'border-dashed border-slate-200 bg-slate-100 text-slate-400'}`} style={hasRaised ? {background:`conic-gradient(var(--funding-raised) ${capitalPercent}%, var(--funding-remaining) 0)`} : undefined}>{!hasRaised&&<span className="text-xl font-bold">?</span>}</div>
          <div className="min-w-0 text-xs leading-5">
            <p className="font-semibold text-slate-700">Mục tiêu <span className="block text-base font-bold tabular-nums text-slate-900">{capitalAmount(target)}</span></p>
            {hasRaised ? <><p className="mt-2 text-slate-600"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{background:'var(--funding-raised)'}}/>Đã huy động: <strong className="tabular-nums text-slate-900">{capitalAmount(raised)}</strong></p><p className="text-slate-600"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{background:'var(--funding-remaining)'}}/>Còn lại: <strong className="tabular-nums text-slate-900">{capitalAmount(Math.max(0,target-raised))}</strong></p><p className="mt-1 font-semibold tabular-nums text-emerald-700">{capitalPercentLabel} mục tiêu</p></> : <p className="mt-2 text-slate-400">Vốn đã huy động: chưa công bố</p>}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold text-slate-500">Dự kiến sử dụng vốn vào</p>
        {uses.length ? <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-slate-700">{uses.map((item,index)=><li key={index} className="break-words">{item}</li>)}</ul> : <p className="mt-1 text-sm text-slate-400">Startup chưa công bố kế hoạch sử dụng vốn</p>}
      </div>
    </dd>
  </div>;
}

export function PublicCaseBasics({ profile }) {
  const details = [
    ['Bằng chứng thị trường', profile.traction],
    ['Thị trường & đối thủ', profile.market],
    ['Đội ngũ', profile.team],
  ];
  return <section aria-labelledby="public-case-basics">
    <div className="flex items-center justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-indigo-600">Case brief</p><h2 id="public-case-basics" className="mt-1 text-lg font-bold text-slate-900">5 thông tin cơ bản · công khai</h2><p className="mt-1 text-xs leading-5 text-slate-500">Xem nhanh trước khi yêu cầu hồ sơ thẩm định.</p></div><PublicProfileRing profile={profile}/></div>
    <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-5"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-600">01 · Vấn đề & giải pháp</p><p className="mt-3 whitespace-pre-wrap text-base font-medium leading-7 text-slate-800">{profile.summary || 'Startup chưa cung cấp'}</p></div>
    <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">{details.map(([label, value], index) => <div key={label} className="border-t border-slate-200 pt-4 sm:border-l-[3px] sm:border-t-0 sm:border-slate-200 sm:pl-4 sm:pt-0"><dt className="text-[11px] font-bold uppercase tracking-[.12em] text-indigo-600">0{index + 2} · {label}</dt><dd className={`mt-2 text-sm leading-6 ${value ? 'text-slate-700' : 'text-slate-400'}`}>{index === 0 ? <MarketEvidence profile={profile}/> : index === 2 ? <TeamRoster roster={profile.teamRoster} fallback={value}/> : <span className="whitespace-pre-wrap">{value || 'Startup chưa cung cấp'}</span>}</dd></div>)}<FundingProgress profile={profile}/></dl>
  </section>;
}

export function PublicCaseVisuals({ currentId, currentIndustry, listings }) {
  const projects = listings.filter(item => item.profile?.industry === currentIndustry && Number.isFinite(Number(item.profile?.target)) && Number(item.profile.target) > 0).map(item => ({
    id: item.workspaceId || item.id,
    name: item.profile.name,
    industry: item.profile.industry,
    stage: item.profile.stage,
    target: Number(item.profile.target),
    filled: publicFieldCount(item.profile),
  })).sort((a, b) => b.target - a.target);
  if (!projects.length) return null;
  if (projects.length === 1) return <aside className="mt-5 rounded-xl border border-dashed border-slate-200 bg-white px-5 py-4 text-sm text-slate-500"><strong className="text-slate-800">Chưa có đối chứng cùng ngành.</strong> Khi Marketplace có thêm startup {currentIndustry}, biểu đồ và bảng so sánh sẽ xuất hiện tại đây.</aside>;
  const maximum = projects[0].target;
  return <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-labelledby="public-case-data-title">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 id="public-case-data-title" className="text-lg font-bold text-slate-900">Mục tiêu gọi vốn · cùng lĩnh vực</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">Chỉ đối chiếu các case {currentIndustry} đang công khai. Đây là số vốn mong muốn huy động, không phải doanh thu.</p>
      <div className="mt-6 space-y-5" role="img" aria-label="Biểu đồ cột so sánh mục tiêu gọi vốn giữa các startup công khai">{projects.map(project => <div key={project.id}>
        <div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className={`min-w-0 truncate font-semibold ${project.id === currentId ? 'text-indigo-700' : 'text-slate-700'}`}>{project.name}{project.id === currentId ? ' · case này' : ''}</span><span className="shrink-0 tabular-nums text-slate-600">{capitalAmount(project.target)}</span></div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${project.id === currentId ? 'bg-indigo-600' : 'bg-slate-300'}`} style={{ width: `${project.target / maximum * 100}%` }} /></div>
      </div>)}</div>
    </div>
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-900">Bảng đối chiếu cùng lĩnh vực</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">Chỉ gồm case {currentIndustry} và thông tin đã công bố trên Marketplace.</p>
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[440px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-500"><th scope="col" className="px-2 py-3 font-semibold">Startup</th><th scope="col" className="px-2 py-3 font-semibold">Lĩnh vực</th><th scope="col" className="px-2 py-3 font-semibold">Giai đoạn</th><th scope="col" className="px-2 py-3 text-right font-semibold">Gọi vốn</th><th scope="col" className="px-2 py-3 text-right font-semibold">Mục có dữ liệu</th></tr></thead><tbody>{projects.map(project => <tr key={project.id} className={`border-b border-slate-100 ${project.id === currentId ? 'bg-indigo-50' : ''}`}><th scope="row" className="px-2 py-3 font-semibold text-slate-800">{project.name}</th><td className="px-2 py-3 text-slate-600">{project.industry}</td><td className="px-2 py-3 text-slate-600">{project.stage}</td><td className="px-2 py-3 text-right tabular-nums text-slate-700">{capitalAmount(project.target)}</td><td className="px-2 py-3 text-right tabular-nums text-slate-700">{project.filled}/5</td></tr>)}</tbody></table></div>
    </div>
  </section>;
}

export function FinancialCharts({ rows }) {
  const recent = rows.slice(-6);
  const latest = rows.at(-1);
  const maxValue = Math.max(1, ...recent.flatMap(row => [row.revenue, row.cogs + row.opex]));
  const totalCosts = latest.cogs + latest.opex;
  const circumference = 2 * Math.PI * 46;
  return <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)]">
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="financial-bars-title">
      <h4 id="financial-bars-title" className="text-sm font-bold text-slate-800">Doanh thu và chi phí theo tháng</h4>
      <p className="mt-1 text-xs text-slate-500">{recent.length} kỳ gần nhất · triệu đồng · dữ liệu từ CSV của Startup</p>
      <div className="mt-3 flex gap-4 text-xs text-slate-600"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-indigo-600"/>Doanh thu</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-teal-500"/>Giá vốn + vận hành</span></div>
      <div className="mt-5 space-y-4" role="img" aria-label="Biểu đồ cột doanh thu và chi phí theo tháng">{recent.map(row => <div key={row.period} className="grid grid-cols-[70px_minmax(0,1fr)_70px] items-center gap-3 text-xs"><span className="tabular-nums text-slate-600">{row.period}</span><div className="space-y-1.5"><div className="h-2.5 rounded-full bg-white"><div className="h-full rounded-full bg-indigo-600" style={{width:`${row.revenue / maxValue * 100}%`}}/></div><div className="h-2.5 rounded-full bg-white"><div className="h-full rounded-full bg-teal-500" style={{width:`${(row.cogs + row.opex) / maxValue * 100}%`}}/></div></div><span className="text-right tabular-nums text-slate-600">{amount(row.revenue)}</span></div>)}</div>
      <p className="mt-4 text-[11px] leading-5 text-slate-500">Số bên phải là doanh thu. Chiều dài cột cho thấy tương quan doanh thu và tổng chi phí từng tháng.</p>
    </section>
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="financial-donut-title">
      <h4 id="financial-donut-title" className="text-sm font-bold text-slate-800">Cơ cấu chi phí · {latest.period}</h4>
      <p className="mt-1 text-xs text-slate-500">Giá vốn và chi phí vận hành, triệu đồng</p>
      {totalCosts > 0 ? <><div className="mt-4 flex justify-center"><svg role="img" aria-label={`Biểu đồ tròn: giá vốn ${amount(latest.cogs)}, chi phí vận hành ${amount(latest.opex)} triệu đồng`} viewBox="0 0 120 120" className="h-36 w-36" width="144" height="144"><circle cx="60" cy="60" r="46" fill="none" stroke="var(--border)" strokeWidth="14"/><circle cx="60" cy="60" r="46" fill="none" stroke="var(--accent)" strokeWidth="14" strokeDasharray={`${circumference * latest.cogs / totalCosts} ${circumference}`} transform="rotate(-90 60 60)"/><circle cx="60" cy="60" r="46" fill="none" stroke="var(--color-gold)" strokeWidth="14" strokeDasharray={`${circumference * latest.opex / totalCosts} ${circumference}`} strokeDashoffset={-circumference * latest.cogs / totalCosts} transform="rotate(-90 60 60)"/><text x="60" y="58" textAnchor="middle" fill="var(--text-primary)" fontSize="17" fontWeight="700">{amount(totalCosts)}</text><text x="60" y="74" textAnchor="middle" fill="var(--text-secondary)" fontSize="9">tổng chi phí</text></svg></div><div className="mt-3 space-y-2 text-xs"><div className="flex justify-between gap-3 text-slate-600"><span>Giá vốn</span><strong className="tabular-nums text-slate-800">{amount(latest.cogs)}</strong></div><div className="flex justify-between gap-3 text-slate-600"><span>Chi phí vận hành</span><strong className="tabular-nums text-slate-800">{amount(latest.opex)}</strong></div></div></> : <p className="mt-5 text-sm text-slate-500">Chưa có chi phí để lập biểu đồ.</p>}
    </section>
  </div>;
}

export function PrivateDiligence({ workspace, owner, onAction, busy }) {
  const [editing, setEditing] = useState('');
  const [draft, setDraft] = useState('');
  const answers = workspace.diligence || {};
  const filled = DEEP_DILIGENCE_FIELDS.filter(field => answers[field.key] || field.key === 'pnlBurn' && workspace.financial).length;
  const groups = [...new Set(DEEP_DILIGENCE_FIELDS.map(field => field.group))];
  async function save(field) {
    const result = await onAction({ type: 'update-diligence', workspaceId: workspace.id, field, value: draft });
    if (result) { setEditing(''); setDraft(''); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="deep-diligence-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="deep-diligence-title" className="text-lg font-bold text-slate-900">Thẩm định sâu · 20 mục</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{owner ? 'Bạn có thể bổ sung câu trả lời và nguồn chứng minh. Nhà đầu tư chỉ thấy phần này sau khi bạn cấp quyền.' : 'Thông tin do Startup cung cấp. Đối chiếu tài liệu gốc trước khi quyết định đầu tư.'}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{filled}/20 mục có dữ liệu</span></div>
    <div className="mt-5 space-y-3">{groups.map(group => <details key={group} className="rounded-xl border border-slate-200" open={group === groups[0]}><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">{group}</summary><div className="divide-y divide-slate-100 border-t border-slate-100 px-4">{DEEP_DILIGENCE_FIELDS.filter(field => field.group === group).map(field => {
      const fallback = field.key === 'pnlBurn' && workspace.financial ? `Đã có ${workspace.financial.name}. Xem số liệu trong tab Hồ sơ tài chính.` : '';
      const value = answers[field.key] || fallback;
      return <div key={field.key} className="py-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="text-sm font-semibold text-slate-800">{field.label}</h4><p className="mt-1 text-xs leading-5 text-slate-500">{field.hint}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-medium ${value ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{value ? 'Có dữ liệu' : 'Chưa cung cấp'}</span></div>{editing === field.key ? <div className="mt-3"><textarea className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-400" rows={4} maxLength={5000} value={draft} onChange={event => setDraft(event.target.value)} aria-label={`Nội dung ${field.label}`} /><div className="mt-2 flex gap-2"><button type="button" disabled={busy} onClick={() => save(field.key)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Lưu mục này</button><button type="button" onClick={() => setEditing('')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600">Hủy</button></div></div> : <><p className={`mt-3 whitespace-pre-wrap text-sm leading-6 ${value ? 'text-slate-700' : 'text-slate-400'}`}>{value || 'Startup chưa cung cấp nội dung cho mục này.'}</p>{owner && <button type="button" onClick={() => { setEditing(field.key); setDraft(answers[field.key] || ''); }} className="mt-2 text-xs font-semibold text-indigo-600">{answers[field.key] ? 'Sửa nội dung' : 'Bổ sung nội dung'}</button>}</>}</div>;
    })}</div></details>)}</div>
  </section>;
}
