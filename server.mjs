import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Chess } from './vendor/chess.js';

const rooms = new Map();
const root = new URL('./', import.meta.url);
const ttl = 6 * 60 * 60 * 1000;
const token = () => randomBytes(24).toString('hex');
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
function fail(status, message) { throw Object.assign(new Error(message), {status}); }
async function body(req) {
  let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 2048) fail(413, 'Request too large.'); }
  try { return JSON.parse(raw || '{}'); } catch { fail(400, 'Invalid request.'); }
}
function snapshot(room, seat) {
  return {code:room.code, seat, joined:!!room.black, history:room.game.history(), fen:room.game.fen()};
}
export function createServer() {
 return http.createServer(async (req,res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path.startsWith('/api/')) {
   res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
   res.setHeader('Cache-Control', 'no-store');
   res.setHeader('Content-Type', 'application/json');
   if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
   try {
    for (const [code,room] of rooms) if (Date.now()-room.updated > ttl) rooms.delete(code);
    let result;
    if (path === '/api/rooms' && req.method === 'POST') {
     if (rooms.size >= 1000) fail(503,'The server is full. Try again later.');
     let code; do { code=Array.from({length:8},()=>alphabet[randomInt(alphabet.length)]).join(''); } while(rooms.has(code));
     const room={code,white:token(),black:null,game:new Chess(),updated:Date.now()}; rooms.set(code,room);
     result={...snapshot(room,'w'),token:room.white};
    } else {
     const match=path.match(/^\/api\/rooms\/([A-Z2-9]{8})(?:\/(join|move))?$/);
     if(!match) fail(404,'Room not found. Check your code.');
     const room=rooms.get(match[1]); if(!room) fail(404,'Room not found or expired. Create a new game.');
     if(match[2]==='join' && req.method==='POST') {
      if(room.black) fail(409,'This game already has two players.');
      room.black=token(); room.updated=Date.now(); result={...snapshot(room,'b'),token:room.black};
     } else {
      const auth=req.headers.authorization?.replace(/^Bearer /,'');
      const seat=auth===room.white?'w':room.black && auth===room.black?'b':null;
      if(!seat) fail(401,'Your room session is no longer valid.');
      if(match[2]==='move' && req.method==='POST') {
       if(!room.black) fail(409,'Waiting for your opponent to join.');
       if(room.game.isGameOver()) fail(409,'This game has ended.');
       if(room.game.turn()!==seat) fail(409,'Wait for your turn.');
       const move=await body(req);
       if(move.ply!==room.game.history().length) fail(409,'The board changed. Try your move again.');
       try { room.game.move({from:move.from,to:move.to,promotion:move.promotion || 'q'}); } catch { fail(400,'That move is not legal.'); }
      } else if(req.method!=='GET' || match[2]) fail(405,'Method not allowed.');
      room.updated=Date.now(); result=snapshot(room,seat);
     }
    }
    res.end(JSON.stringify(result));
   } catch(error) { res.writeHead(error.status || 500); res.end(JSON.stringify({error:error.status ? error.message : 'Server error. Please try again.'})); }
   return;
  }
  // Serve only public frontend files, never server code, tokens or dotfiles.
  if(!/^(\/|\/(index\.html|style\.css|app\.js|config\.js)|\/vendor\/chess\.js|\/assets\/pieces\/[wb][KQRBNP]\.svg)$/.test(path)) {res.writeHead(404);res.end('Not found');return;}
  try {
   const file=path==='/'?'index.html':path.slice(1);
   const mime=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/javascript';
   res.setHeader('Content-Type',mime); res.end(await readFile(new URL(file,root)));
  } catch {res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
 const port=Number(process.env.PORT || 3000); createServer().listen(port,'0.0.0.0',()=>console.log(`Deep Chess: http://localhost:${port}`));
}
