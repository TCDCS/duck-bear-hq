import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';

class D1Statement {
  constructor(db, sql) { this.db=db; this.sql=sql; this.values=[]; }
  bind(...values) { this.values=values; return this; }
  first() { const row=this.db.prepare(this.sql).get(...this.values); return Promise.resolve(row ?? null); }
  all() { return Promise.resolve({ results:this.db.prepare(this.sql).all(...this.values) }); }
  run() { const r=this.db.prepare(this.sql).run(...this.values); return Promise.resolve({ success:true, meta:{ changes:Number(r.changes||0) } }); }
  _runSync() { const r=this.db.prepare(this.sql).run(...this.values); return { success:true, meta:{changes:Number(r.changes||0)} }; }
}
class D1Mock {
  constructor() { this.db=new DatabaseSync(':memory:'); }
  prepare(sql) { return new D1Statement(this.db,sql); }
  async batch(statements) {
    this.db.exec('BEGIN');
    try { const out=statements.map(s=>s._runSync()); this.db.exec('COMMIT'); return out; }
    catch(e){ this.db.exec('ROLLBACK'); throw e; }
  }
}
class R2ObjectMock {
  constructor(value,meta={}) { this.value=value; this.httpEtag='"mock"'; this.meta=meta; this.body=value; }
  writeHttpMetadata(headers){ if(this.meta.contentType) headers.set('content-type',this.meta.contentType); }
}
class R2Mock {
  constructor(){this.map=new Map();}
  async put(key,body,options={}) { let bytes;if(body?.getReader){const r=body.getReader();const chunks=[];let total=0;while(true){const {done,value}=await r.read();if(done)break;chunks.push(value);total+=value.length;}bytes=new Uint8Array(total);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}}else bytes=body;this.map.set(key,new R2ObjectMock(bytes,options.httpMetadata||{})); }
  async get(key){return this.map.get(key)||null;}
  async delete(key){this.map.delete(key);}
}

const DB=new D1Mock();
DB.db.exec(readFileSync(new URL('../migrations/0001_schema.sql',import.meta.url),'utf8'));
DB.db.exec(readFileSync(new URL('../migrations/0002_seed.sql',import.meta.url),'utf8'));
const env={DB,MEDIA:new R2Mock(),SETUP_SECRET:'smoke-setup-secret',ASSETS:{fetch:()=>new Response('asset')}};
const ORIGIN='https://duck-bear.test';

async function call(path,{method='GET',body,cookie,headers={}}={}){
  const h=new Headers(headers);h.set('Origin',ORIGIN);if(cookie)h.set('Cookie',cookie);let payload;
  if(body instanceof FormData) payload=body;else if(body!==undefined){h.set('Content-Type','application/json');payload=JSON.stringify(body);}
  const res=await worker.fetch(new Request(`${ORIGIN}${path}`,{method,headers:h,body:payload}),env);
  let data=null;const type=res.headers.get('content-type')||'';if(type.includes('json'))data=await res.json();
  return {res,data};
}
function expect(cond,msg){if(!cond)throw new Error(msg);}
function cookieFrom(res){return (res.headers.get('set-cookie')||'').split(';')[0];}

let r=await call('/api/setup/status');expect(r.data.setupRequired===true,'setup should initially be required');
r=await call('/api/setup',{method:'POST',body:{setupSecret:'smoke-setup-secret',admin:{username:'bear',displayName:'Zach',password:'test-pass-123'},member:{username:'duck',displayName:'Guannan',password:'test-pass-456'}}});expect(r.res.status===201,`setup failed ${r.res.status} ${JSON.stringify(r.data)}`);
r=await call('/api/auth/login',{method:'POST',body:{username:'duck',password:'test-pass-456'}});expect(r.res.ok,'member login failed');const duckCookie=cookieFrom(r.res);expect(duckCookie.startsWith('db_session='),'missing member session cookie');
r=await call('/api/bootstrap',{cookie:duckCookie});expect(r.res.ok && r.data.products.length>=10,'bootstrap/products failed');const duckId=r.data.user.id;
r=await call('/api/cart',{method:'POST',cookie:duckCookie,body:{productId:'cuddle',action:'add',quantity:2}});expect(r.data.cart[0].qty===2,'cart add failed');
r=await call('/api/orders/checkout',{method:'POST',cookie:duckCookie,body:{customerName:'Guannan',deliveryMethod:'Emergency Bear Delivery',deliveryNotes:'Test order'}});expect(r.res.status===201 && r.data.order.total_pence===0,'checkout failed');const orderId=r.data.order.id;expect(r.data.loyalty.balance===5,'checkout points failed');
r=await call('/api/loyalty/claim',{method:'POST',cookie:duckCookie,body:{ruleId:'laugh'}});expect(r.res.ok && r.data.loyalty.balance===15,'loyalty claim failed');
r=await call('/api/fun/adventures',{method:'POST',cookie:duckCookie,body:{title:'Smoke shark mission',detail:'Test'}});expect(r.res.status===201,'adventure create failed');const advId=r.data.fun.adventures[0].id;
r=await call(`/api/fun/adventures/${advId}/status`,{method:'POST',cookie:duckCookie,body:{status:'Completed'}});expect(r.res.ok && r.data.loyalty.balance===65,'adventure points failed');
r=await call('/api/loyalty/redeem',{method:'POST',cookie:duckCookie,body:{rewardId:'veto'}});expect(r.res.ok && r.data.loyalty.balance===15,'reward redemption failed');
r=await call('/api/fun/room-service',{method:'POST',cookie:duckCookie,body:{items:[{id:'salmon',qty:1},{id:'hashbrowns',qty:2}],notes:'test'}});expect(r.res.status===201 && r.data.order.total_pence===0 && r.data.loyalty.balance===20,'room service failed');
r=await call('/api/fun/reviews',{method:'POST',cookie:duckCookie,body:{rating:5,title:'Month test',body:'Very serious five star report.'}});expect(r.res.status===201,'review failed');
r=await call('/api/fun/complaints',{method:'POST',cookie:duckCookie,body:{category:'Orange juice',body:'Bear drank it.',compensationRequested:'Ten glasses'}});expect(r.res.status===201 && r.data.caseNumber.startsWith('CASE-'),'complaint failed');
const concurrentRedemptions=await Promise.all([call('/api/loyalty/redeem',{method:'POST',cookie:duckCookie,body:{rewardId:'snacktax'}}),call('/api/loyalty/redeem',{method:'POST',cookie:duckCookie,body:{rewardId:'snacktax'}})]);expect(concurrentRedemptions.filter(x=>x.res.ok).length===1 && concurrentRedemptions.filter(x=>[400,409].includes(x.res.status)).length===1,'concurrent redemption should allow only one spend');
const uploadForm=new FormData();uploadForm.set('file',new File([new Uint8Array([137,80,78,71])],'smoke-memory.png',{type:'image/png'}));
r=await call('/api/media/upload',{method:'POST',cookie:duckCookie,body:uploadForm});expect(r.res.status===201 && r.data.attachment?.url?.startsWith('/media/memories/'),'private media upload failed');const attachment=r.data.attachment;
r=await call(attachment.url);expect(r.res.status===401,'private media must reject signed-out requests');
r=await call(attachment.url,{cookie:duckCookie});expect(r.res.ok && r.res.headers.get('cache-control')?.startsWith('private'),'private media retrieval failed');
r=await call('/api/memories',{method:'POST',cookie:duckCookie,body:{title:'Smoke memory',body:'Private R2 integration test',mood:'🦆',attachment}});expect(r.res.status===201 && r.data.fun.memories.some(m=>m.title==='Smoke memory'),'memory record failed');
r=await call('/api/account/password',{method:'POST',cookie:duckCookie,body:{currentPassword:'test-pass-456',newPassword:'test-pass-789'}});expect(r.res.ok,'member password change failed');
r=await call('/api/auth/login',{method:'POST',body:{username:'duck',password:'test-pass-456'}});expect(r.res.status===401,'old member password should no longer work');
r=await call('/api/auth/login',{method:'POST',body:{username:'duck',password:'test-pass-789'}});expect(r.res.ok,'new member password login failed');

r=await call('/api/auth/login',{method:'POST',body:{username:'bear',password:'test-pass-123'}});expect(r.res.ok,'admin login failed');const bearCookie=cookieFrom(r.res);
r=await call('/api/admin/loyalty/adjust',{method:'POST',cookie:bearCookie,body:{userId:duckId,delta:100,note:'Opening test credit'}});expect(r.res.ok && r.data.loyalty.balance===100,'admin adjustment failed');
r=await call(`/api/orders/${orderId}/status`,{method:'POST',cookie:bearCookie,body:{status:'Delivered',note:'Delivered by smoke-test Bear'}});expect(r.res.ok && r.data.order.status==='Delivered','order status failed');
r=await call('/api/admin/dashboard',{cookie:bearCookie});expect(r.res.ok && Array.isArray(r.data.audit) && r.data.audit.length>0,'admin dashboard failed');
r=await call('/api/export/orders.csv',{cookie:bearCookie});expect(r.res.ok && (r.res.headers.get('content-type')||'').includes('text/csv'),'order export failed');
r=await call('/api/export/backup.json',{cookie:bearCookie});expect(r.res.ok,'backup failed');
r=await call(`/api/admin/users/${duckId}/password`,{method:'POST',cookie:bearCookie,body:{newPassword:'test-pass-reset'}});expect(r.res.ok,'admin member password reset failed');
r=await call('/api/bootstrap',{cookie:duckCookie});expect(r.res.status===401,'admin password reset should invalidate member sessions');
r=await call('/api/auth/login',{method:'POST',body:{username:'duck',password:'test-pass-reset'}});expect(r.res.ok,'reset member password login failed');

console.log('Smoke test passed: setup, auth/password management, shared shop, £0 checkout, orders, transaction-safe loyalty/rewards, private media/memories, fun modules, admin tracking and exports.');
