import { useState } from 'react';

export function PrivateDocuments({ workspace, owner, busy, action, api }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [opening, setOpening] = useState('');
  async function upload() {
    if (!file) return;
    if (file.size > 1_500_000 || !/\.(pdf|xlsx)$/i.test(file.name)) { setError('Chỉ nhận PDF hoặc Excel XLSX tối đa 1,5 MB.'); return; }
    try {
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Không đọc được tài liệu.'));
        reader.readAsDataURL(file);
      });
      const mimeType = /\.pdf$/i.test(file.name) ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const encoded = `data:${mimeType};base64,${String(data).split(',')[1] || ''}`;
      const result = await action({ type:'add-attachment', workspaceId:workspace.id, name:file.name, data:encoded });
      if (result) { setFile(null); setError(''); }
    } catch (reason) { setError(reason.message); }
  }
  async function download(item) {
    try {
      setOpening(item.id);setError('');
      const result = await api(`/api/workflow/workspaces/${encodeURIComponent(workspace.id)}/attachments/${encodeURIComponent(item.id)}`);
      const bytes = Uint8Array.from(atob(result.data.split(',')[1]), character => character.charCodeAt(0));
      const type = /\.xlsx$/i.test(result.name) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf';
      const url = URL.createObjectURL(new Blob([bytes], {type}));
      const link = document.createElement('a');link.href=url;link.download=result.name;link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(reason.message); } finally { setOpening(''); }
  }
  const documents = workspace.attachments || [];
  return <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <h3 className="font-bold text-slate-900">Tài liệu thẩm định riêng</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">Mô hình tài chính Excel, pitch deck và bằng chứng hỗ trợ. Chỉ Startup và Investor được cấp quyền xem được.</p>
    {owner && <p className="mt-3 text-sm text-slate-600">Tạo mô hình tài chính bằng <a className="font-semibold text-indigo-600 underline" href="/startup-financial-model-template.xlsx" download>mẫu Excel trống</a>, hoặc tải lên file XLSX do bạn tự lập. Số liệu chỉ được công bố theo quyền bạn cấp.</p>}
    {owner && <div className="mt-5 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-medium text-slate-700">Tải PDF hoặc XLSX (tối đa 1,5 MB mỗi tệp)<input key={documents.length} type="file" accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"/></label><button type="button" onClick={upload} disabled={!file || busy || documents.length >= 3} className="min-h-10 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Lưu tài liệu</button></div>}
    {owner && <p className="mt-2 text-xs text-slate-500">Tối đa 3 tài liệu. Tài liệu không xuất hiện trên Marketplace và không tự gửi đến AI.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
    <ul className="mt-5 divide-y divide-slate-200 border-t border-slate-200">{documents.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="min-w-0 break-all text-sm text-slate-700">{item.name}</span><div className="flex gap-3"><button type="button" disabled={opening===item.id} onClick={() => download(item)} className="text-sm font-semibold text-indigo-600 disabled:opacity-50">Tải xuống</button>{owner && <button type="button" disabled={busy} onClick={() => action({type:'remove-attachment',workspaceId:workspace.id,documentId:item.id})} className="text-sm font-semibold text-rose-700 disabled:opacity-50">Xóa</button>}</div></li>)}</ul>
    {!documents.length && <p className="mt-5 text-sm text-slate-500">Chưa có tài liệu riêng.</p>}
  </section>;
}
