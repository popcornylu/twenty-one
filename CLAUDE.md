# 21點 Blackjack - AI Context

## Project Overview
Single-page multiplayer Blackjack game in Traditional Chinese. Pure HTML/CSS/JS, no build tools or frameworks. Deployed via GitHub Pages.

## File Structure
```
index.html          - Setup screen, game screen, pause/announcement/ranking overlays
css/style.css       - Casino theme, responsive layout, card styles, animations
js/game.js          - Core game logic, deck, scoring, state management
js/main.js          - Entry point, event binding, game flow orchestration
js/ui.js            - DOM rendering, seat positioning, overlays, screen management
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
- `round`, `gameMode` ('betting'|'points'), `roundsTarget`, `startingPoints`, `startingChips`
- `dealerSkipped`: boolean - true when all players bust (dealer skips play)

## Player Object
- `name`, `isHuman`, `isDealer`, `hand`: Card[]
- `chips` (betting mode, starts at user-configured value), `score` (points mode, starts at config)
- `currentBet`, `status` ('playing'|'standing'|'bust'|'blackjack'), `result` ('win'|'lose'|'draw'|null)

## Card Object
- `suit` ('spades'|'hearts'|'diamonds'|'clubs'), `rank` ('A','2'-'10','J','Q','K'), `faceUp` boolean
- Values: A=11 (reduces to 1 if bust), J/Q/K=10, others=face value

## Game Modes
- **Betting (下注模式)**: Players start with user-configured chips (100-1000, multiples of 100), bet each round (10/25/50/100). Win pays 1:1, blackjack pays 1.5:1. Game over when all humans bust or rounds exhausted.
- **Points (點數模式)**: Win=+1, Lose=-1, Draw=+0.5. No betting UI. Game over when rounds exhausted.

## Setup Configuration
- Player count: 2-6 (P1 always human, others toggleable human/computer)
- Game mode: betting or points
- Round count: 5, 10, or 15
- Starting chips: 100-1000 in multiples of 100 (betting mode only, via virtual numpad)
- Starting points: 1-5 (points mode only, hidden in betting mode)

## Seat Positioning System (ui.js)
- `SEAT_LAYOUTS` maps player count (2-6) to array of `{x, y, r}` positions
- x/y are percentages, r is rotation in degrees
- Applied via CSS custom properties: `--seat-x`, `--seat-y`, `--seat-rotation`
- CSS uses `translate(-50%, -50%) rotate(var(--seat-rotation))` for centering
- Mobile (<768px): Falls back to static vertical layout

## Starting Chips Numpad (main.js)
- Virtual numpad in setup screen for betting mode; hidden in points mode
- Display: 4 slots — up to 2 digit boxes (gold border) + fixed "00" suffix (gray)
- Numpad: 2 rows of 5 buttons (1-5, 6-0), buttons enable/disable based on input state
- Input logic: empty→1-9 enabled; after "1"→only 0 enabled (for 1000); after 2-9 or 10→all disabled
- Action buttons: 清除 (disabled when empty) / 確定 (disabled when empty)
- After confirming: numpad + actions fade out (`.chips-confirmed`), 開始遊戲 enables
- `startingChips` passed to `Game.initGame()`, falls back to 1000 if not provided
- State: `chipsDigits[]`, `chipsConfirmed`, `selectedStartingChips`

## Layout Toggle
- Button in top-right of game screen toggles upright (default) vs edge-facing card rotation
- `UI.layoutEdge` boolean, persisted in `localStorage('layoutEdge')`
- Calls `UI.renderGameScreen()` on toggle; hidden on mobile

## AI Logic (ai.js)
- **Dealer**: Hit on <=16, stand on >=17 (deterministic)
- **Computer players**: Basic strategy with randomness based on dealer's up card
  - Weak dealer (2-6): Conservative (mostly stand 13+)
  - Strong dealer (7+): Aggressive (mostly hit <=18)
  - Soft hands: 30% chance to hit on 17-18
- **Betting**: Random selection from affordable chip amounts [10, 25, 50, 100]
- **Decision bubbles**: White speech bubble shown above AI player area for 800ms ("要牌" green / "停牌" red)

## Pause System
- `waitIfPaused()` returns a Promise; blocks at 4 points during gameplay: before card deal, before AI decision, before dealer flip, before dealer hit
- Resume resolves the promise; pause overlay has Resume/Restart/Quit buttons

## Announcement Overlay
- `UI.showAnnouncement(text, duration)` returns a Promise; shows large gold text with pop animation
- Used for: "遊戲開始", "回合 X", "最終回合", "遊戲結束"
- Full-screen semi-transparent backdrop, non-interactive (pointer-events: none)

## Ranking Overlay
- `UI.showRanking(players, gameMode)` shown on game over after "遊戲結束" announcement
- Players sorted by chips (betting) or score (points), dealer excluded
- **Tied ranks**: players with same value share the same rank number (e.g. two 1st, then 3rd)
- Top 3 get trophy emojis (🥇🥈🥉) + ordinal labels (1st/2nd/3rd); 4th+ get ordinal only
- Human player rows have gold border (`.human-row`); 4th+ rows dimmed (`.ranking-dim`, opacity 0.5)
- Rank colors: 1st gold, 2nd silver, 3rd bronze
- Actions: "再玩一次" (restart) and "離開遊戲" (quit to setup)

## Game Flow
1. Setup screen -> `Game.initGame(config)` -> announcement "遊戲開始" -> `startNewRound()`
2. Round: announcement "回合 X" (or "最終回合") -> betting (if betting mode) -> dealing (2 cards each, animated) -> check blackjacks -> player turns -> dealer turn -> results
3. Results show badges with score/chip changes; auto-next countdown "下一回合 (5)" counts down 5s
4. Game over: announcement "遊戲結束" -> ranking overlay with "再玩一次" / "離開遊戲"
5. If all players bust, dealer skips play (`dealerSkipped = true`, hidden card stays hidden)

## CSS Theme
- Casino green felt background (radial gradient)
- CSS variables for colors, card dimensions
- Card animations: deal-card (0.35s), flip-out/flip-in (0.25s), pulse-glow (active player)
- Responsive: mobile (<768px), tablet (768-1023px), desktop (1024+px)

## Key Patterns
- Event delegation on `#game-screen` for hit/stand buttons (survives layout toggle re-renders)
- Event delegation on `#dealer-area` for round-action buttons
- All human bets collected via `Promise.all()` (simultaneous betting)
- DOM fully rebuilt on each `renderGameScreen()` call
- `Game` module uses closure for private state; exposes via return object
