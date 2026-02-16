/* ai.js — AI decision engine */

const AI = (() => {

  /**
   * Dealer strict rules: hit on ≤16, stand on ≥17
   */
  function dealerDecision(score) {
    return score <= 16 ? 'hit' : 'stand';
  }

  /**
   * Check if hand is "soft" (contains an Ace counted as 11)
   */
  function isSoftHand(hand) {
    let score = 0;
    let aces = 0;
    for (const card of hand) {
      score += Game.cardValue(card);
      if (card.rank === 'A') aces++;
    }
    // If we have aces and the score without reducing any ace is ≤ 21,
    // then at least one ace is still worth 11 → soft hand
    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }
    return aces > 0 && score <= 21;
  }

  /**
   * Simplified basic strategy + randomness for AI players
   * dealerUpCard: the dealer's visible card
   */
  function playerDecision(hand, score, dealerUpCard) {
    // Always stand on 19+
    if (score >= 19) return 'stand';
    // Always hit on ≤ 11
    if (score <= 11) return 'hit';

    // Soft hand 17-18: 30% chance to hit
    if (isSoftHand(hand) && score >= 17 && score <= 18) {
      return Math.random() < 0.3 ? 'hit' : 'stand';
    }

    // 12-18: look at dealer's up card
    const dealerValue = Game.cardValue(dealerUpCard);

    // Dealer shows weak card (2-6): tend to stand
    if (dealerValue >= 2 && dealerValue <= 6) {
      if (score >= 17) return 'stand';
      if (score >= 13) return Math.random() < 0.2 ? 'hit' : 'stand';
      // score 12: 50/50
      return Math.random() < 0.5 ? 'hit' : 'stand';
    }

    // Dealer shows strong card (7-11/A): tend to hit
    if (score <= 16) return Math.random() < 0.15 ? 'stand' : 'hit';
    // score 17-18
    return Math.random() < 0.25 ? 'hit' : 'stand';
  }

  /**
   * Generate a random bet for AI player
   */
  function generateBet(chips) {
    const amounts = [10, 25, 50, 100];
    const affordable = amounts.filter(a => a <= chips);
    if (affordable.length === 0) return chips; // all-in
    return affordable[Math.floor(Math.random() * affordable.length)];
  }

  return { dealerDecision, playerDecision, generateBet, isSoftHand };
})();
