import test from 'node:test';
import assert from 'node:assert/strict';
import { periodRevenue, revenueBuckets, revenuePanelIsDown } from '../src/adminRevenue.js';

test('refunds reduce revenue on the refund date and can make a period negative',()=>{
  const now=new Date('2026-11-15T10:00:00.000Z').getTime();
  const at=days=>new Date(now-days*86_400_000).toISOString();
  const transactions=[
    {type:'listing',status:'paid',amount:899000,paidAt:at(15)},
    {type:'listing',status:'paid',amount:100000,paidAt:at(400)},
    {type:'investor_plan',status:'refunded',amount:399000,paidAt:at(69),refundedAt:at(1)},
    {type:'connection',status:'pending',amount:250000,createdAt:at(1)},
  ];
  assert.equal(periodRevenue(transactions,'365',now),899000);
  assert.equal(periodRevenue(transactions,'all',now),999000);
  assert.equal(revenueBuckets(transactions,'all',now).reduce((sum,item)=>sum+item.value,0),999000);
  assert.equal(periodRevenue(transactions,'7',now),-399000);
  assert.equal(periodRevenue(transactions,'7',now,'investor_plan'),-399000);
  assert.equal(revenueBuckets(transactions,'7',now).reduce((sum,item)=>sum+item.value,0),-399000);
  assert.ok(revenueBuckets(transactions,'7',now).some(item=>item.value<0));
  assert.equal(revenuePanelIsDown(transactions.slice(0,1).concat(transactions[2]),'all',now),true);
  assert.equal(revenuePanelIsDown(transactions,'7',now),true);
  assert.equal(revenuePanelIsDown([{type:'listing',status:'paid',amount:899000,paidAt:at(0.5)}],'7',now),false);
  assert.equal(periodRevenue([{type:'listing',status:'refunded',amount:899000,paidAt:at(2)}],'7',now),0);
});
