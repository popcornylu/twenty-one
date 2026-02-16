# ♠ 21點 Blackjack ♥

A multiplayer Blackjack (21點) game with a casino-themed UI, built with vanilla HTML, CSS, and JavaScript. Supports 2-6 players with human and AI opponents.

## Features

- **Two Game Modes**
  - **Betting Mode (下注模式)**: Classic chip-based gameplay. Each player starts with 1000 chips and places bets each round.
  - **Points Mode (點數模式)**: Score-based gameplay. Win = +1, Lose = -1, Draw = +0.5.
- **2-6 Players**: First player is always human; others can be toggled between human and computer.
- **AI Opponents**: Computer players use basic strategy with randomness, adapting to the dealer's visible card.
- **Configurable Rounds**: Choose 5, 10, or 15 rounds per game.
- **Pause System**: Pause and resume at any time, with options to restart or quit.
- **Responsive Design**: Plays on desktop, tablet, and mobile.
- **Dynamic Seat Positioning**: Players are arranged around the table based on player count, with rotation for side/top seats.
- **Card Animations**: Smooth dealing and card-flip animations.
- **Traditional Chinese UI**: All text in Traditional Chinese (繁體中文).

## Getting Started

### Play Online

The game is deployed via GitHub Pages. Simply open the deployed URL in a browser.

### Run Locally

No build step required. Serve the project with any static file server:

```bash
# Using Python
python -m http.server 7253

# Using Node.js (npx)
npx serve -l 7253 .
```

Then open `http://localhost:7253` in your browser.

## How to Play

1. **Setup**: Choose the number of players (2-6), configure each as human or computer, select game mode and round count.
2. **Betting** (betting mode only): Place your bet using chip buttons (10, 25, 50, 100). Click "確認下注" to confirm.
3. **Play**: On your turn, choose "要牌" (Hit) to draw a card or "停牌" (Stand) to hold.
4. **Results**: After all players and the dealer finish, results are shown with score/chip changes.
5. **Next Round**: Click "下一局" to continue or "結束遊戲" to end early.

### Rules

- Cards 2-10 are worth face value. J, Q, K = 10. Ace = 11 (reduced to 1 if hand exceeds 21).
- **Blackjack**: An Ace + 10-value card on the initial deal. Pays 1.5x in betting mode.
- **Bust**: Going over 21 is an automatic loss.
- **Dealer**: Must hit on 16 or below, stands on 17 or above.

## Project Structure

```
├── index.html              Main HTML (setup screen, game screen, pause overlay)
├── css/
│   └── style.css           Casino theme, responsive layout, animations
├── js/
│   ├── game.js             Core game logic, deck management, scoring
│   ├── main.js             Game flow orchestration, event handling
│   ├── ui.js               DOM rendering, seat positioning
│   └── ai.js               AI decision engine
└── .github/
    └── workflows/
        └── deploy.yml      GitHub Pages deployment
```

## Architecture

- **No frameworks or build tools** — pure vanilla JS with IIFE modules (`Game`, `UI`, `AI`).
- **Single-page app**: Screens toggled via CSS classes.
- **Async game flow**: Uses `async/await` and Promises for sequential player turns and simultaneous human betting.
- **Dynamic seat positioning**: CSS custom properties (`--seat-x`, `--seat-y`, `--seat-rotation`) controlled by JS, with predefined layouts for 2-6 players.

## License

MIT
