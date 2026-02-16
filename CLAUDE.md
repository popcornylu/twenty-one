# 21點 Blackjack - AI Context

## Project Overview
Single-page multiplayer Blackjack game in Traditional Chinese. Pure HTML/CSS/JS, no build tools or frameworks. Deployed via GitHub Pages.

## File Structure
```
index.html          - Setup screen, game screen, pause overlay
css/style.css       - Casino theme, responsive layout, card styles, animations
js/game.js          - Core game logic, deck, scoring, state management
js/main.js          - Entry point, event binding, game flow orchestration
js/ui.js            - DOM rendering, seat positioning, screen management
js/ai.js            - AI decision engine for computer players and dealer
.github/workflows/deploy.yml - GitHub Pages deployment
```

## Architecture
- **Game.js** exposes `Game` module (IIFE) with state + pure functions
- **UI.js** exposes `UI` module (IIFE) for rendering; rebuilds DOM each render call
- **main.js** is the orchestrator: binds events, manages async game flow with `await`
- **AI.js** exposes `AI` module with decision functions
- No module bundler; scripts loaded via `<script>` tags in order

## Game State (`Game.state`)
- `phase`: 'setup' | 'betting' | 'dealing' | 'playerTurn' | 'dealerTurn' | 'results'
- `deck`: Card[] - remaining cards, auto-reshuffles when < 15 cards
- `players`: Player[] - all players + dealer (dealer always last)
- `dealerIndex`, `humanIndices`, `currentPlayerIndex`, `currentBettingIndex`
- `round`, `gameMode` ('betting'|'points'), `roundsTarget`, `startingPoints`

## Player Object
- `name`, `isHuman`, `isDealer`, `hand`: Card[]
- `chips` (betting mode, starts 1000), `score` (points mode, starts at config)
- `currentBet`, `status` ('playing'|'standing'|'bust'|'blackjack'), `result` ('win'|'lose'|'draw'|null)

## Card Object
- `suit` ('spades'|'hearts'|'diamonds'|'clubs'), `rank` ('A','2'-'10','J','Q','K'), `faceUp` boolean
- Values: A=11 (reduces to 1 if bust), J/Q/K=10, others=face value

## Game Modes
- **Betting (下注模式)**: Players start with 1000 chips, bet each round (10/25/50/100). Win pays 1:1, blackjack pays 1.5:1. Game over when all humans bust or rounds exhausted.
- **Points (點數模式)**: Win=+1, Lose=-1, Draw=+0.5. No betting UI. Game over when rounds exhausted.

## Setup Configuration
- Player count: 2-6 (P1 always human, others toggleable human/computer)
- Game mode: betting or points
- Round count: 5, 10, or 15
- Starting points: 1-5 (points mode only, hidden in betting mode)

## Seat Positioning System (ui.js)
- `SEAT_LAYOUTS` maps player count (2-6) to array of `{x, y, r}` positions
- x/y are percentages, r is rotation in degrees
- Applied via CSS custom properties: `--seat-x`, `--seat-y`, `--seat-rotation`
- CSS uses `translate(-50%, -50%) rotate(var(--seat-rotation))` for centering
- Mobile (<768px): Falls back to static vertical layout

## AI Logic (ai.js)
- **Dealer**: Hit on <=16, stand on >=17 (deterministic)
- **Computer players**: Basic strategy with randomness based on dealer's up card
  - Weak dealer (2-6): Conservative (mostly stand 13+)
  - Strong dealer (7+): Aggressive (mostly hit <=18)
  - Soft hands: 30% chance to hit on 17-18
- **Betting**: Random selection from affordable chip amounts [10, 25, 50, 100]

## Pause System
- `waitIfPaused()` returns a Promise; blocks at 6 points during gameplay
- Resume resolves the promise; pause overlay has Resume/Restart/Quit buttons

## Game Flow
1. Setup screen -> `Game.initGame(config)` -> `startNewRound()`
2. Round: betting (if betting mode) -> dealing (2 cards each, animated) -> check blackjacks -> player turns -> dealer turn -> results
3. Results show badges with score/chip changes; "下一局" or "結束遊戲" buttons
4. Game over when rounds exhausted or all humans out of chips (betting mode)

## CSS Theme
- Casino green felt background (radial gradient)
- CSS variables for colors, card dimensions
- Card animations: deal-card (0.35s), flip-out/flip-in (0.25s), pulse-glow (active player)
- Responsive: mobile (<768px), tablet (768-1023px), desktop (1024+px)

## Key Patterns
- Event delegation on `#dealer-area` for dynamic round-action buttons
- All human bets collected via `Promise.all()` (simultaneous betting)
- DOM fully rebuilt on each `renderGameScreen()` call
- `Game` module uses closure for private state; exposes via return object
