export const revenueDays = period => period === '7' ? 7 : period === '30' ? 30 : period === '365' ? 365 : Infinity;

export function revenueEvents(transactions) {
  return transactions.flatMap(item => {
    const events=[];
    if ((item.status === 'paid' || item.status === 'refunded' && item.refundedAt) && item.paidAt) {
      events.push({ at:item.paidAt, amount:item.amount, type:item.type });
    }
    if (item.status === 'refunded' && item.refundedAt) {
      events.push({ at:item.refundedAt, amount:-item.amount, type:item.type });
    }
    return events;
  });
}

export function periodRevenue(transactions, period, now=Date.now(), type='all') {
  const start=now-revenueDays(period)*86_400_000;
  return revenueEvents(transactions)
    .filter(event => new Date(event.at).getTime() >= start && new Date(event.at).getTime() <= now && (type === 'all' || event.type === type))
    .reduce((sum,event) => sum+event.amount,0);
}

export function revenueBuckets(transactions, period, now=Date.now()) {
  const events=revenueEvents(transactions);
  const earliest=Math.min(...events.map(event=>new Date(event.at).getTime()).filter(Number.isFinite));
  const start=period==='all'?(Number.isFinite(earliest)?Math.min(earliest,now-86_400_000):now-30*86_400_000):now-revenueDays(period)*86_400_000;
  const groups=period==='7'?7:period==='30'?6:period==='365'?12:8;
  const span=(now-start)/groups;
  return Array.from({length:groups},(_,index)=>{
    const from=start+index*span;
    const to=index===groups-1?now+1:from+span;
    const value=events.filter(event=>{const at=new Date(event.at).getTime();return at>=from&&at<to;}).reduce((sum,event)=>sum+event.amount,0);
    return {value,label:new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit'}).format(new Date(to-1))};
  });
}

export function revenuePanelIsDown(transactions, period, now=Date.now()) {
  const points=revenueBuckets(transactions,period,now);
  return periodRevenue(transactions,period,now)<0 || points.at(-1).value<points.at(-2).value;
}
