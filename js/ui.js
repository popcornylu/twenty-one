/* ui.js — DOM rendering and screen updates */

const UI = (() => {
  /* ---------- helpers ---------- */

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  /* ---------- seat assignment ---------- */

  const SEAT_MAP = {
    1: ['bottom'],
    2: ['bottom', 'top'],
    3: ['bottom', 'left', 'top'],
    4: ['bottom', 'left', 'top', 'right'],
    5: ['bottom', 'bot-left', 'left', 'top', 'right'],
    6: ['bottom', 'bot-left', 'left', 'top', 'right', 'bot-right']
  };

  function getSeatForPlayer(playerIndex, totalActivePlayers) {
    const seats = SEAT_MAP[totalActivePlayers] || SEAT_MAP[6];
    return seats[playerIndex] || 'bottom';
  }

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#' + id);
    if (el) el.classList.add('active');
  }

  function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  /* ---------- card rendering ---------- */

  function createCardEl(card, animate) {
    const el = document.createElement('div');
    el.className = 'card';

    if (!card.faceUp) {
      el.classList.add('card-back');
      if (animate) el.classList.add('deal-anim');
      return el;
    }

    el.classList.add('card-front');
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    if (isRed) el.classList.add('red');

    const sym = Game.SUIT_SYMBOLS[card.suit];

    el.innerHTML =
      '<span class="card-corner top-left"><span class="card-rank">' + card.rank + '</span><span class="card-suit-small">' + sym + '</span></span>' +
      '<span class="card-center">' + sym + '</span>' +
      '<span class="card-corner bottom-right"><span class="card-rank">' + card.rank + '</span><span class="card-suit-small">' + sym + '</span></span>';

    if (animate) el.classList.add('deal-anim');
    return el;
  }

  /* ---------- score badge ---------- */

  function scoreHTML(player, showAll) {
    const hand = player.hand;
    if (hand.length === 0) return '';

    const score = showAll
      ? Game.calculateScore(hand)
      : Game.calculateVisibleScore(hand);

    const allVisible = hand.every(c => c.faceUp);
    let cls = 'score-normal';
    let extra = '';

    if (player.status === 'bust') {
      cls = 'score-bust';
    } else if (score === 21 && allVisible) {
      cls = 'score-21';
      if (hand.length === 2) extra = ' 21\u9ede\u4e86!';
    } else if (score > 21) {
      cls = 'score-bust';
    }

    let text = score;
    if (!allVisible && !showAll) text = score + ' + ?';

    return '<span class="score-badge ' + cls + '">' + text + extra + '</span>';
  }

  /* ---------- player status badge ---------- */

  function statusBadge(player) {
    if (player.status === 'bust') return '<span class="status-badge status-lose">Lose</span>';
    if (player.status === 'blackjack') return '<span class="status-badge status-bj">Blackjack!</span>';
    return '';
  }

  /* ---------- game screen rendering ---------- */

  function renderGameScreen() {
    renderDealerArea();
    renderPlayersArea();
  }

  function renderDealerArea() {
    const state = Game.state;
    const dealer = state.players[state.dealerIndex];
    const area = $('#dealer-area');
    const nameEl = area.querySelector('.player-name');
    const scoreEl = area.querySelector('.player-score');
    const handEl = area.querySelector('.hand');
    const deckCountEl = area.querySelector('.deck-count');

    nameEl.textContent = dealer.name;
    const showAll = state.phase === 'dealerTurn' || state.phase === 'results';
    scoreEl.innerHTML = scoreHTML(dealer, showAll);
    scoreEl.innerHTML += ' ' + statusBadge(dealer);

    if (deckCountEl) {
      deckCountEl.textContent = '牌堆: ' + state.deck.length;
    }

    handEl.innerHTML = '';
    dealer.hand.forEach(card => {
      handEl.appendChild(createCardEl(card, false));
    });

    // Remove old round-actions if present
    const oldActions = area.querySelector('.round-actions');
    if (oldActions) oldActions.remove();

    // Show round action buttons during results phase
    if (state.phase === 'results') {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'round-actions';
      if (Game.isGameOver()) {
        actionsDiv.innerHTML =
          '<button class="primary-btn round-end-btn">重新開始</button>';
      } else {
        actionsDiv.innerHTML =
          '<button class="primary-btn round-next-btn">下一局</button>' +
          '<button class="secondary-btn round-end-btn">結束遊戲</button>';
      }
      area.appendChild(actionsDiv);
    }

    area.classList.toggle('active-player',
      state.phase === 'dealerTurn' && state.currentPlayerIndex === state.dealerIndex);
  }

  function renderPlayersArea() {
    const state = Game.state;
    const container = $('#players-area');
    container.innerHTML = '';

    // Collect active (visible) non-dealer players for seat assignment
    const activePlayers = [];
    for (let i = 0; i < state.players.length; i++) {
      const p = state.players[i];
      if (p.isDealer) continue;
      if (p.chips <= 0 && p.hand.length === 0) continue;
      activePlayers.push(i);
    }

    for (let seatIdx = 0; seatIdx < activePlayers.length; seatIdx++) {
      const i = activePlayers[seatIdx];
      const p = state.players[i];

      const div = document.createElement('div');
      div.className = 'player-area';
      div.dataset.playerIndex = i;
      div.dataset.seat = getSeatForPlayer(seatIdx, activePlayers.length);

      if (p.isHuman) {
        div.classList.add('human-player-area');
      } else {
        div.classList.add('ai-player-area');
      }

      // Active player glow
      if (state.phase === 'playerTurn' && state.currentPlayerIndex === i) {
        div.classList.add('active-player');
      }
      if (state.phase === 'betting' && p.isHuman && p.currentBet === 0 && p.chips > 0) {
        div.classList.add('active-player');
      }

      // Player info + meta
      let html =
        '<div class="player-info">' +
          '<span class="player-name">' + p.name + '</span>' +
          scoreHTML(p, true) +
          ' ' + statusBadge(p) +
        '</div>' +
        '<div class="player-meta">' +
          '<span class="player-chips">\uD83C\uDFB0 ' + p.chips + '</span>' +
          '<span class="player-bet">下注: ' + p.currentBet + '</span>' +
        '</div>' +
        '<div class="hand"></div>';

      // Inline betting UI (human, betting phase, not yet confirmed)
      if (state.phase === 'betting' && p.isHuman && p.currentBet === 0 && p.chips > 0) {
        html +=
          '<div class="inline-betting">' +
            '<div class="inline-bet-display">下注: <span class="inline-bet-value">0</span></div>' +
            '<div class="inline-chip-buttons">' +
              '<button class="chip-btn chip-10 inline-chip-btn" data-amount="10">10</button>' +
              '<button class="chip-btn chip-25 inline-chip-btn" data-amount="25">25</button>' +
              '<button class="chip-btn chip-50 inline-chip-btn" data-amount="50">50</button>' +
              '<button class="chip-btn chip-100 inline-chip-btn" data-amount="100">100</button>' +
            '</div>' +
            '<div class="inline-betting-actions">' +
              '<button class="secondary-btn inline-clear-btn">清除</button>' +
              '<button class="primary-btn inline-confirm-btn">確認下注</button>' +
            '</div>' +
          '</div>';
      }

      // Inline action buttons (human, player turn, current turn)
      if (state.phase === 'playerTurn' && state.currentPlayerIndex === i && p.isHuman) {
        html +=
          '<div class="inline-actions">' +
            '<button class="action-btn hit-btn inline-hit-btn">要牌</button>' +
            '<button class="action-btn stand-btn inline-stand-btn">停牌</button>' +
          '</div>';
      }

      // Inline result display
      if (state.phase === 'results' && p.result) {
        let resultCls, resultText, chipsHtml = '';
        if (p.result === 'win') {
          resultCls = 'inline-result-win';
          resultText = 'Win!';
          const payout = p.status === 'blackjack'
            ? Math.floor(p.currentBet * 1.5)
            : p.currentBet;
          chipsHtml = ' <span class="inline-result-chips inline-result-win">+' + payout + '</span>';
        } else if (p.result === 'lose') {
          resultCls = 'inline-result-lose';
          resultText = 'Lose!';
          chipsHtml = ' <span class="inline-result-chips inline-result-lose">-' + p.currentBet + '</span>';
        } else {
          resultCls = 'inline-result-draw';
          resultText = 'Draw!';
        }
        html +=
          '<div class="inline-result">' +
            '<span class="inline-result-text ' + resultCls + '">' + resultText + '</span>' +
            chipsHtml +
          '</div>';
      }

      div.innerHTML = html;

      // Render cards
      const handEl = div.querySelector('.hand');
      p.hand.forEach(card => {
        handEl.appendChild(createCardEl(card, false));
      });

      container.appendChild(div);
    }
  }

  /* ---------- deal single card with animation ---------- */

  async function animateDealCard(playerIndex) {
    const state = Game.state;
    const player = state.players[playerIndex];
    const card = player.hand[player.hand.length - 1];

    let area;
    if (player.isDealer) {
      area = $('#dealer-area');
    } else {
      area = $('[data-player-index="' + playerIndex + '"]');
    }

    if (!area) return;
    const handEl = area.querySelector('.hand');
    const cardEl = createCardEl(card, true);
    handEl.appendChild(cardEl);
    renderScoreFor(playerIndex);

    // Update deck count
    const deckCountEl = $('#dealer-area .deck-count');
    if (deckCountEl) {
      deckCountEl.textContent = '牌堆: ' + Game.state.deck.length;
    }

    await delay(250);
  }

  function renderScoreFor(playerIndex) {
    const state = Game.state;
    const player = state.players[playerIndex];

    if (player.isDealer) {
      const scoreEl = $('#dealer-area .player-score');
      const showAll = state.phase === 'dealerTurn' || state.phase === 'results';
      scoreEl.innerHTML = scoreHTML(player, showAll) + ' ' + statusBadge(player);
    } else {
      const area = $('[data-player-index="' + playerIndex + '"]');
      if (area) {
        const info = area.querySelector('.player-info');
        info.innerHTML =
          '<span class="player-name">' + player.name + '</span>' +
          scoreHTML(player, true) +
          ' ' + statusBadge(player);
      }
    }
  }

  /* ---------- dealer flip animation ---------- */

  async function animateDealerFlip() {
    const dealer = Game.state.players[Game.state.dealerIndex];
    const handEl = $('#dealer-area .hand');
    const hiddenCard = dealer.hand.find(c => !c.faceUp);
    if (!hiddenCard) return;

    const backCard = handEl.querySelector('.card-back');
    if (backCard) {
      backCard.classList.add('flip-anim');
      await delay(300);
      Game.revealDealerCard();
      const newCard = createCardEl(hiddenCard, false);
      newCard.classList.add('flip-anim-in');
      backCard.replaceWith(newCard);
      await delay(300);
    } else {
      Game.revealDealerCard();
    }

    renderScoreFor(Game.state.dealerIndex);
  }

  /* ---------- results (inline, no overlay) ---------- */

  function showResults() {
    renderGameScreen();
  }

  function hideResults() {
    // no-op: inline results are cleared on next renderGameScreen
  }

  /* ---------- highlight current player ---------- */

  function setActivePlayer(playerIndex) {
    $$('.player-area').forEach(a => a.classList.remove('active-player'));
    if (playerIndex < 0) return;

    const state = Game.state;
    const player = state.players[playerIndex];

    if (player.isDealer) {
      $('#dealer-area').classList.add('active-player');
    } else {
      const area = $('[data-player-index="' + playerIndex + '"]');
      if (area) area.classList.add('active-player');
    }
  }

  return {
    showScreen,
    createCardEl,
    renderGameScreen,
    renderDealerArea,
    renderPlayersArea,
    renderScoreFor,
    animateDealCard,
    animateDealerFlip,
    showResults,
    hideResults,
    setActivePlayer,
    delay
  };
})();
