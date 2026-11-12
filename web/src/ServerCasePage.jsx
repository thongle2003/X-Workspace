import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, FilePlus2, LockKeyhole } from 'lucide-react';
import { useWorkflow } from './InvestmentFlow.jsx';
import { STARTUP_LISTING_FEE_VND } from './caseWorkflow.js';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 sm:p-6';
const field = 'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
const secondary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const stageName = {draft:'Bản nháp',awaiting_payment:'Chờ mở thanh toán'};

function CaseSteps({item}) {
  const steps = ['Chuẩn bị case','Chờ mở thanh toán','Xác nhận phí','Công bố cho Investor'];
  return <ol className="grid gap-2 sm:grid-cols-4" aria-label="Tiến độ đăng case">{steps.map((label,index)=><li key={label} className={`rounded-xl border p-3 text-xs leading-5 ${index===0?'border-indigo-200 bg-indigo-50 text-indigo-900':index===1&&item.stage!=='draft'?'border-amber-200 bg-amber-50 text-amber-900':'border-slate-200 bg-slate-50 text-slate-500'}`}><span className="block font-bold">{index+1}. {label}</span>{index===0&&<span>{item.stage==='draft'?'Đang soạn':'Đã gửi'}</span>}{index===1&&item.stage!=='draft'&&<span>Đang chờ</span>}</li>)}</ol>;
}

function CaseDetail({item}) {
  const {action,busy,error,clearError,snapshot}=useWorkflow();
  const [title,setTitle]=useState(item.title),[summary,setSummary]=useState(item.summary);
  const workspace=snapshot.workspaces.find(project=>project.id===item.workspaceId);
  const update=async event=>{event.preventDefault();await action({type:'update-case',caseId:item.id,title,summary});};
  return <div className="mx-auto max-w-5xl space-y-5">
    <a href="#/cases" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600"><ArrowLeft size={16}/>Tất cả case</a>
    <header className={card}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">{item.industry} · {workspace?.profile.name||'Startup'}</p><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">{stageName[item.stage]}</span></div><h1 className="mt-3 text-2xl font-bold text-slate-900">{item.title}</h1><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{item.summary}</p><div className="mt-5"><CaseSteps item={item}/></div></header>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error} <button className="ml-2 underline" onClick={clearError}>Đóng</button></p>}
    {item.stage==='draft'?<section className={card}><h2 className="font-bold text-slate-900">Chuẩn bị case</h2><p className="mt-2 text-sm leading-6 text-slate-600">Bản nháp chỉ Startup thấy. Bổ sung hồ sơ và pitch deck trong Workspace dự án trước khi gửi case.</p><form className="mt-5 space-y-4" onSubmit={update}><label className="block text-sm font-medium text-slate-700">Tên case<input className={field} value={title} onChange={event=>setTitle(event.target.value)} minLength={5} maxLength={100} required/></label><label className="block text-sm font-medium text-slate-700">Mô tả case<textarea className={field} value={summary} onChange={event=>setSummary(event.target.value)} minLength={20} maxLength={2000} rows={4} required/></label><button className={secondary} disabled={busy} type="submit">Lưu bản nháp</button></form><div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5"><button className={primary} disabled={busy} onClick={()=>action({type:'submit-case',caseId:item.id})}>Gửi vào quy trình <ArrowRight size={16}/></button><a className={secondary} href={`#/workspace/${item.workspaceId}`}>Mở hồ sơ startup</a></div></section>:<section className={card}><h2 className="flex items-center gap-2 font-bold text-slate-900"><LockKeyhole size={18}/>Đang chờ mở thanh toán</h2><p className="mt-3 text-sm leading-6 text-slate-600">Phí niêm yết hồ sơ Startup là {new Intl.NumberFormat('vi-VN').format(STARTUP_LISTING_FEE_VND)}đ cho 12 tháng. Cổng thanh toán chưa mở, chưa tạo yêu cầu thu tiền và chưa công bố case cho Investor.</p><p className="mt-2 text-sm leading-6 text-slate-600">Khi thanh toán được tích hợp, máy chủ phải xác nhận giao dịch trước khi case chuyển sang bước công bố.</p><button className={`${secondary} mt-5`} disabled={busy} onClick={()=>action({type:'withdraw-case',caseId:item.id})}>Rút về bản nháp để sửa</button></section>}
  </div>;
}

const clampScore=value=>Math.max(0,Math.min(100,Math.round(value||0)));
function caseMetrics(item,profile={}){
  const completeness=['industry','stage','location','summary','market','team','target','useOfFunds'].filter(key=>profile[key]!==undefined&&profile[key]!==null&&String(profile[key]).trim()!==''&&Number(profile[key])!==0).length;
  const traction=String(profile.traction||''),references=String(profile.customerReferences||'');
  const evidence=(traction?40:0)+(references?40:0)+(/\d/.test(traction)?20:0);
  const allocations=(item.useOfFunds||profile.useOfFunds||'').match(/\d+(?:\.\d+)?\s*%/g)||[];
  const allocationTotal=allocations.reduce((sum,line)=>sum+Number.parseFloat(line),0);
  const plan=(allocations.length?Math.min(60,allocations.length*15):0)+(allocations.length&&Math.abs(allocationTotal-100)<0.01?40:0);
  const target=Number(item.target)||0,raised=Number(item.raised)||0;
  return [
    {key:'profile',label:'Hồ sơ công khai',value:clampScore(completeness/8*100),color:'#6366f1',detail:`Đã điền ${completeness}/8 trường thông tin công khai.`},
    {key:'evidence',label:'Bằng chứng thị trường',value:clampScore(evidence),color:'#10b981',detail:`${traction?'Có mô tả traction':'Chưa có mô tả traction'} · ${references?'Có tham chiếu khách hàng':'Chưa có tham chiếu khách hàng'}.`},
    {key:'progress',label:'Tiến độ gọi vốn',value:clampScore(target?raised/target*100:0),color:'#f59e0b',detail:target?`Đã huy động ${raised.toLocaleString('vi-VN')} / ${target.toLocaleString('vi-VN')} triệu đồng mục tiêu.`:'Chưa công bố mục tiêu vòng gọi vốn.'},
    {key:'plan',label:'Kế hoạch sử dụng vốn',value:clampScore(plan),color:'#f43f5e',detail:allocations.length?`${allocations.length} hạng mục, tổng phân bổ ${allocationTotal}%.`:'Chưa công bố các hạng mục sử dụng vốn.'},
  ];
}
function scoreTone(score){return score>=80?{label:'Rõ thông tin',color:'#059669',soft:'#d1fae5'}:score>=60?{label:'Khá đầy đủ',color:'#2563eb',soft:'#dbeafe'}:score>=40?{label:'Cần bổ sung',color:'#d97706',soft:'#fef3c7'}:{label:'Thiếu dữ liệu',color:'#dc2626',soft:'#fee2e2'};}
function Gauge({metric,onShowTooltip,onMoveTooltip,onHideTooltip}){
  const circumference=Math.PI*48,filled=circumference*metric.value/100;
  const detail=`${metric.value}% · ${metric.detail}`;
  return <div className="min-w-0 text-center"><div role="img" tabIndex={0} aria-label={`${metric.label}: ${detail}`} onMouseEnter={event=>onShowTooltip(event,metric.label,detail)} onMouseMove={onMoveTooltip} onMouseLeave={onHideTooltip} onFocus={event=>onShowTooltip(event,metric.label,detail)} onBlur={onHideTooltip} className="group rounded-xl px-1 py-2 outline-none transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-50 focus:ring-2 focus:ring-indigo-300"><svg viewBox="0 0 120 76" className="mx-auto block w-full max-w-[116px]" aria-hidden="true"><path d="M12 66 A48 48 0 0 1 108 66" fill="none" stroke="#e5e7eb" strokeWidth="10"/><path d="M12 66 A48 48 0 0 1 108 66" fill="none" stroke={metric.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${filled} ${circumference}`} style={{transition:'stroke-dasharray 500ms cubic-bezier(.2,.8,.2,1)'}}/><text x="60" y="56" textAnchor="middle" fontSize="19" fontWeight="700" fill="#111827">{metric.value}%</text></svg><span className="mt-1 block text-xs font-medium leading-4 text-slate-600">{metric.label}</span></div></div>;
}
function TeamTooltip({tooltip}){
  const roster=tooltip.team||{},leaders=[['Leader',roster.leader],['Co-leader',roster.coLeader]].filter(([,person])=>person?.name),members=(roster.members||[]).filter(person=>person?.name);
  const personCard=(person,role,isLead=false)=><div key={`${role}-${person.name}`} className={`min-w-0 rounded-xl border p-2.5 ${isLead?'border-violet-200 bg-violet-50/80':'border-slate-200 bg-white'}`}>{person.photo&&<img src={person.photo} alt="" className="float-left mr-2 h-9 w-9 rounded-full object-cover"/>}<span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${isLead?'bg-violet-100 text-violet-700':'bg-slate-100 text-slate-600'}`}>{role}</span><strong className="mt-1.5 block truncate text-xs text-slate-900">{person.name}</strong>{person.title&&<span className="mt-0.5 block truncate text-[10px] font-medium text-violet-700">{person.title}</span>}{person.bio&&<p className="mt-1 text-[10px] leading-4 text-slate-500" style={{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{person.bio}</p>}</div>;
  return <div className="w-96 max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-violet-200 bg-white/95 p-3.5 text-slate-700 shadow-xl shadow-violet-900/10 backdrop-blur-sm" style={{maxHeight:'min(70vh,420px)'}}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-violet-600">Đội ngũ công khai</p><h3 className="mt-0.5 truncate text-sm font-bold text-slate-900">{tooltip.title}</h3></div><span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-700">{leaders.length} phụ trách · {members.length} thành viên</span></div>{leaders.length>0?<><div className="mt-3 grid grid-cols-2 gap-2">{leaders.map(([role,person])=>personCard(person,role,true))}</div><div className="mx-auto h-4 w-px bg-violet-300"/><div className="mx-5 border-t border-violet-200"/></>:!members.length&&tooltip.detail?<p className="mt-3 whitespace-pre-wrap rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{tooltip.detail}</p>:<p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Chưa công bố người phụ trách.</p>}{members.length>0?<><p className="mb-2 mt-2 text-[10px] font-semibold uppercase tracking-[.12em] text-slate-500">Thành viên chủ chốt</p><div className="grid grid-cols-2 gap-2">{members.slice(0,8).map(person=>personCard(person,person.title||'Thành viên'))}</div>{members.length>8&&<p className="mt-2 text-[10px] text-slate-500">Còn {members.length-8} thành viên khác.</p>}</>:leaders.length>0&&<p className="mt-2 text-[11px] text-slate-500">Chưa công bố thêm thành viên.</p>}</div>;
}
function InvestorLeaderboard({snapshot}){
  const listings=snapshot.publicCases||[];
  const ranked=listings.map(item=>{const profile=snapshot.marketplace.find(project=>project.id===item.workspaceId)?.profile||{};const metrics=caseMetrics(item,profile);return {...item,profile,metrics,score:Math.round(metrics.reduce((sum,metric)=>sum+metric.value,0)/metrics.length)};}).sort((a,b)=>b.score-a.score||a.workspaceName.localeCompare(b.workspaceName,'vi'));
  const [sort,setSort]=useState({key:'score',direction:-1});
  const [tooltip,setTooltip]=useState(null);
  const tooltipRef=useRef(null),hideTimerRef=useRef(null),pointerRef=useRef(null);
  const toggleSort=key=>setSort(current=>current.key===key?{key,direction:current.direction*-1}:{key,direction:-1});
  const showTooltip=(event,title,detail,team=null)=>{
    const rect=event.currentTarget.getBoundingClientRect();
    const pointerX=event.clientX||rect.left+rect.width/2,pointerY=event.clientY||rect.top+rect.height/2;
    const tooltipWidth=team?Math.min(384,window.innerWidth-24):224,tooltipHeight=team?Math.min(360,window.innerHeight-24):76;
    const rightSide=rect.right+12,leftSide=rect.left-tooltipWidth-12;
    const teamLeft=rightSide+tooltipWidth<=window.innerWidth-12?rightSide:leftSide>=12?leftSide:rect.left;
    const left=team?Math.max(12,Math.min(teamLeft,window.innerWidth-tooltipWidth-12)):Math.max(12,Math.min(pointerX+14,window.innerWidth-tooltipWidth-12));
    const preferredTop=team?rect.top:(pointerY>window.innerHeight-tooltipHeight-24?pointerY-tooltipHeight-14:pointerY+14);
    const top=Math.max(12,Math.min(preferredTop,window.innerHeight-tooltipHeight-12));
    setTooltip({title,detail,team,left,top,anchorRect:team?{left:rect.left,top:rect.top,right:rect.right,bottom:rect.bottom}:null});
  };
  const hideTooltip=()=>{
    if(hideTimerRef.current)clearTimeout(hideTimerRef.current);
    hideTimerRef.current=null;
    setTooltip(null);
  };
  useEffect(()=>{
    if(!tooltip?.team)return;
    const distanceToRect=(x,y,rect)=>{
      if(!rect)return Infinity;
      const dx=Math.max(rect.left-x,0,x-rect.right),dy=Math.max(rect.top-y,0,y-rect.bottom);
      return Math.hypot(dx,dy);
    };
    const trackPointer=event=>{
      const previous=pointerRef.current;
      pointerRef.current={x:event.clientX,y:event.clientY};
      const popup=tooltipRef.current?.getBoundingClientRect();
      const nearest=Math.min(distanceToRect(event.clientX,event.clientY,popup),distanceToRect(event.clientX,event.clientY,tooltip.anchorRect));
      const dx=previous?event.clientX-previous.x:0,dy=previous?event.clientY-previous.y:0;
      const targetX=popup?popup.left+popup.width/2:event.clientX,targetY=popup?popup.top+popup.height/2:event.clientY;
      const towardPopup=previous&&(dx*(targetX-event.clientX)+dy*(targetY-event.clientY)>0);
      if(nearest<=56||(towardPopup&&nearest<=128)){
        if(hideTimerRef.current)clearTimeout(hideTimerRef.current);
        hideTimerRef.current=null;
      }else if(!hideTimerRef.current){
        hideTimerRef.current=setTimeout(()=>{hideTimerRef.current=null;setTooltip(current=>current?.team?null:current);},140);
      }
    };
    window.addEventListener('pointermove',trackPointer);
    return ()=>{
      window.removeEventListener('pointermove',trackPointer);
      if(hideTimerRef.current)clearTimeout(hideTimerRef.current);
      hideTimerRef.current=null;
    };
  },[tooltip?.team,tooltip?.anchorRect]);
  const moveTooltip=event=>setTooltip(current=>{
    if(!current||current.team)return current;
    const tooltipWidth=224,tooltipHeight=76;
    const left=Math.max(12,Math.min(event.clientX+14,window.innerWidth-tooltipWidth-12));
    const preferredTop=event.clientY>window.innerHeight-tooltipHeight-24?event.clientY-tooltipHeight-14:event.clientY+14;
    const top=Math.max(12,Math.min(preferredTop,window.innerHeight-tooltipHeight-12));
    return {...current,left,top};
  });
  const sorted=[...ranked].sort((a,b)=>{
    const value=item=>item.metrics.find(metric=>metric.key===sort.key)?.value;
    const first=sort.key==='score'?a.score:value(a),second=sort.key==='score'?b.score:value(b);
    return sort.direction*(first-second)||b.score-a.score||a.workspaceName.localeCompare(b.workspaceName,'vi');
  });
  const metricHeaders=ranked[0]?.metrics||[];
  if(!ranked.length)return <div className="mx-auto max-w-5xl space-y-5"><header><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">CASE & KẾT NỐI</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Xếp hạng</h1></header><section className={card}><p className="text-sm text-slate-600">Chưa có case được công bố.</p><a className={`${primary} mt-4`} href="#/marketplace">Mở Marketplace <ArrowRight size={16}/></a></section></div>;
  return <div className="mx-auto max-w-7xl space-y-5"><header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-indigo-50/70 p-5 shadow-sm sm:p-6"><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">CASE & KẾT NỐI</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Xếp hạng</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Rê chuột lên đồng hồ để xem chi tiết ngay. Chọn tiêu đề chỉ số để sắp xếp bảng.</p></header><section className={`${card} !p-0 overflow-hidden shadow-md shadow-slate-200/70`}><div className="overflow-x-auto"><div className="min-w-[1080px]"><div className="grid grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(120px,0.7fr))_150px] items-end gap-2 border-b border-slate-200 bg-slate-50/90 px-5 py-3 text-center text-xs font-semibold text-slate-500"><div className="text-left">Startup / case</div>{metricHeaders.map(metric=><div key={metric.key} className="px-1"><button type="button" onClick={()=>toggleSort(metric.key)} aria-pressed={sort.key===metric.key} className={`rounded-lg px-2 py-1.5 transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${sort.key===metric.key?'bg-indigo-50 text-indigo-700':''}`}>{metric.label}{sort.key===metric.key&&<span className="ml-1" aria-hidden="true">{sort.direction===-1?'↓':'↑'}</span>}</button></div>)}<button type="button" onClick={()=>toggleSort('score')} aria-pressed={sort.key==='score'} className={`justify-self-center rounded-lg px-2 py-1.5 transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${sort.key==='score'?'bg-indigo-50 text-indigo-700':''}`}>Điểm / 100{sort.key==='score'&&<span className="ml-1" aria-hidden="true">{sort.direction===-1?'↓':'↑'}</span>}</button></div><ol className="space-y-2.5 bg-slate-50/60 p-3">{sorted.map((item,index)=>{const tone=scoreTone(item.score),hasWorkspace=snapshot.workspaces.some(workspace=>workspace.id===item.workspaceId),roster=item.profile.teamRoster||{},team=[roster.leader,roster.coLeader,...(roster.members||[])].filter(person=>person?.name).map(person=>`${person.name}${person.title?` · ${person.title}`:''}`).slice(0,8),teamTitle=team.length?`Thành viên: ${team.join(' | ')}`:item.profile.team||'Startup chưa công bố danh sách thành viên.';const href=hasWorkspace?`#/workspace/${item.workspaceId}`:`#/startup/${item.workspaceId}`,rankTone=index===0?'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20':index===1?'bg-gradient-to-br from-slate-300 to-slate-500 text-white':index===2?'bg-gradient-to-br from-orange-400 to-orange-700 text-white':'bg-slate-100 text-slate-600';return <li key={item.id} className="grid grid-cols-[minmax(260px,1.5fr)_repeat(4,minmax(120px,0.7fr))_150px] items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-5 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-950/5"><div className="flex min-w-0 items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-bold ${rankTone}`}>{index+1}</span><div className="min-w-0"><a className="block truncate text-sm font-bold text-slate-900 transition-colors hover:text-indigo-700" href={href} onMouseEnter={event=>showTooltip(event,item.workspaceName,teamTitle,roster)} onMouseMove={moveTooltip} onFocus={event=>showTooltip(event,item.workspaceName,teamTitle,roster)} onBlur={hideTooltip}>{item.workspaceName}</a><p className="mt-1 truncate text-xs text-slate-600">{item.title}</p><p className="mt-1 truncate text-xs text-slate-400">{item.stage} · {item.industry} · {item.location}</p></div></div>{item.metrics.map(metric=><Gauge key={metric.key} metric={metric} onShowTooltip={showTooltip} onMoveTooltip={moveTooltip} onHideTooltip={hideTooltip}/>)}<div className="flex items-center justify-center gap-2"><span className="inline-flex items-baseline gap-1 rounded-xl px-2.5 py-1.5 font-bold tabular-nums" style={{color:tone.color,backgroundColor:tone.soft}}><span className="text-lg">{item.score}</span><span className="text-[10px]">/100</span></span><a className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 transition-all duration-200 hover:scale-105 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" href={href} aria-label={`Mở hồ sơ ${item.workspaceName}`} title="Mở hồ sơ startup"><ArrowRight size={16}/></a></div></li>})}</ol></div></div></section><p className="text-xs leading-5 text-slate-500">Xếp hạng sắp theo tiêu đề đang chọn. Chỉ số được tính từ thông tin Startup công bố và chưa xác minh độc lập.</p><div ref={tooltipRef} role="tooltip" aria-hidden={!tooltip} className={`fixed z-[100] transition-opacity duration-100 ease-out ${tooltip?.team?'pointer-events-auto':'pointer-events-none'} ${tooltip?'visible opacity-100':'invisible opacity-0'}`} style={{left:tooltip?.left??-400,top:tooltip?.top??-120}}>{tooltip?.team?<TeamTooltip tooltip={tooltip}/>:<div className="w-56 rounded-xl border border-violet-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-lg shadow-violet-900/10 backdrop-blur-sm"><strong className="block font-semibold text-violet-700">{tooltip?.title}</strong><span className="mt-1 block whitespace-normal break-words leading-4 text-slate-600">{tooltip?.detail}</span></div>}</div></div>;
}

export function ServerCasePage({id=''}) {
  const {snapshot,action,busy,error,clearError}=useWorkflow();
  const [workspaceId,setWorkspaceId]=useState(''),[title,setTitle]=useState(''),[summary,setSummary]=useState('');
  if(!snapshot)return null;
  const founder=snapshot.user.role==='founder',cases=snapshot.cases||[];
  if(!founder)return <InvestorLeaderboard snapshot={snapshot}/>;
  const selected=cases.find(item=>item.id===id);
  if(id)return selected?<CaseDetail key={selected.id} item={selected}/>:<div className={card}><h1 className="font-bold">Không tìm thấy case</h1><a href="#/cases" className="mt-3 inline-block text-sm text-indigo-600">Về danh sách case</a></div>;
  const owned=snapshot.workspaces.filter(project=>project.isOwner);
  const create=async event=>{event.preventDefault();const next=await action({type:'create-case',workspaceId,title,summary});if(next){const created=next.cases.at(-1);window.location.hash=`/cases/${created.id}`;}};
  return <div className="mx-auto max-w-5xl space-y-5"><header><p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">CASE & KẾT NỐI</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Case gọi vốn của Startup</h1><p className="mt-2 text-sm leading-6 text-slate-600">Tạo bản nháp và theo dõi từng bước. Chưa thu phí hay công bố case khi cổng thanh toán chưa mở.</p></header>
    {error&&<p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error} <button className="ml-2 underline" onClick={clearError}>Đóng</button></p>}
    <section className={card}><h2 className="flex items-center gap-2 font-bold text-slate-900"><FilePlus2 size={18}/>Tạo case từ hồ sơ startup</h2>{owned.length?<form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={create}><label className="block text-sm font-medium text-slate-700">Hồ sơ startup<select className={field} value={workspaceId} onChange={event=>setWorkspaceId(event.target.value)} required><option value="">Chọn hồ sơ</option>{owned.map(project=><option key={project.id} value={project.id}>{project.profile.name}</option>)}</select></label><label className="block text-sm font-medium text-slate-700">Tên case<input className={field} value={title} onChange={event=>setTitle(event.target.value)} minLength={5} maxLength={100} required placeholder="Ví dụ: Gọi vốn vòng Seed"/></label><label className="block text-sm font-medium text-slate-700 sm:col-span-2">Mô tả case<textarea className={field} value={summary} onChange={event=>setSummary(event.target.value)} minLength={20} maxLength={2000} rows={3} required placeholder="Mục tiêu gọi vốn và kế hoạch sử dụng vốn của bạn"/></label><button className={`${primary} sm:col-span-2 sm:justify-self-start`} type="submit" disabled={busy}>Tạo bản nháp <ArrowRight size={16}/></button></form>:<p className="mt-3 text-sm text-slate-600">Bạn cần tạo hồ sơ startup trước khi lập case. <a href="#/workspace/new" className="font-semibold text-indigo-600">Tạo workspace →</a></p>}</section>
    <section className={card}><h2 className="font-bold text-slate-900">Case của bạn · {cases.length}</h2><div className="mt-4 space-y-3">{cases.length?cases.map(item=><a key={item.id} href={`#/cases/${item.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 hover:border-indigo-300"><span><strong className="block text-sm text-slate-900">{item.title}</strong><small className="mt-1 block text-xs text-slate-500">{item.industry} · {stageName[item.stage]}</small></span><ArrowRight size={17} className="text-indigo-600"/></a>):<p className="text-sm text-slate-500">Chưa có case nào.</p>}</div></section>
  </div>;
}
