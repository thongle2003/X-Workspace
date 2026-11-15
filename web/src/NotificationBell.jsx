import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, X } from 'lucide-react';
import { useWorkflow } from './InvestmentFlow.jsx';

const formatTime = value => new Intl.DateTimeFormat('vi-VN', {dateStyle:'short',timeStyle:'short',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));

export function NotificationBell() {
  const {snapshot,action}=useWorkflow();
  const [open,setOpen]=useState(false),[position,setPosition]=useState({top:72,right:12});
  const button=useRef(null),panel=useRef(null);
  const notices=snapshot?.notifications||[];
  const unread=notices.filter(item=>!item.readAt).length;

  useEffect(()=>{
    if(!open)return;
    const place=()=>{
      const rect=button.current?.getBoundingClientRect();
      if(rect)setPosition({top:Math.min(window.innerHeight-20,rect.bottom+9),right:Math.max(8,window.innerWidth-rect.right)});
    };
    const outside=event=>{if(!button.current?.contains(event.target)&&!panel.current?.contains(event.target))setOpen(false);};
    const escape=event=>{if(event.key==='Escape')setOpen(false);};
    place();
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,true);
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);

  async function openNotice(item){
    if(!item.readAt)await action({type:'read-notification',notificationId:item.id});
    setOpen(false);
    window.location.hash=item.href.slice(1);
  }

  return <>
    <button ref={button} type="button" className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label={`Thông báo${unread?`, ${unread} chưa đọc`:''}`} aria-expanded={open} aria-haspopup="dialog" onClick={()=>setOpen(value=>!value)}>
      <Bell size={17} aria-hidden="true"/>
      {unread>0&&<span className="absolute -right-1.5 -top-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white" aria-hidden="true">{unread>99?'99+':unread}</span>}
    </button>
    {open&&createPortal(<section ref={panel} role="dialog" aria-label="Thông báo" className="fixed z-[100] flex max-h-[min(520px,calc(100dvh-90px))] w-[min(380px,calc(100vw-16px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl shadow-slate-950/20" style={{top:position.top,right:position.right}}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h2 className="font-bold">Thông báo</h2><p className="text-xs text-slate-500">{unread} chưa đọc</p></div><div className="flex items-center gap-2">{unread>0&&<button type="button" className="text-xs font-semibold text-indigo-600 hover:underline" onClick={()=>void action({type:'read-all-notifications'})}>Đọc tất cả</button>}<button type="button" className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Đóng thông báo" onClick={()=>setOpen(false)}><X size={16}/></button></div></div>
      <div className="min-h-0 overflow-y-auto">{notices.length?notices.map(item=><button key={item.id} type="button" onClick={()=>void openNotice(item)} className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${item.readAt?'bg-white':'bg-indigo-50/65'}`}><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt?'bg-transparent':'bg-indigo-600'}`} aria-hidden="true"/><span className="min-w-0 flex-1"><strong className="block text-sm font-semibold text-slate-900">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-slate-600">{item.body}</span><span className="mt-1.5 block text-[11px] text-slate-400">{formatTime(item.createdAt)}</span></span>{item.readAt&&<Check size={14} className="mt-1 shrink-0 text-slate-400" aria-label="Đã đọc"/>}</button>):<p className="px-4 py-10 text-center text-sm text-slate-500">Chưa có thông báo nào.</p>}</div>
    </section>,document.body)}
  </>;
}
