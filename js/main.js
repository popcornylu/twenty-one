/* main.js — Entry point, event binding, game flow control */

(function () {
  'use strict';

  /* ---------- DOM refs ---------- */
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  let selectedCount = 1;
  let playerConfigs = [{ type: 'human' }];

  /* ============================
     Pause System
     ============================ */

  let paused = false;
  let pauseResolve = null;

  function waitIfPaused() {
    if (!paused) return Promise.resolve();
    return new Promise(resolve => {
      pauseResolve = resolve;
    });
  }

  function pauseGame() {
    if (Game.state && Game.state.phase === 'results') return;
    paused = true;
    $('#pause-overlay').classList.remove('hidden');
  }

  function resumeGame() {
    paused = false;
    $('#pause-overlay').classList.add('hidden');
    if (pauseResolve) {
      const r = pauseResolve;
      pauseResolve = null;
      r();
    }
  }

  function restartGame() {
    paused = false;
    $('#pause-overlay').classList.add('hidden');
    pauseResolve = null;
    Game.initGame(playerConfigs);
    startNewRound();
  }

  function quitGame() {
    paused = false;
    $('#pause-overlay').classList.add('hidden');
    pauseResolve = null;
    UI.hideResults();
    UI.showScreen('setup-screen');
  }

  // Bind pause buttons
  $('#pause-btn').addEventListener('click', pauseGame);
  $('#resume-btn').addEventListener('click', resumeGame);
  $('#restart-btn').addEventListener('click', restartGame);
  $('#quit-btn').addEventListener('click', quitGame);

  /* ============================
     Setup Screen
     ============================ */

  function buildPlayerConfigUI() {
    const list = $('#player-config-list');
    list.innerHTML = '';
    playerConfigs = [];

    for (let i = 0; i < selectedCount; i++) {
      const isFirst = i === 0;
      const config = { type: isFirst ? 'human' : 'computer' };
      playerConfigs.push(config);

      const row = document.createElement('div');
      row.className = 'player-config-row';

      if (isFirst) {
        row.innerHTML =
          '<span class="config-label">P' + (i + 1) + '</span>' +
          '<span class="config-type-fixed">玩家 (固定)</span>';
      } else {
        row.innerHTML =
          '<span class="config-label">P' + (i + 1) + '</span>' +
          '<div class="config-toggle">' +
            '<button class="toggle-btn" data-config-index="' + i + '" data-type="human">玩家</button>' +
            '<button class="toggle-btn active" data-config-index="' + i + '" data-type="computer">電腦</button>' +
          '</div>';
      }

      list.appendChild(row);
    }

    // Bind config toggle buttons
    list.querySelectorAll('.config-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.configIndex);
        const type = btn.dataset.type;
        playerConfigs[idx].type = type;
        const toggle = btn.closest('.config-toggle');
        toggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  // Player count toggle (1-6)
  $$('#player-count-group .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('#player-count-group .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCount = parseInt(btn.dataset.count);
      buildPlayerConfigUI();
    });
  });

  // Initial build
  buildPlayerConfigUI();

  // Start game
  $('#start-btn').addEventListener('click', () => {
    Game.initGame(playerConfigs);
    startNewRound();
  });

  /* ============================
     Betting Phase
     ============================ */

  async function startNewRound() {
    Game.startRound();
    const state = Game.state;

    UI.showScreen('game-screen');

    // Computer players bet immediately
    for (const p of state.players) {
      if (p.isDealer || p.chips <= 0 || p.isHuman) continue;
      p.currentBet = AI.generateBet(p.chips);
    }

    UI.renderGameScreen();

    // All human players bet simultaneously
    const humanBetPromises = [];
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      if (p.isDealer || p.chips <= 0 || !p.isHuman) continue;
      humanBetPromises.push(humanBet(i));
    }

    if (humanBetPromises.length > 0) {
      await Promise.all(humanBetPromises);
    }

    state.currentBettingIndex = -1;
    startDealing();
  }

  function humanBet(playerIndex) {
    return new Promise(resolve => {
      const player = Game.state.players[playerIndex];
      let betAmount = 0;

      const area = document.querySelector('[data-player-index="' + playerIndex + '"]');
      if (!area) return resolve();

      const betDisplay = area.querySelector('.inline-bet-value');
      const chipBtns = area.querySelectorAll('.inline-chip-btn');
      const clearBtn = area.querySelector('.inline-clear-btn');
      const confirmBtn = area.querySelector('.inline-confirm-btn');

      chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const amount = parseInt(btn.dataset.amount);
          if (betAmount + amount <= player.chips) {
            betAmount += amount;
            if (betDisplay) betDisplay.textContent = betAmount;
          }
        });
      });

      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          betAmount = 0;
          if (betDisplay) betDisplay.textContent = '0';
        });
      }

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          if (betAmount <= 0) return;
          player.currentBet = betAmount;

          // Update this player's area locally (avoid full re-render
          // which would destroy other players' in-progress betting UI)
          const bettingDiv = area.querySelector('.inline-betting');
          if (bettingDiv) bettingDiv.remove();
          const betEl = area.querySelector('.player-bet');
          if (betEl) betEl.textContent = '下注: ' + betAmount;
          area.classList.remove('active-player');

          resolve();
        });
      }
    });
  }

  /* ============================
     Dealing Phase
     ============================ */

  async function startDealing() {
    const state = Game.state;
    state.phase = 'dealing';

    UI.renderGameScreen();
    await UI.delay(300);

    // Deal 2 rounds of cards, one at a time with animation
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        if (p.chips <= 0 && !p.isDealer) continue;
        await waitIfPaused(); // Pause point 3: before each card deal
        const faceUp = !(p.isDealer && round === 1);
        p.hand.push(Game.drawCard(faceUp));
        await UI.animateDealCard(i);
      }
    }

    await UI.delay(400);

    // Check for natural blackjacks (non-dealer)
    for (let i = 0; i < state.players.length; i++) {
      if (i === state.dealerIndex) continue;
      if (state.players[i].chips <= 0) continue;
      Game.checkNaturalBlackjack(state.players[i]);
    }

    UI.renderGameScreen();
    await UI.delay(300);

    // Start player turns
    startPlayerTurns();
  }

  /* ============================
     Player Turns
     ============================ */

  async function startPlayerTurns() {
    const state = Game.state;
    state.phase = 'playerTurn';

    const turnOrder = Game.getNonDealerTurnOrder();

    for (const idx of turnOrder) {
      state.currentPlayerIndex = idx;
      const player = state.players[idx];

      if (player.status !== 'playing') continue;

      UI.setActivePlayer(idx);
      UI.renderGameScreen();

      if (player.isHuman) {
        await humanTurn(idx);
      } else {
        await aiTurn(idx);
      }
    }

    state.currentPlayerIndex = -1;
    UI.setActivePlayer(-1);

    // Move to dealer turn
    await startDealerTurn();
  }

  /* ---------- human turn ---------- */

  function humanTurn(playerIndex) {
    return new Promise(resolve => {
      function onHit() {
        const result = Game.playerHit(playerIndex);
        UI.renderGameScreen();

        if (result === 'bust' || result === 'twentyone') {
          setTimeout(resolve, 800);
          return;
        }

        // DOM was rebuilt by renderGameScreen — rebind new buttons
        rebindButtons();
      }

      function onStand() {
        Game.playerStand(playerIndex);
        UI.renderGameScreen();
        resolve();
      }

      function rebindButtons() {
        const area = document.querySelector('[data-player-index="' + playerIndex + '"]');
        if (!area) return;
        const hitBtn = area.querySelector('.inline-hit-btn');
        const standBtn = area.querySelector('.inline-stand-btn');
        if (hitBtn) hitBtn.addEventListener('click', onHit);
        if (standBtn) standBtn.addEventListener('click', onStand);
      }

      rebindButtons();
    });
  }

  /* ---------- AI turn ---------- */

  async function aiTurn(playerIndex) {
    const state = Game.state;
    const player = state.players[playerIndex];
    const dealerUpCard = Game.getDealerUpCard();

    while (player.status === 'playing') {
      await waitIfPaused(); // Pause point 4: before AI player decision
      await UI.delay(1200);

      const score = Game.calculateScore(player.hand);
      const decision = AI.playerDecision(player.hand, score, dealerUpCard);

      if (decision === 'hit') {
        const result = Game.playerHit(playerIndex);
        UI.renderGameScreen();
        if (result === 'bust' || result === 'twentyone') break;
      } else {
        Game.playerStand(playerIndex);
        UI.renderGameScreen();
        break;
      }
    }
  }

  /* ============================
     Dealer Turn
     ============================ */

  async function startDealerTurn() {
    const state = Game.state;
    state.phase = 'dealerTurn';
    state.currentPlayerIndex = state.dealerIndex;

    // If everyone bust, skip dealer play
    if (Game.allNonDealersBust()) {
      Game.revealDealerCard();
      UI.renderGameScreen();
      await UI.delay(800);
      finishRound();
      return;
    }

    // Flip dealer's hidden card
    UI.setActivePlayer(state.dealerIndex);
    await waitIfPaused(); // Pause point 5: before dealer flip
    await UI.delay(600);
    await UI.animateDealerFlip();
    await UI.delay(600);

    // Check dealer blackjack
    const dealer = state.players[state.dealerIndex];
    if (Game.checkNaturalBlackjack(dealer)) {
      UI.renderGameScreen();
      await UI.delay(800);
      finishRound();
      return;
    }

    // Dealer auto-play
    while (true) {
      const score = Game.calculateScore(dealer.hand);
      const decision = AI.dealerDecision(score);

      if (decision === 'stand') {
        dealer.status = 'standing';
        UI.renderGameScreen();
        break;
      }

      await waitIfPaused(); // Pause point 6: before dealer hit
      await UI.delay(1000);
      const result = Game.playerHit(state.dealerIndex);
      UI.renderGameScreen();

      if (result === 'bust' || result === 'twentyone') break;
    }

    await UI.delay(600);
    finishRound();
  }

  /* ============================
     Results
     ============================ */

  function finishRound() {
    Game.calculateResults();
    UI.renderGameScreen();
  }

  // Event delegation for round action buttons (rendered inside #dealer-area)
  $('#dealer-area').addEventListener('click', (e) => {
    if (e.target.classList.contains('round-next-btn')) {
      startNewRound();
    } else if (e.target.classList.contains('round-end-btn')) {
      UI.showScreen('setup-screen');
    }
  });

})();
