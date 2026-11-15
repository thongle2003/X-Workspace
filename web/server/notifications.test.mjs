import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflowStore } from './workflow-store.mjs';

const profile={name:'Startup thử thông báo',industry:'SaaS',stage:'Seed',location:'Hà Nội',summary:'Nền tảng kết nối Startup và nhà đầu tư.',target:1000};

test('notifications follow requests, decisions and messages without leaking between accounts',()=>{
  const store=createWorkflowStore();
  const project=store.act('founder',{type:'create-workspace',name:'Gọi vốn',goal:'Mở vòng gọi vốn mới',profile}).workspaces[0];
  store.act('founder',{type:'publish',workspaceId:project.id});
  assert.equal(store.snapshot('founder').notifications.length,0);
  assert.equal(store.snapshot('investor').notifications.length,0);

  const request=store.act('investor',{type:'request-access',workspaceId:project.id,message:'Tôi muốn xem hồ sơ và tìm hiểu cơ hội đầu tư.'}).requests[0];
  const founderNotice=store.snapshot('founder').notifications[0];
  assert.equal(founderNotice.kind,'request');
  assert.equal(founderNotice.href,`#/workspace/${project.id}`);
  assert.equal(store.snapshot('investor').notifications.length,0);
  assert.equal(store.snapshot('investor2').notifications.length,0);
  assert.throws(()=>store.act('investor',{type:'read-notification',notificationId:founderNotice.id}),{code:'NOT_FOUND'});

  store.act('founder',{type:'decide-access',requestId:request.id,decision:'approved'});
  const investorNotice=store.snapshot('investor').notifications[0];
  assert.equal(investorNotice.kind,'decision');
  assert.equal(investorNotice.href,`#/startup/${project.id}`);
  store.act('investor',{type:'read-notification',notificationId:investorNotice.id});
  assert.ok(store.snapshot('investor').notifications[0].readAt);
  assert.equal(store.snapshot('founder').notifications[0].readAt,null);

  store.act('founder',{type:'bypass-connection-fee-demo',requestId:request.id});
  store.act('investor',{type:'send-message',workspaceId:project.id,text:'Xin chào, tôi muốn trao đổi thêm về kế hoạch gọi vốn.'});
  assert.equal(store.snapshot('founder').notifications[0].kind,'message');
  store.act('founder',{type:'send-message',workspaceId:project.id,text:'Cảm ơn, chúng tôi sẵn sàng trao đổi.'});
  assert.equal(store.snapshot('investor').notifications[0].kind,'message');
  assert.equal(store.snapshot('investor2').notifications.length,0);
  store.act('founder',{type:'read-all-notifications'});
  assert.ok(store.snapshot('founder').notifications.every(item=>item.readAt));
  assert.ok(store.snapshot('investor').notifications.some(item=>!item.readAt));

  const restored=createWorkflowStore({initialData:store.exportData()});
  assert.deepEqual(restored.snapshot('founder').notifications,store.snapshot('founder').notifications);
  assert.deepEqual(restored.snapshot('investor').notifications,store.snapshot('investor').notifications);
});

test('admin account changes notify the affected account and old backups remain readable',()=>{
  const store=createWorkflowStore();
  const old=store.exportData();delete old.notifications;
  const restored=createWorkflowStore({initialData:old});
  restored.adminAccount({accountId:'founder',status:'suspended',expectedRevision:restored.exportData().revision});
  restored.adminAccount({accountId:'founder',status:'active',permissions:{connections:false},expectedRevision:restored.exportData().revision});
  const notices=restored.snapshot('founder').notifications;
  assert.deepEqual(notices.map(item=>item.title),['Quyền sử dụng đã thay đổi','Tài khoản đã được mở lại','Tài khoản đã bị khóa']);
  assert.equal(restored.snapshot('investor').notifications.length,0);
});
