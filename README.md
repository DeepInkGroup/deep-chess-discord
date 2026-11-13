# Deep Chess for Discord

A friendly local two-player chess board with legal moves, castling, en passant, promotion, check and draw detection. Flip the board, undo moves, and start a new game. Built as a static site, with all assets hosted locally.

## Current scope

Players take turns on one device. Discord Activity instances do **not** share game state yet: a multiplayer service and Discord Embedded App SDK integration are still required for people on separate devices to play together. Do not treat this as a finished online multiplayer Activity.

## Run locally

Serve the directory over HTTP, for example `npx serve .` or `python -m http.server 8000`, and open the local URL. The chess rules library is vendored, so deployment needs no build step.

## Publish to GitHub Pages

Push this repository to GitHub on the `main` branch. In repository Settings → Pages, select **GitHub Actions** as the source. The included workflow publishes on each push to main. Wait for the workflow and use its published URL.

## Discord setup

Application ID: `1570830769889214594`. In the Discord Developer Portal, open this application and configure Activities → URL Mappings for the GitHub Pages host and repository path, following Discord's current URL mapping instructions. Enable Activities after adding the mapping. The deployed site needs to be verified within Discord; SDK integration and shared multiplayer remain future work. Never put a Discord client secret in this static site.

## Credits

Chess rules: chess.js, BSD-2-Clause (see `vendor/CHESS-LICENSE.txt`). Pieces: bundled SVG set, Apache-2.0 (see `assets/pieces/LICENSE.txt`).
