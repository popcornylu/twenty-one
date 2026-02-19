/* game.js — Core game logic: deck, scoring, game state */

const Game = (() => {
  const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUIT_SYMBOLS = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };

  let state = null;

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({ suit, rank, faceUp: true });
      }
    }
    return deck;
  }

  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function cardValue(card) {
    if (card.rank === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card.rank)) return 10;
    return parseInt(card.rank);
  }

  function calculateScore(hand) {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
      score += cardValue(card);
      if (card.rank === 'A') aces++;
    }
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  }

  function calculateVisibleScore(hand) {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
      if (!card.faceUp) continue;
      score += cardValue(card);
      if (card.rank === 'A') aces++;
    }
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return score;
  }

  function drawCard(faceUp) {
    if (state.deck.length === 0) {
      state.deck = shuffleDeck(createDeck());
    }
    const card = state.deck.pop();
    card.faceUp = faceUp;
    return card;
  }

  /**
   * initGame(config)
   * config: { playerConfigs, gameMode, roundsTarget, startingPoints }
   * P1-P6 created in order, dealer always last index.
   */
  function initGame(config) {
    const { playerConfigs, gameMode, roundsTarget, startingPoints, startingChips } = config;
    const chips = gameMode === 'betting' ? (startingChips || 1000) : 0;
    const deck = shuffleDeck(createDeck());
    const players = [];
    const humanIndices = [];

    for (let i = 0; i < playerConfigs.length; i++) {
      const cfg = playerConfigs[i];
      const isHuman = cfg.type === 'human';
      const name = isHuman ? '玩家 ' + (i + 1) : '電腦 ' + (i + 1);
      if (isHuman) humanIndices.push(i);
      players.push({
        name,
        isHuman,
        isDealer: false,
        hand: [],
        chips,
        score: gameMode === 'points' ? startingPoints : 0,
        currentBet: 0,
        status: 'playing',
        result: null
      });
    }

    // Dealer is always the last player
    players.push({
      name: '莊家',
      isHuman: false,
      isDealer: true,
      hand: [],
      chips,
      score: 0,
      currentBet: 0,
      status: 'playing',
      result: null
    });

    state = {
      phase: 'setup',
      deck,
      players,
      dealerIndex: players.length - 1,
      humanIndices,
      currentPlayerIndex: -1,
      currentBettingIndex: -1,
      round: 0,
      gameMode,
      roundsTarget,
      startingPoints,
      startingChips: chips,
      dealerSkipped: false
    };

    return state;
  }

  function startRound() {
    state.round++;
    state.phase = state.gameMode === 'betting' ? 'betting' : 'dealing';
    state.dealerSkipped = false;
    for (const player of state.players) {
      player.hand = [];
      player.currentBet = 0;
      player.status = 'playing';
      player.result = null;
    }
    if (state.deck.length < 15) {
      state.deck = shuffleDeck(createDeck());
    }
  }

  function dealInitialCards() {
    state.phase = 'dealing';
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < state.players.length; i++) {
        if (state.gameMode === 'betting' && state.players[i].chips <= 0 && !state.players[i].isDealer) continue;
        const isDealer = state.players[i].isDealer;
        const faceUp = !(isDealer && round === 1);
        state.players[i].hand.push(drawCard(faceUp));
      }
    }
  }

  function checkNaturalBlackjack(player) {
    if (player.hand.length === 2 && calculateScore(player.hand) === 21) {
      player.status = 'blackjack';
      return true;
    }
    return false;
  }

  function playerHit(playerIndex) {
    const player = state.players[playerIndex];
    player.hand.push(drawCard(true));
    const score = calculateScore(player.hand);
    if (score > 21) {
      player.status = 'bust';
      return 'bust';
    }
    if (score === 21) {
      player.status = 'standing';
      return 'twentyone';
    }
    return 'ok';
  }

  function playerStand(playerIndex) {
    state.players[playerIndex].status = 'standing';
  }

  function revealDealerCard() {
    const dealer = state.players[state.dealerIndex];
    for (const card of dealer.hand) {
      card.faceUp = true;
    }
  }

  function getDealerUpCard() {
    const dealer = state.players[state.dealerIndex];
    return dealer.hand.find(c => c.faceUp);
  }

  function calculateResults() {
    const dealer = state.players[state.dealerIndex];
    const dealerScore = calculateScore(dealer.hand);

    if (dealerScore > 21) {
      dealer.status = 'bust';
    }

    for (const player of state.players) {
      if (player.isDealer) continue;
      if (state.gameMode === 'betting' && player.chips <= 0 && player.hand.length === 0) continue;

      const playerScore = calculateScore(player.hand);

      if (player.status === 'bust') {
        player.result = 'lose';
      } else if (dealer.status === 'bust') {
        player.result = 'win';
      } else if (player.status === 'blackjack' && dealer.status !== 'blackjack') {
        player.result = 'win';
      } else if (dealer.status === 'blackjack' && player.status !== 'blackjack') {
        player.result = 'lose';
      } else if (playerScore > dealerScore) {
        player.result = 'win';
      } else if (playerScore < dealerScore) {
        player.result = 'lose';
      } else {
        player.result = 'draw';
      }
    }

    // Update chips/score
    for (const player of state.players) {
      if (player.isDealer) continue;
      if (state.gameMode === 'betting') {
        if (player.result === 'win') {
          const payout = player.status === 'blackjack'
            ? Math.floor(player.currentBet * 1.5)
            : player.currentBet;
          player.chips += payout;
          dealer.chips -= payout;
        } else if (player.result === 'lose') {
          player.chips -= player.currentBet;
          dealer.chips += player.currentBet;
        }
      } else {
        if (player.result === 'win') {
          player.score += 1;
        } else if (player.result === 'lose') {
          player.score -= 1;
        } else if (player.result === 'draw') {
          player.score += 0.5;
        }
      }
    }

    state.phase = 'results';
  }

  function getNonDealerTurnOrder() {
    const order = [];
    for (let i = 0; i < state.players.length; i++) {
      if (i === state.dealerIndex) continue;
      if (state.gameMode === 'betting' && state.players[i].chips <= 0) continue;
      if (state.players[i].status === 'blackjack') continue;
      if (state.players[i].status === 'bust') continue;
      order.push(i);
    }
    return order;
  }

  function allNonDealersDone() {
    for (let i = 0; i < state.players.length; i++) {
      if (i === state.dealerIndex) continue;
      if (state.gameMode === 'betting' && state.players[i].chips <= 0) continue;
      const s = state.players[i].status;
      if (s === 'playing') return false;
    }
    return true;
  }

  function allNonDealersBust() {
    for (let i = 0; i < state.players.length; i++) {
      if (i === state.dealerIndex) continue;
      if (state.gameMode === 'betting' && state.players[i].chips <= 0) continue;
      if (state.players[i].status !== 'bust') return false;
    }
    return true;
  }

  function isGameOver() {
    if (state.round >= state.roundsTarget) return true;
    if (state.gameMode === 'betting') {
      return !state.humanIndices.some(i => state.players[i].chips > 0);
    }
    return false;
  }

  return {
    get state() { return state; },
    SUITS,
    RANKS,
    SUIT_SYMBOLS,
    createDeck,
    shuffleDeck,
    calculateScore,
    calculateVisibleScore,
    cardValue,
    drawCard,
    initGame,
    startRound,
    dealInitialCards,
    checkNaturalBlackjack,
    playerHit,
    playerStand,
    revealDealerCard,
    getDealerUpCard,
    calculateResults,
    getNonDealerTurnOrder,
    allNonDealersDone,
    allNonDealersBust,
    isGameOver
  };
})();
