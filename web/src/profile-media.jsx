import { useEffect, useState } from 'react';

const limits = {
  cover: { width: 1200, height: 675, bytes: 200_000 },
  logo: { width: 400, height: 400, bytes: 80_000 },
  productImage: { width: 1200, height: 675, bytes: 200_000 },
  person: { width: 420, height: 420, bytes: 80_000 },
};

export async function imageFromForm(form, field, current = '', kind = field) {
  if (form.get(`${field}Remove`) === 'on') return '';
  const file = form.get(field);
  if (!file || !file.size) return current || '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ nhận ảnh JPG, PNG hoặc WebP.');
  if (file.size > 8_000_000) throw new Error('Ảnh gốc tối đa 8 MB.');
  const limit = limits[kind];
  const bitmap = await createImageBitmap(file);
  try {
    let scale = Math.min(1, limit.width / bitmap.width, limit.height / bitmap.height);
    for (let attempt = 0; attempt < 5; attempt++) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL('image/webp', Math.max(.52, .82 - attempt * .07));
      if (result.startsWith('data:image/webp;base64,') && (result.length - 23) * .75 <= limit.bytes) return result;
      scale *= .78;
    }
  } finally { bitmap.close(); }
  throw new Error('Ảnh quá phức tạp để lưu. Hãy chọn ảnh nhỏ hơn.');
}

export function ImageUploadField({ name, label, current = '', hint = '' }) {
  const [selected, setSelected] = useState('');
  useEffect(() => () => { if (selected) URL.revokeObjectURL(selected); }, [selected]);
  return <div className="block space-y-2 text-sm font-medium text-slate-700">
    <label htmlFor={name}>{label}</label>
    {(selected || current) && <img src={selected || current} alt={`Xem trước: ${label}`} className="h-24 max-w-full rounded-xl border border-slate-200 object-cover" />}
    <input id={name} type="file" name={name} accept="image/jpeg,image/png,image/webp" onChange={event => setSelected(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : '')} className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-indigo-700" />
    {current && <label className="flex items-center gap-2 text-xs font-normal"><input type="checkbox" name={`${name}Remove`} />Gỡ ảnh hiện tại</label>}
    {hint && <span className="block text-xs font-normal text-slate-500">{hint}</span>}
  </div>;
}
