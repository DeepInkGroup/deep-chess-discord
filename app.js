import { Chess } from './vendor/chess.js';
const game = new Chess();
const board = document.querySelector('#board');
const moves = document.querySelector('#moves');
let selected = null, flipped = false, last = null;
const pieceName = {p:'pawn',n:'knight',b:'bishop',r:'rook',q:'queen',k:'king'};
const image = piece => `./assets/pieces/${piece.color}${piece.type.toUpperCase()}.svg`;
function render() {
  const files = flipped ? 'hgfedcba' : 'abcdefgh';
  const ranks = flipped ? '12345678' : '87654321';
  const targets = selected ? game.moves({square:selected, verbose:true}) : [];
  board.replaceChildren();
  for (const [ri, rank] of [...ranks].entries()) for (const [fi, file] of [...files].entries()) {
    const square = file + rank, piece = game.get(square);
    const target = targets.find(m => m.to === square);
    const button = document.createElement('button');
    button.className = `square ${(files.charCodeAt(fi) - 97 + Number(rank)) % 2 ? 'light' : 'dark'}${selected === square ? ' selected' : ''}${last && (last.from === square || last.to === square) ? ' last' : ''}${target ? (piece || target.flags.includes('e') ? ' capture' : ' possible') : ''}`;
    button.setAttribute('role','gridcell');
    button.setAttribute('aria-label', `${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${pieceName[piece.type]}` : ', empty'}${target ? ', legal move' : ''}`);
    if (fi === 0) button.insertAdjacentHTML('beforeend', `<span class="coordinate rank">${rank}</span>`);
    if (ri === 7) button.insertAdjacentHTML('beforeend', `<span class="coordinate file">${file}</span>`);
    if (piece) { const img = document.createElement('img'); img.src = image(piece); img.alt = ''; button.append(img); }
    button.addEventListener('click', () => choose(square)); board.append(button);
  }
  let status = `${game.turn() === 'w' ? 'White' : 'Black'} to move`, detail = 'The game is on. Good luck!';
  if (game.isCheckmate()) { status = 'Checkmate'; detail = `${game.turn() === 'w' ? 'Black' : 'White'} wins the game!`; }
  else if (game.isStalemate()) { status = 'Draw'; detail = 'Stalemate.'; }
  else if (game.isDraw()) { status = 'Draw'; detail = 'The game has ended in a draw.'; }
  else if (game.isCheck()) detail = 'Check! Protect your king.';
  document.querySelector('#status').textContent = status;
  document.querySelector('#detail').textContent = detail;
  document.querySelector('#turn-icon').textContent = game.turn() === 'w' ? '♔' : '♚';
  const history = game.history(); document.querySelector('#move-count').textContent = `${history.length} ${history.length === 1 ? 'MOVE' : 'MOVES'}`;
  if (!history.length) moves.innerHTML = '<div class="empty"><span>♙</span><strong>Every game starts here</strong><small>Your moves will appear in this space.</small></div>';
  else { moves.replaceChildren(); for (let i=0; i<history.length; i+=2) { const row = document.createElement('div'); row.className='move-row'; for (const value of [`${i/2+1}.`, history[i], history[i+1] || '']) { const span = document.createElement('span'); span.textContent=value; row.append(span); } moves.append(row); } moves.scrollTop=moves.scrollHeight; }
}
function choose(square) {
  const piece = game.get(square);
  if (selected === square) { selected = null; render(); return; }
  const candidates = selected ? game.moves({square:selected, verbose:true}).filter(m => m.to === square) : [];
  if (candidates.length) {
    if (candidates.some(m => m.promotion)) { promote(selected, square); return; }
    last = game.move({from:selected,to:square}); selected=null;
  } else selected = piece && piece.color === game.turn() ? square : null;
  render();
}
function promote(from,to) {
  const dialog = document.querySelector('#promotion'), options = document.querySelector('#promotion-options'); options.replaceChildren();
  for (const type of ['q','r','b','n']) { const button = document.createElement('button'); button.type='button'; button.setAttribute('aria-label',`Promote to ${pieceName[type]}`); const img=document.createElement('img'); img.src=image({color:game.turn(),type}); img.alt=''; button.append(img); button.onclick=()=>{last=game.move({from,to,promotion:type}); selected=null; dialog.close(); render();}; options.append(button); }
  dialog.showModal();
}
document.querySelector('#flip').onclick=()=>{flipped=!flipped; render();};
document.querySelector('#undo').onclick=()=>{game.undo(); last=game.history({verbose:true}).at(-1) || null; selected=null; render();};
document.querySelector('#new').onclick=()=>{if (!game.history().length || confirm('Start a new game? Your current game will be lost.')) {game.reset(); last=null; selected=null; render();}};
render();
