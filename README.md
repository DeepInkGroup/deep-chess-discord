# Deep Chess for Discord

Chess with a green and cream board, outlined pieces, move history, board flipping, and private rooms joined by an eight-character code.

## Run and play

Requires Node.js 20 or newer. No dependency installation is needed to run the server; chess.js is vendored.

```powershell
cd "U:\Apps\Deep Chess Discord"
npm start
```

Open http://localhost:3000. Click **Create game**, copy the code and send it to your friend. The creator is White; the joining player is Black. Both players must open the same hosted frontend and use the same room server. For testing on one computer, use two separate browser profiles or a private window; session storage restores your seat on refresh. Session tokens stay in the browser and are not included in the shared code.

The server validates legal moves, turns and seat ownership. A room accepts two players. Castling, en passant, promotion, checkmate and draws use chess.js. The board is locked while waiting for a second player and during the opponent's turn. Flip changes only your view. Online undo is omitted so neither player can alter an opponent's game.

## Publish online

GitHub Pages hosts only the frontend. **The room server must also be deployed to an HTTPS Node host before create/join works on Pages.**

1. Deploy this repository as a Node web service with start command `npm start`. The service uses the host's `PORT` environment variable. A single server instance is required because rooms are stored in memory.
2. Either use that server's URL directly (it serves the complete game), or set `API_BASE` in `config.js` to its HTTPS URL, for example `https://your-room-server.example`. This is a public URL, not a secret.
3. Optionally set `ALLOWED_ORIGIN` on the server to your frontend origin (for example `https://your-account.github.io`). Without this variable it accepts cross-origin requests from any origin; seat tokens still authorize private game state and moves.
4. Push to `main`, then select GitHub Actions in repository Settings → Pages. The included workflow publishes only public frontend assets.

Rooms expire after six hours without requests. Server restart or redeploy clears all rooms. Leaving a room discards your local seat token; create a new room for a rematch. This prototype does not include accounts, persistent games or rated matchmaking.

## Discord

Application ID: `1570830769889214594`.

For an Activity, map `/` to your frontend and `/api` to the room server with the backend's `/api` path preserved. With both served under Discord's proxy origin, `API_BASE` can stay empty. Configure mappings and enable Activities in the Developer Portal, then test create/join from two Discord clients. Discord SDK identity/authentication integration is still pending; these rooms currently use independent seat tokens. Never put a Discord client secret in frontend files.

## Verify

```powershell
npm test
```

Tests cover room creation, seat assignment, third-player rejection, private state, turn enforcement, illegal moves, stale moves and two-player synchronization. Browser QA still needs to be performed in a browser-capable environment.

## Credits

Chess rules: chess.js, BSD-2-Clause (`vendor/CHESS-LICENSE.txt`). The SVG pieces were drawn for this project to follow the supplied board reference. The board and pieces are inspired by the reference; this app is not affiliated with Chess.com.
