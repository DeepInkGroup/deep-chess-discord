import { Chess } from './vendor/chess.js';
import { API_BASE } from './config.js';
const $ = selector => document.querySelector(selector);
const game = new Chess();
const board = $('#board'), moves = $('#moves');
let selected = null, flipped = false, last = null, session = null, joined = false, connected = false, busy = false, pollTimer;
const pieceName = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const image = piece => `./assets/pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
function message(text) { $('#connection').textContent=text; }
async function request(path, data, auth = session?.token) {
  let response;
  try { response = await fetch(`${API_BASE.replace(/\/$/,'')}/api/rooms${path}`, {method:data ? 'POST':'GET', headers:{...(data ? {'Content-Type':'application/json'} : {}),...(auth ? {Authorization:`Bearer ${auth}`} : {})}, ...(data ? {body:JSON.stringify(data)} : {}), signal:AbortSignal.timeout(10000)}); }
  catch { throw Error('Cannot reach the game server. Please try again.'); }
  let result;
  try { result=await response.json(); } catch { throw Error('Game server unavailable. The site owner needs to connect a room server.'); }
  if(!response.ok) throw Error(result.error || 'Unable to connect. Please try again.');
  return result;
}
function apply(state) {
  // Replay moves to retain repetition detection and the full move list.
  const next=new Chess(); for(const move of state.history) next.move(move);
  if(next.fen()!==state.fen) throw Error('Game synchronization failed. Please reconnect.');
  const changed=next.fen()!==game.fen();
  if(changed) {game.reset(); for(const move of state.history) game.move(move); selected=null; $('#promotion').close();}
  last=game.history({verbose:true}).at(-1) || null; joined=state.joined; connected=true;
  message(joined ? 'Connected · moves sync automatically' : 'Waiting for your opponent…'); render();
}
function saveSession() {try {sessionStorage.setItem('deep-chess-room',JSON.stringify(session));} catch { /* Private browser storage can be unavailable. */ }}
function enter(state) {
  session={code:state.code,token:state.token,seat:state.seat}; flipped=session.seat==='b'; selected=null;
  saveSession(); apply(state); schedule();
}
function schedule() { clearTimeout(pollTimer); if(session) pollTimer=setTimeout(poll,1200); }
async function poll() {
  if(!session || busy) {schedule();return;}
  const current=session;
  try {const state=await request(`/${current.code}`); if(session===current) apply(state);}
  catch(error) {if(session===current) {connected=false;message(`${error.message} Reconnecting…`);render();}}
  schedule();
}
function render() {
  const files = flipped ? 'hgfedcba' : 'abcdefgh', ranks = flipped ? '12345678' : '87654321';
  const targets = selected ? game.moves({square:selected, verbose:true}) : [];
  board.replaceChildren();
  for (const [ri, rank] of [...ranks].entries()) for (const [fi, file] of [...files].entries()) {
    const square = file + rank, piece = game.get(square), target = targets.find(m => m.to === square);
    const button = document.createElement('button');
    button.className = `square ${(files.charCodeAt(fi) - 97 + Number(rank)) % 2 ? 'light' : 'dark'}${selected === square ? ' selected' : ''}${last && (last.from === square || last.to === square) ? ' last' : ''}${target ? (piece || target.flags.includes('e') ? ' capture' : ' possible') : ''}`;
    button.setAttribute('role','gridcell');
    button.setAttribute('aria-label', `${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${pieceName[piece.type]}` : ', empty'}${target ? ', legal move' : ''}`);
    if (fi === 0) button.insertAdjacentHTML('beforeend', `<span class="coordinate rank">${rank}</span>`);
    if (ri === 7) button.insertAdjacentHTML('beforeend', `<span class="coordinate file">${file}</span>`);
    if (piece) {const img = document.createElement('img'); img.src = image(piece); img.alt = ''; button.append(img);}
    button.addEventListener('click', () => choose(square)); board.append(button);
  }
  $('#top-player').textContent=flipped?'White':'Black'; $('#bottom-player').textContent=flipped?'Black':'White';
  const stateFor=color=>!session?'':color===session.seat?'You':joined?'Opponent':'Waiting for opponent';
  $('#top-state').textContent=stateFor(flipped?'w':'b'); $('#bottom-state').textContent=stateFor(flipped?'b':'w');
  document.querySelectorAll('.avatar').forEach((avatar,i)=>{const white=(i===0)===flipped;avatar.className=`avatar ${white?'light':'dark'}-avatar`;});
  let status = !session ? 'Create or join a game' : !joined ? 'Waiting for Black' : `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
  let detail = !session ? 'Choose your opponent. Make your move.' : !joined ? 'Send your game code to a friend.' : game.turn()===session.seat?'Your turn. Make your move.':'Your opponent is thinking…';
  if (game.isCheckmate()) {status='Checkmate';detail=`${game.turn()==='w'?'Black':'White'} wins the game!`;}
  else if (game.isDraw()) {status='Draw';detail=game.isStalemate()?'Stalemate.':'The game has ended in a draw.';}
  else if (game.isCheck()) detail='Check! Protect your king.';
  $('#status').textContent=status; $('#detail').textContent=detail;
  $('#lobby').hidden=!!session; $('#room-info').hidden=!session; $('#leave').hidden=!session;
  $('#room-code').textContent=session?.code || ''; $('#room-hint').textContent=session?.seat==='w'?'You play White. Share this code to invite Black.':'You play Black. Your opponent created this game.';
  const history=game.history(); $('#move-count').textContent=`${history.length} ${history.length===1?'MOVE':'MOVES'}`;
  if(!history.length) moves.innerHTML='<div class="empty"><span>♙</span><span>Your moves will appear here.</span></div>';
  else {const atBottom=moves.scrollTop+moves.clientHeight>=moves.scrollHeight-10; moves.replaceChildren();for(let i=0;i<history.length;i+=2){const row=document.createElement('div');row.className='move-row';for(const value of [`${i/2+1}.`,history[i],history[i+1]||'']){const span=document.createElement('span');span.textContent=value;row.append(span);}moves.append(row);}if(atBottom)moves.scrollTop=moves.scrollHeight;}
}
async function play(from,to,promotion) {
  if(busy || !session || !connected) return;
  busy=true; selected=null;
  try {apply(await request(`/${session.code}/move`,{from,to,promotion,ply:game.history().length}));}
  catch(error) {message(error.message);}
  finally {busy=false; render();schedule();}
}
function choose(square) {
  if(!session || !joined || !connected || busy || game.isGameOver() || game.turn()!==session.seat) return;
  const piece=game.get(square);
  if(selected===square){selected=null;render();return;}
  const candidates=selected?game.moves({square:selected,verbose:true}).filter(m=>m.to===square):[];
  if(candidates.length){if(candidates.some(m=>m.promotion))promote(selected,square);else play(selected,square);return;}
  selected=piece?.color===session.seat?square:null;render();
}
function promote(from,to) {
  const dialog=$('#promotion'), options=$('#promotion-options');options.replaceChildren();
  for(const type of ['q','r','b','n']){const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Promote to ${pieceName[type]}`);const img=document.createElement('img');img.src=image({color:game.turn(),type});img.alt='';button.append(img);button.onclick=()=>{dialog.close();play(from,to,type);};options.append(button);}dialog.showModal();
}
async function connect(path) {
  if(busy)return;busy=true;$('#create').disabled=$('#join').disabled=true;message('Connecting…');
  try {enter(await request(path,{},null));} catch(error) {message(error.message);}
  finally {busy=false;$('#create').disabled=$('#join').disabled=false;}
}
$('#create').onclick=()=>connect('');
$('#join-form').onsubmit=event=>{event.preventDefault();const code=$('#join-code').value.trim().toUpperCase();if(/^[A-Z2-9]{8}$/.test(code))connect(`/${code}/join`);};
$('#join-code').oninput=event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-Z2-9]/g,'');};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(session.code);message('Code copied. Send it to your opponent.');}catch{message(`Share this game code: ${session.code}`);}};
$('#flip').onclick=()=>{flipped=!flipped;render();};
$('#leave').onclick=()=>{if(busy)return;if(!confirm('Leave this game? Your opponent will keep the current board.'))return;clearTimeout(pollTimer);session=null;connected=false;joined=false;selected=null;last=null;game.reset();try{sessionStorage.removeItem('deep-chess-room');}catch{}message('');render();};
render();
try {const saved=JSON.parse(sessionStorage.getItem('deep-chess-room'));if(saved?.code && saved?.token && ['w','b'].includes(saved.seat)){session=saved;flipped=session.seat==='b';render();poll();}}catch{}
