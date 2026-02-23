/* ui.js — DOM rendering and screen updates */

const UI = (() => {
  /* ---------- helpers ---------- */

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  /* ---------- seat assignment ---------- */

  const SEAT_LAYOUTS = {
    2: [
      { x: 50, y: 82, r: 0 },     // bottom-center
      { x: 50, y: 22, r: 180 },   // top-center
    ],
    3: [
      { x: 50, y: 82, r: 0 },     // bottom-center
      { x: 78, y: 50, r: -90 },   // right-center
      { x: 50, y: 22, r: 180 },   // top-center
    ],
    4: [
      { x: 50, y: 82, r: 0 },     // bottom-center
      { x: 78, y: 50, r: -90 },   // right-center
      { x: 50, y: 22, r: 180 },   // top-center
      { x: 22, y: 50, r: 90 },    // left-center
    ],
    5: [
      { x: 35, y: 82, r: 0 },     // bottom@35%
      { x: 65, y: 82, r: 0 },     // bottom@65%
      { x: 78, y: 50, r: -90 },   // right-center
      { x: 50, y: 22, r: 180 },   // top-center
      { x: 22, y: 50, r: 90 },    // left-center
    ],
    6: [
      { x: 35, y: 82, r: 0 },     // bottom@35%
      { x: 65, y: 82, r: 0 },     // bottom@65%
      { x: 78, y: 50, r: -90 },   // right-center
      { x: 65, y: 22, r: 180 },   // top@65%
      { x: 35, y: 22, r: 180 },   // top@35%
      { x: 22, y: 50, r: 90 },    // left-center
    ],
  };

  function getSeatPosition(seatIndex, totalPlayers) {
    const clamped = Math.max(2, Math.min(6, totalPlayers));
    const layout = SEAT_LAYOUTS[clamped];
    return layout[seatIndex] || layout[0];
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
      extra = ' 爆牌';
    } else if (score === 21 && allVisible) {
      cls = 'score-21';
      if (hand.length === 2) extra = ' \u4e8c\u5341\u4e00\u9ede!';
    } else if (score > 21) {
      cls = 'score-bust';
    }

    let text = score;
    if (!allVisible && !showAll) text = score + ' + ?';

    return '<span class="score-badge ' + cls + '">' + text + extra + '</span>';
  }

  /* ---------- result badge (row 2) ---------- */

  function resultBadge(player) {
    const state = Game.state;

    // During results phase, show result badge with score/chip change
    if (state && state.phase === 'results' && player.result && !player.isDealer) {
      if (player.result === 'win') {
        let change;
        if (state.gameMode === 'betting') {
          const payout = player.status === 'blackjack'
            ? Math.floor(player.currentBet * 1.5)
            : player.currentBet;
          change = '+' + payout;
        } else {
          change = '+1';
        }
        return '<span class="status-badge status-win">Win ' + change + '</span>';
      } else if (player.result === 'lose') {
        let change;
        if (state.gameMode === 'betting') {
          change = '-' + player.currentBet;
        } else {
          change = '-1';
        }
        return '<span class="status-badge status-lose">Lose ' + change + '</span>';
      } else {
        let change = state.gameMode === 'points' ? ' +0.5' : '';
        return '<span class="status-badge status-draw">Draw' + change + '</span>';
      }
    }

    // Bust players show Lose immediately (before results phase)
    if (player.status === 'bust' && !player.isDealer) {
      let change;
      if (state.gameMode === 'betting') {
        change = '-' + player.currentBet;
      } else {
        change = '-1';
      }
      return '<span class="status-badge status-lose">Lose ' + change + '</span>';
    }

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
    const showAll = (state.phase === 'dealerTurn' || state.phase === 'results') && !state.dealerSkipped;
    scoreEl.innerHTML = scoreHTML(dealer, showAll);

    const dealerResultEl = area.querySelector('.player-result');
    if (dealerResultEl) dealerResultEl.innerHTML = resultBadge(dealer);

    if (deckCountEl) {
      deckCountEl.textContent = '牌堆: ' + state.deck.length;
    }

    const roundCountEl = area.querySelector('.round-count');
    if (roundCountEl) {
      roundCountEl.textContent = '回合: ' + state.round + '/' + state.roundsTarget;
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
        // Ranking overlay handles game-over; no button needed here
      } else {
        actionsDiv.innerHTML =
          '<button class="primary-btn round-next-btn">下一回合</button>';
      }
      if (actionsDiv.innerHTML.trim()) area.appendChild(actionsDiv);
    }

    area.classList.toggle('active-player',
      state.phase === 'dealerTurn' && state.currentPlayerIndex === state.dealerIndex);
    area.classList.toggle('player-bust', dealer.status === 'bust');
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
      if (state.gameMode === 'betting' && p.chips <= 0 && p.hand.length === 0) continue;
      activePlayers.push(i);
    }

    for (let seatIdx = 0; seatIdx < activePlayers.length; seatIdx++) {
      const i = activePlayers[seatIdx];
      const p = state.players[i];

      const div = document.createElement('div');
      div.className = 'player-area';
      div.dataset.playerIndex = i;
      div.dataset.seat = 'player';
      const seat = getSeatPosition(seatIdx, activePlayers.length);
      div.style.setProperty('--seat-x', seat.x + '%');
      div.style.setProperty('--seat-y', seat.y + '%');
      const rotation = UI.layoutEdge ? seat.r : 0;
      div.style.setProperty('--seat-rotation', rotation + 'deg');

      if (p.isHuman) {
        div.classList.add('human-player-area');
      } else {
        div.classList.add('ai-player-area');
      }
      if (p.status === 'bust') {
        div.classList.add('player-bust');
      }

      // Active player glow
      if (state.phase === 'playerTurn' && state.currentPlayerIndex === i) {
        div.classList.add('active-player');
      }
      if (state.gameMode === 'betting' && state.phase === 'betting' && p.isHuman && p.currentBet === 0 && p.chips > 0) {
        div.classList.add('active-player');
      }

      // Player info + meta
      let metaHtml;
      if (state.gameMode === 'betting') {
        metaHtml =
          '<span class="player-chips">\uD83C\uDFB0 ' + p.chips + '</span>' +
          '<span class="player-bet">下注: ' + p.currentBet + '</span>';
      } else {
        metaHtml = '<span class="player-points">\uD83D\uDCCA 分數: ' + p.score + '</span>';
      }

      let html =
        '<div class="player-info">' +
          '<span class="player-name">' + p.name + '</span>' +
          scoreHTML(p, true) +
        '</div>' +
        '<div class="player-result">' + resultBadge(p) + '</div>' +
        '<div class="player-meta">' + metaHtml + '</div>' +
        '<div class="hand"></div>';

      // Inline betting UI (human, betting phase, not yet confirmed)
      if (state.gameMode === 'betting' && state.phase === 'betting' && p.isHuman && p.currentBet === 0 && p.chips > 0) {
        html +=
          '<div class="inline-betting">' +
            '<div class="inline-bet-display">下注: <span class="inline-bet-value">0</span></div>' +
            '<div class="inline-steppers">' +
              '<div class="stepper">' +
                '<button class="stepper-btn stepper-minus" data-step="1"><</button>' +
                '<span class="stepper-chip chip-btn chip-10">1</span>' +
                '<button class="stepper-btn stepper-plus" data-step="1">></button>' +
              '</div>' +
              '<div class="stepper">' +
                '<button class="stepper-btn stepper-minus" data-step="10"><</button>' +
                '<span class="stepper-chip chip-btn chip-25">10</span>' +
                '<button class="stepper-btn stepper-plus" data-step="10">></button>' +
              '</div>' +
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
      const showAll = (state.phase === 'dealerTurn' || state.phase === 'results') && !state.dealerSkipped;
      scoreEl.innerHTML = scoreHTML(player, showAll);
      const resultEl = $('#dealer-area .player-result');
      if (resultEl) {
        const newResult = resultBadge(player);
        if (resultEl.innerHTML !== newResult) resultEl.innerHTML = newResult;
      }
    } else {
      const area = $('[data-player-index="' + playerIndex + '"]');
      if (area) {
        const info = area.querySelector('.player-info');
        info.innerHTML =
          '<span class="player-name">' + player.name + '</span>' +
          scoreHTML(player, true);
        const resultEl = area.querySelector('.player-result');
        if (resultEl) {
          const newResult = resultBadge(player);
          if (resultEl.innerHTML !== newResult) resultEl.innerHTML = newResult;
        }
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

  /* ---------- phase announcements ---------- */

  function showAnnouncement(text, duration) {
    duration = duration || 1500;
    var holdTime = duration - 400;
    if (holdTime < 200) holdTime = 200;

    return new Promise(function (resolve) {
      var overlay = $('#announcement-overlay');
      var textEl = overlay.querySelector('.announcement-text');

      // Reset state
      overlay.classList.remove('fading');
      textEl.textContent = text;

      // Force reflow to restart animation
      textEl.offsetWidth;

      overlay.classList.remove('hidden');

      setTimeout(function () {
        overlay.classList.add('fading');
        setTimeout(function () {
          overlay.classList.add('hidden');
          overlay.classList.remove('fading');
          resolve();
        }, 400);
      }, holdTime);
    });
  }

  /* ---------- ranking overlay ---------- */

  function showRanking(players, gameMode) {
    var list = $('#ranking-list');
    list.innerHTML = '';

    // Filter out dealer, sort by chips or score descending
    var sorted = players
      .filter(function (p) { return !p.isDealer; })
      .slice()
      .sort(function (a, b) {
        if (gameMode === 'betting') return b.chips - a.chips;
        return b.score - a.score;
      });

    var rankColors = ['rank-1', 'rank-2', 'rank-3'];
    var ordinals = ['1st', '2nd', '3rd'];
    var trophies = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];

    function getOrdinal(n) {
      if (n <= 3) return ordinals[n - 1];
      return n + 'th';
    }

    function getValue(p) {
      return gameMode === 'betting' ? p.chips : p.score;
    }

    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      // Tied players share the same rank
      var rank = (i > 0 && getValue(sorted[i]) === getValue(sorted[i - 1]))
        ? rank : i + 1;
      var rankIdx = rank - 1;

      var row = document.createElement('div');
      row.className = 'ranking-row';
      if (p.isHuman) row.className += ' human-row';
      if (rankIdx >= 3) row.className += ' ranking-dim';

      var rankCls = rankIdx < 3 ? rankColors[rankIdx] : '';
      var nameCls = p.isHuman ? ' human-name' : '';
      var value = gameMode === 'betting'
        ? '\uD83C\uDFB0 ' + p.chips
        : '\uD83D\uDCCA ' + p.score;

      var ordinal = getOrdinal(rank);
      var rankText = rankIdx < 3 ? trophies[rankIdx] + ' ' + ordinal : ordinal;

      row.innerHTML =
        '<span class="ranking-rank ' + rankCls + '">' + rankText + '</span>' +
        '<span class="ranking-name' + nameCls + '">' + p.name + '</span>' +
        '<span class="ranking-score">' + value + '</span>';

      list.appendChild(row);
    }

    $('#ranking-overlay').classList.remove('hidden');
  }

  function hideRanking() {
    $('#ranking-overlay').classList.add('hidden');
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
    delay,
    showAnnouncement,
    showRanking,
    hideRanking,
    layoutEdge: false
  };
})();
