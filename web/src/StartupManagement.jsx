import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Check, FolderOpen, Pencil, Plus, X } from 'lucide-react';

const inputClass = 'mt-2 block w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50';
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition';
const textFields = [
  { name: 'name', label: 'Tên startup', max: 120 },
  { name: 'tagline', label: 'Giới thiệu ngắn', max: 240 },
  { name: 'industry', label: 'Lĩnh vực', max: 80 },
  { name: 'stage', label: 'Giai đoạn', max: 60 },
  { name: 'location', label: 'Địa điểm', max: 120 },
];
const numberFields = [
  { name: 'revenue', label: 'Doanh thu / tháng (triệu ₫)', min: 0, step: 'any' },
  { name: 'growth', label: 'Tăng trưởng tháng (%)', step: 'any' },
  { name: 'runway', label: 'Runway (tháng)', min: 0, step: 'any' },
  { name: 'target', label: 'Mục tiêu gọi vốn (triệu ₫)', min: 0.01, step: 'any' },
  { name: 'raised', label: 'Đã gọi vốn (triệu ₫)', min: 0, step: 'any' },
  { name: 'docs', label: 'Hồ sơ đã hoàn thành', min: 0, step: 1 },
  { name: 'totalDocs', label: 'Tổng số mục hồ sơ', min: 1, step: 1 },
];

export function StartupManagement({ state, startup, updateState, setNotice }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setEditing(false); setError(''); }, [startup?.id, state.role]);
  if (state.role !== 'founder' || !startup) return null;
  const workspaces = state.workspaces.filter(item => item.startupId === startup.id && item.role === state.role);

  function save(event) {
    event.preventDefault();
    if (state.role !== 'founder') return;
    const form = new FormData(event.currentTarget);
    try {
      const values = {};
      for (const field of [...textFields, { name: 'description', label: 'Mô tả startup', max: 2000 }]) {
        const value = String(form.get(field.name) || '').trim();
        if (!value || value.length > field.max) throw new Error(`${field.label} cần có nội dung và không quá ${field.max} ký tự.`);
        values[field.name] = value;
      }
      for (const field of numberFields) {
        const raw = String(form.get(field.name) ?? '').trim();
        const value = Number(raw);
        if (!raw || !Number.isFinite(value) || Math.abs(value) > 1e12) throw new Error(`${field.label} phải là số hợp lệ, không vượt quá 1.000 tỷ.`);
        if (field.min !== undefined && value < field.min) throw new Error(`${field.label} phải từ ${field.min} trở lên.`);
        if (field.step === 1 && !Number.isInteger(value)) throw new Error(`${field.label} phải là số nguyên.`);
        values[field.name] = value;
      }
      if (values.docs > values.totalDocs) throw new Error('Hồ sơ đã hoàn thành không được lớn hơn tổng số mục hồ sơ.');
      const next = updateState(current => {
        if (current.role !== 'founder') throw new Error('Chỉ tài khoản Startup được chỉnh sửa hồ sơ.');
        if (!current.startups.some(item => item.id === startup.id)) throw new Error('Không tìm thấy startup để cập nhật.');
        return { ...current, startups: current.startups.map(item => item.id === startup.id ? { ...item, ...values } : item) };
      });
      if (!next) { setError('Chưa lưu được hồ sơ. Vui lòng kiểm tra lại thông tin và thử lại.'); return; }
      setError(''); setEditing(false); setNotice?.('Đã lưu hồ sơ startup.');
    } catch (reason) { setError(reason.message); }
  }

  return <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby={`startup-management-${startup.id}`}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 id={`startup-management-${startup.id}`} className="text-base font-bold text-slate-900">Quản lý startup</h2><p className="mt-1.5 text-xs leading-6 text-slate-500">Cập nhật hồ sơ {startup.name} và tiếp tục công việc trong workspace của startup.</p></div><button type="button" aria-expanded={editing} aria-controls={`startup-edit-${startup.id}`} onClick={() => { setEditing(value => !value); setError(''); }} className={`${buttonClass} border border-slate-200 text-slate-700 hover:bg-slate-50`}><Pencil size={15} />Chỉnh sửa startup</button></div>
    {editing && <form id={`startup-edit-${startup.id}`} onSubmit={save} noValidate className="mt-6 border-t border-slate-100 pt-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">Thông tin hồ sơ</h3>
      <div className="grid gap-4 sm:grid-cols-2">{textFields.map(field => <label key={field.name} className="block min-w-0 text-xs font-medium text-slate-700">{field.label}<input className={inputClass} name={field.name} defaultValue={startup[field.name] ?? ''} maxLength={field.max} required /></label>)}<label className="block min-w-0 text-xs font-medium text-slate-700 sm:col-span-2">Mô tả startup<textarea className={inputClass} name="description" defaultValue={startup.description || ''} rows={4} maxLength={2000} required /></label></div>
      <h3 className="mb-4 mt-7 text-sm font-semibold text-slate-800">Số liệu và tiến độ hồ sơ</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{numberFields.map(field => <label key={field.name} className="block min-w-0 text-xs font-medium text-slate-700">{field.label}<input className={inputClass} type="number" name={field.name} defaultValue={startup[field.name] ?? 0} min={field.min} max={1e12} step={field.step} required /></label>)}</div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-xs leading-6 text-rose-700">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-2"><button type="submit" className={`${buttonClass} bg-indigo-600 text-white hover:bg-indigo-700`}><Check size={16} />Lưu hồ sơ startup</button><button type="button" onClick={() => { setEditing(false); setError(''); }} className={`${buttonClass} border border-slate-200 text-slate-600 hover:bg-slate-50`}><X size={15} />Hủy</button></div>
    </form>}
    <div className="mt-6 border-t border-slate-100 pt-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><FolderOpen size={16} className="text-indigo-500" />Workspace của startup <span className="font-normal text-slate-400">({workspaces.length})</span></h3><a href={`#/workspace/new?startupId=${encodeURIComponent(startup.id)}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"><Plus size={14} />Tạo workspace cho startup này</a></div>
      {workspaces.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{workspaces.map(item => <a key={item.id} href={`#/workspace/${item.id}`} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-200"><div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold text-slate-800">{item.name}</p>{item.goal && <p className="mt-1.5 break-words text-xs leading-5 text-slate-500">{item.goal}</p>}</div><ArrowUpRight size={15} className="shrink-0 text-slate-400" /></a>)}</div> : <p className="mt-3 text-xs leading-6 text-slate-500">Chưa có workspace cho startup này.</p>}
    </div>
    <p className="mt-5 text-[11px] leading-5 text-slate-400">Tài khoản Startup quản lý các hồ sơ startup. Thay đổi lưu trên thiết bị hiện tại.</p>
  </section>;
}
