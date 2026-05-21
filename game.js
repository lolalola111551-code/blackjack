// ══════════ BLACKJACK GAME ENGINE ══════════
// Чистый рандом, без накрутки. Честная игра.

const Game = (() => {

  // ── Карты ──
  const SUITS = ['♠','♥','♦','♣'];
  const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

  function makeDeck(numDecks = 6) {
    const deck = [];
    for (let d = 0; d < numDecks; d++) {
      for (const s of SUITS) {
        for (const v of VALUES) {
          deck.push({ suit: s, value: v, isRed: s === '♥' || s === '♦' });
        }
      }
    }
    return deck;
  }

  // Честное тасование — Fisher-Yates
  function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function cardValue(card) {
    if (['J','Q','K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
  }

  function handScore(hand) {
    let total = 0, aces = 0;
    for (const c of hand) {
      total += cardValue(c);
      if (c.value === 'A') aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }

  function isBust(hand) { return handScore(hand) > 21; }
  function isBlackjack(hand) { return hand.length === 2 && handScore(hand) === 21; }

  // ── Состояние ──
  let state = {
    deck: [],
    dealer: [],
    players: [],        // [{id, name, hand, bet, status, isBot}]
    myIndex: 0,
    currentPlayer: -1,
    phase: 'bet',       // bet | dealing | player-turn | dealer-turn | result
    bet: 0,
    coins: 1000,
    wins: 0, games: 0, streak: 0, bestWin: 0,
    settings: { volume: 70, cards: true, music: false, bg: 'classic' },
    username: 'Игрок'
  };

  function getState() { return state; }

  function loadSaved() {
    try {
      const s = JSON.parse(localStorage.getItem('bjr_save') || '{}');
      if (s.coins !== undefined) state.coins = s.coins;
      if (s.wins !== undefined) state.wins = s.wins;
      if (s.games !== undefined) state.games = s.games;
      if (s.streak !== undefined) state.streak = s.streak;
      if (s.bestWin !== undefined) state.bestWin = s.bestWin;
      if (s.settings) state.settings = { ...state.settings, ...s.settings };
      if (s.username) state.username = s.username;
    } catch(e) {}
  }

  function save() {
    localStorage.setItem('bjr_save', JSON.stringify({
      coins: state.coins, wins: state.wins, games: state.games,
      streak: state.streak, bestWin: state.bestWin,
      settings: state.settings, username: state.username
    }));
  }

  // ── Боты ──
  const BOT_NAMES = [
    'Viktor_88', 'Lady_Luck', 'DarkHorse', 'CasinoKing',
    'BluffMaster', 'RoyalFlush', 'BlackAce', 'SilverStar',
    'NightOwl', 'CardShark', 'HighRoller', 'LuckyDice'
  ];

  function randomBotName() {
    return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  }

  function randomBotBet(coins) {
    const options = [5, 10, 25, 50, 100];
    const valid = options.filter(o => o <= coins);
    return valid[Math.floor(Math.random() * valid.length)] || 5;
  }

  // Простая стратегия ботов (с небольшим рандомом, как реальные игроки)
  function botDecide(hand, dealerVisible) {
    const score = handScore(hand);
    const rand = Math.random();
    if (score <= 11) return 'hit';
    if (score === 12) return dealerVisible >= 4 && dealerVisible <= 6 ? 'stand' : 'hit';
    if (score <= 16) {
      // мягкое следование стратегии с рандомом
      if (dealerVisible >= 7) return rand < 0.85 ? 'hit' : 'stand';
      return rand < 0.4 ? 'hit' : 'stand';
    }
    return 'stand';
  }

  // ── Матчмейкинг симуляция ──
  let mmTimer = null;
  let mmCountdown = null;

  function startMatchmaking(onUpdate, onStart) {
    state.deck = shuffle(makeDeck(6));

    // Создаём слоты 1-6. Игрок — первый
    const numBots = Math.floor(Math.random() * 4) + 1; // 1-4 бота сначала
    const slots = [];

    // Наш игрок
    slots.push({ id: 'me', name: state.username, isBot: false, coins: state.coins });

    // Постепенно добавляем ботов
    let addedBots = 0;
    let countdownStarted = false;
    let countdownVal = 15;

    onUpdate(slots, false, 0);

    function addNextBot() {
      if (slots.length >= 6 || addedBots >= numBots) return;
      slots.push({ id: 'bot_' + addedBots, name: randomBotName(), isBot: true, coins: 500 + Math.floor(Math.random() * 500) });
      addedBots++;
      onUpdate([...slots], countdownStarted, countdownVal);

      // Если 3+ начинаем отсчёт
      if (slots.length >= 3 && !countdownStarted) {
        countdownStarted = true;
        onUpdate([...slots], true, 15);
        startCountdown();
      }
    }

    // Добавляем ботов с задержками
    const delays = [800, 1600, 2800, 4200, 5500];
    delays.forEach((d, i) => {
      mmTimer = setTimeout(() => addNextBot(), d);
    });

    function startCountdown() {
      countdownVal = 15;
      mmCountdown = setInterval(() => {
        countdownVal--;
        onUpdate([...slots], true, countdownVal);
        if (countdownVal <= 0) {
          clearInterval(mmCountdown);
          clearTimeout(mmTimer);
          // Стартуем игру
          const finalSlots = slots.map((s, i) => ({
            ...s,
            hand: [], bet: 0, status: 'playing', index: i
          }));
          state.players = finalSlots;
          state.myIndex = 0;
          onStart(finalSlots);
        }
      }, 1000);
    }
  }

  function cancelMatchmaking() {
    clearTimeout(mmTimer);
    clearInterval(mmCountdown);
  }

  // ── Игра ──
  function dealCard() {
    if (state.deck.length < 20) {
      state.deck = shuffle(makeDeck(6));
    }
    return state.deck.pop();
  }

  function setBet(amount) {
    if (state.phase !== 'bet') return false;
    if (amount > state.coins) return false;
    state.bet = amount;
    return true;
  }

  function addBet(amount) {
    if (state.bet + amount > state.coins) return false;
    state.bet += amount;
    return true;
  }

  function clearBet() { state.bet = 0; }

  function startRound(onUpdate) {
    if (state.bet <= 0) return false;
    if (state.bet > state.coins) return false;

    state.phase = 'dealing';
    state.dealer = [];
    state.coins -= state.bet;

    // Ставки ботов
    for (const p of state.players) {
      p.hand = [];
      p.status = 'playing';
      if (p.isBot) p.bet = randomBotBet(p.coins);
      else p.bet = state.bet;
    }

    onUpdate('dealing_start');
    return true;
  }

  function dealInitial(onUpdate) {
    // Раздаём по 2 карты каждому, потом дилеру
    const me = state.players[state.myIndex];

    const seq = [];
    // Первый раунд раздачи
    for (const p of state.players) seq.push({ target: 'player', p });
    seq.push({ target: 'dealer' });
    // Второй раунд
    for (const p of state.players) seq.push({ target: 'player', p });
    seq.push({ target: 'dealer' });

    let i = 0;
    const interval = setInterval(() => {
      if (i >= seq.length) {
        clearInterval(interval);
        state.phase = 'player-turn';
        state.currentPlayer = 0;
        onUpdate('dealing_done');
        return;
      }
      const step = seq[i];
      if (step.target === 'dealer') {
        state.dealer.push(dealCard());
      } else {
        step.p.hand.push(dealCard());
      }
      SoundEngine.cardDeal();
      onUpdate('card_dealt', step);
      i++;
    }, 300);
  }

  function nextPlayer(onUpdate) {
    // Найти следующего активного игрока
    let next = state.currentPlayer + 1;
    while (next < state.players.length) {
      if (!state.players[next].isBot || state.players[next].status === 'playing') break;
      next++;
    }

    if (next >= state.players.length) {
      // Все сыграли — ход дилера
      state.phase = 'dealer-turn';
      state.currentPlayer = -1;
      onUpdate('dealer_turn');
      return;
    }

    state.currentPlayer = next;
    const p = state.players[next];

    if (p.isBot) {
      // Бот играет автоматически
      onUpdate('bot_turn', p);
    } else {
      onUpdate('player_turn', p);
    }
  }

  function botPlay(player, dealerCard, onUpdate) {
    const delay = 600 + Math.random() * 800;
    const think = setInterval(() => {
      const decision = botDecide(player.hand, cardValue(dealerCard));
      if (decision === 'hit' && !isBust(player.hand)) {
        player.hand.push(dealCard());
        SoundEngine.cardDeal();
        onUpdate('bot_card', player);
        if (isBust(player.hand) || handScore(player.hand) >= 21) {
          player.status = isBust(player.hand) ? 'bust' : 'stand';
          clearInterval(think);
          setTimeout(() => nextPlayer(onUpdate), 500);
        }
      } else {
        player.status = 'stand';
        clearInterval(think);
        setTimeout(() => nextPlayer(onUpdate), 400);
      }
    }, delay);
  }

  function playerHit(onUpdate) {
    if (state.phase !== 'player-turn') return false;
    const me = state.players[state.myIndex];
    if (me.status !== 'playing') return false;

    me.hand.push(dealCard());
    SoundEngine.cardDeal();
    onUpdate('player_card');

    if (isBust(me.hand)) {
      me.status = 'bust';
      SoundEngine.bust();
      onUpdate('player_bust');
      setTimeout(() => nextPlayer(onUpdate), 800);
    } else if (handScore(me.hand) === 21) {
      me.status = 'stand';
      setTimeout(() => nextPlayer(onUpdate), 600);
    }
    return true;
  }

  function playerStand(onUpdate) {
    if (state.phase !== 'player-turn') return false;
    const me = state.players[state.myIndex];
    me.status = 'stand';
    onUpdate('player_stand');
    setTimeout(() => nextPlayer(onUpdate), 400);
    return true;
  }

  function playerDouble(onUpdate) {
    if (state.phase !== 'player-turn') return false;
    const me = state.players[state.myIndex];
    if (me.hand.length !== 2) return false;
    if (state.coins < state.bet) return false;

    state.coins -= state.bet;
    me.bet *= 2;
    state.bet *= 2;
    me.hand.push(dealCard());
    SoundEngine.cardDeal();
    me.status = 'stand';
    onUpdate('player_double');
    setTimeout(() => nextPlayer(onUpdate), 700);
    return true;
  }

  function dealerPlay(onUpdate) {
    // Открываем вторую карту дилера
    onUpdate('dealer_reveal');
    SoundEngine.cardDeal();

    const interval = setInterval(() => {
      const score = handScore(state.dealer);
      if (score >= 17) {
        clearInterval(interval);
        state.phase = 'result';
        resolveResults(onUpdate);
        return;
      }
      state.dealer.push(dealCard());
      SoundEngine.cardDeal();
      onUpdate('dealer_card');
    }, 700);
  }

  function resolveResults(onUpdate) {
    const dealerSc = handScore(state.dealer);
    const dealerBust = isBust(state.dealer);
    const me = state.players[state.myIndex];
    const mySc = handScore(me.hand);
    const myBj = isBlackjack(me.hand);
    const myBust = isBust(me.hand);

    let result = 'lose';
    let coinChange = 0;

    if (myBust) {
      result = 'bust';
      coinChange = -me.bet;
    } else if (myBj && !isBlackjack(state.dealer)) {
      result = 'blackjack';
      coinChange = Math.floor(me.bet * 1.5);
      state.coins += me.bet + coinChange;
    } else if (dealerBust) {
      result = 'win';
      coinChange = me.bet;
      state.coins += me.bet * 2;
    } else if (mySc > dealerSc) {
      result = 'win';
      coinChange = me.bet;
      state.coins += me.bet * 2;
    } else if (mySc === dealerSc) {
      result = 'push';
      coinChange = 0;
      state.coins += me.bet;
    } else {
      result = 'lose';
      coinChange = -me.bet;
    }

    // Статистика
    state.games++;
    if (result === 'win' || result === 'blackjack') {
      state.wins++;
      state.streak++;
      if (coinChange > state.bestWin) state.bestWin = coinChange;
    } else if (result !== 'push') {
      state.streak = 0;
    }

    // Добавляем монет если совсем кончились
    if (state.coins < 10) state.coins = 100;

    save();

    if (result === 'win') SoundEngine.win();
    else if (result === 'blackjack') SoundEngine.blackjack();
    else if (result === 'bust' || result === 'lose') SoundEngine.lose();

    onUpdate('result', { result, coinChange, dealerSc, mySc });
  }

  function resetRound() {
    state.phase = 'bet';
    state.bet = 0;
    state.dealer = [];
    state.currentPlayer = -1;
    for (const p of state.players) { p.hand = []; p.status = 'playing'; }
  }

  function handDisplay(hand, hideSecond = false) {
    return hand.map((c, i) => ({
      ...c,
      hidden: hideSecond && i === 1
    }));
  }

  // Аватар
  function avatarLetter(name) {
    return (name || '?')[0].toUpperCase();
  }

  return {
    getState, loadSaved, save,
    startMatchmaking, cancelMatchmaking,
    setBet, addBet, clearBet,
    startRound, dealInitial, nextPlayer, botPlay,
    playerHit, playerStand, playerDouble,
    dealerPlay,
    handScore, isBust, isBlackjack,
    cardValue, resetRound, handDisplay,
    avatarLetter
  };
})();
