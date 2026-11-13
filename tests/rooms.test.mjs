import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
test('two players join, authorize and synchronize legal moves', async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const api=async(path,method='GET',data,token)=>{const response=await fetch(`${base}/api/rooms${path}`,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:response.status,body:await response.json()};};
 try {
 const white=(await api('','POST',{})).body;assert.match(white.code,/^[A-Z2-9]{8}$/);assert.equal(white.seat,'w');
 assert.equal((await api(`/${white.code}/move`,'POST',{from:'e2',to:'e4',ply:0},white.token)).status,409);
 const black=(await api(`/${white.code}/join`,'POST',{})).body;assert.equal(black.seat,'b');assert.notEqual(black.token,white.token);
 assert.equal((await api(`/${white.code}/join`,'POST',{})).status,409);
 assert.equal((await api(`/${white.code}`)).status,401);
 assert.equal((await api(`/${white.code}/move`,'POST',{from:'e7',to:'e5',ply:0},black.token)).status,409);
 assert.equal((await api(`/${white.code}/move`,'POST',{from:'e2',to:'e5',ply:0},white.token)).status,400);
 const moved=await api(`/${white.code}/move`,'POST',{from:'e2',to:'e4',ply:0},white.token);assert.equal(moved.status,200);
 const synced=(await api(`/${white.code}`,'GET',null,black.token)).body;assert.deepEqual(synced.history,['e4']);assert.equal(synced.fen,moved.body.fen);assert.ok(!JSON.stringify(synced).includes(white.token));
 assert.equal((await api(`/${white.code}/move`,'POST',{from:'e7',to:'e5',ply:0},black.token)).status,409);
 assert.equal((await api(`/${white.code}/move`,'POST',{from:'e7',to:'e5',ply:1},black.token)).status,200);
 assert.equal((await fetch(`${base}/server.mjs`)).status,404);
 }finally{await new Promise(r=>server.close(r));}
});
