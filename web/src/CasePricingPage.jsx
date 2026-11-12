import React from 'react';
import { AI_PITCHDECK_REVIEW_FEE_VND, CASE_CONNECTION_SHARE_VND, CASE_CONNECTION_TOTAL_VND, STARTUP_LISTING_FEE_VND } from './caseWorkflow.js';

const money = value => new Intl.NumberFormat('vi-VN').format(value) + 'đ';

export function CasePricingPage({ showCaseLink = true }) {
  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[.18em] text-indigo-600">BẢNG GIÁ STARTUP</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Startup trả theo hồ sơ</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">Phí niêm yết hồ sơ, dịch vụ AI đánh giá pitch deck và phí kết nối được tách riêng. Thanh toán chưa mở; bản dùng thử không thu tiền.</p></header>
    <div className="grid gap-5 md:grid-cols-3">
      <section className="rounded-2xl border border-indigo-200 bg-white p-6"><span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Niêm yết một hồ sơ Startup</span><h2 className="mt-3 text-2xl font-bold text-slate-900">{money(STARTUP_LISTING_FEE_VND)} <span className="text-sm font-normal text-slate-500">/ 12 tháng</span></h2><p className="mt-3 text-sm leading-6 text-slate-600">Bao gồm hồ sơ công khai và tải pitch deck vào workspace riêng. Kỳ 12 tháng sẽ tính từ khi thanh toán được mở và xác nhận; hiện chưa thu phí.</p>{showCaseLink ? <a href="#/cases" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Chuẩn bị hồ sơ</a> : <p className="mt-5 text-sm text-slate-500">Bạn có thể chuẩn bị hồ sơ trong Workspace dự án.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">AI đánh giá pitch deck</span><h2 className="mt-3 text-2xl font-bold text-slate-900">{money(AI_PITCHDECK_REVIEW_FEE_VND)} <span className="text-sm font-normal text-slate-500">/ lần</span></h2><p className="mt-3 text-sm leading-6 text-slate-600">Dịch vụ đang chuẩn bị; ứng dụng chưa nhận thanh toán hoặc tạo báo cáo đánh giá pitch deck.</p></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6"><span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Kết nối một case</span><h2 className="mt-3 text-2xl font-bold text-slate-900">{money(CASE_CONNECTION_TOTAL_VND)} tổng cộng</h2><p className="mt-3 text-sm leading-6 text-slate-600">Sau khi Startup đồng ý kết nối, Startup và investor mỗi bên trả {money(CASE_CONNECTION_SHARE_VND)}. Trao đổi chỉ mở khi cả hai bên hoàn tất phần của mình.</p></section>
    </div>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-900"><strong>Hạn mức AI trong ứng dụng không phải phí token theo lượt.</strong> Mức 200.000đ ở trên chỉ dành cho dịch vụ đánh giá pitch deck khi tính năng được mở. Chưa có khoản thanh toán nào được thực hiện trong bản dùng thử.</section>
  </div>;
}
