// ══════════ APP CONTROLLER ══════════

// ── Telegram WebApp ──
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.expand();
  tg.setHeaderColor('#0a0a14');
  tg.setBackgroundColor('#0a0a14');
  tg.enableClosingConfirmation();
  tg.ready();
}

// ── Инициализация ──
document.addEventListener('DOMContentLoaded', () => {
  Game.loadSaved();
  applySettings();
  initParticles();
  runLoader();
});

// ── Лоадер ──
function runLoader() {
  const bar = document.getElementById('loader-bar');
  const text = document.getElementById('loader-text');
  const messages = [
    'Тасуем колоду...',
    'Готовим стол...',
    'Раздаём фишки...',
    'Проверяем удачу...',
    'Добро пожаловать!'
  ];
  let progress = 0;
  let msgIdx = 0;

  const interval = setInterval(() => {
    progress += Math.random() * 18 + 8;
    if (progress > 100) progress = 100;
    bar.style.width = progress + '%';
    const newIdx = Math.min(Math.floor(progress / 25), messages.length - 1);
    if (newIdx !== msgIdx) {
      msgIdx = newIdx;
      text.style.opacity = '0';
      setTimeout(() => {
        text.textContent = messages[msgIdx];
        text.style.opacity = '1';
      }, 200);
    }
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.style.opacity = '0';
        loader.style.transform = 'scale(1.05)';
        loader.style.transition = 'all 0.6s ease';
        setTimeout(() => {
          loader.style.display = 'none';
          openScreen('menu');
        }, 600);
      }, 400);
    }
  }, 120);
}

// ── Частицы на лоадере ──
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const suits = ['♠', '♥', '♦', '♣'];
  for (let i = 0; i < 30; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      suit: suits[Math.floor(Math.random() * 4)],
      size: Math.random() * 18 + 8,
      alpha: Math.random() * 0.3 + 0.05,
      speed: Math.random() * 0.4 + 0.1,
      drift: (Math.random() - 0.5) * 0.3,
      isRed: Math.random() > 0.5
    });
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.isRed ? '#c0392b' : '#c9a84c';
      ctx.font = `${p.size}px serif`;
      ctx.fillText(p.suit, p.x, p.y);
      p.y -= p.speed;
      p.x += p.drift;
      if (p.y < -20) { p.y = canvas.height + 20; p.x = Math.random() * canvas.width; }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }
  animate();
}

// ── Навигация ──
let currentScreen = null;

function openScreen(name) {
  SoundEngine.buttonClick();

  // Скрываем текущий
  if (currentScreen) {
    const old = document.getElementById('screen-' + currentScreen);
    if (old) {
      old.classList.remove('active');
      setTimeout(() => old.classList.add('hidden'), 400);
    }
  }

  currentScreen = name;
  const el = document.getElementById('screen-' + name);
  if (!el) return;
  el.classList.remove('hidden');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => el.classList.add('active'));
  });

  // Хук при входе
  if (name === 'menu') refreshMenu();
  if (name === 'profile') refreshProfile();
  if (name === 'settings') refreshSettings();
}

// ── Меню ──
function refreshMenu() {
  const s = Game.getState();
  document.getElementById('menu-username').textContent = s.username;
  document.getElementById('menu-coins').textContent = s.coins.toLocaleString();
  document.getElementById('menu-avatar-letter').textContent = Game.avatarLetter(s.username);
  // Аватар из Telegram если есть
  if (tg?.initDataUnsafe?.user?.first_name) {
    const u = tg.initDataUnsafe.user;
    if (!s.username || s.username === 'Игрок') {
      Game.getState().username = u.first_name + (u.last_name ? ' ' + u.last_name : '');
      Game.save();
      refreshMenu();
    }
  }
}

// ── Профиль ──
function refreshProfile() {
  const s = Game.getState();
  document.getElementById('profile-name').textContent = s.username;
  document.getElementById('profile-avatar-letter2').textContent = Game.avatarLetter(s.username);
  document.getElementById('stat-coins').textContent = s.coins.toLocaleString();
  document.getElementById('stat-wins').textContent = s.wins;
  document.getElementById('stat-games').textContent = s.games;
  const wr = s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0;
  document.getElementById('stat-winrate').textContent = wr + '%';
  document.getElementById('stat-streak').textContent = s.streak;
  document.getElementById('stat-best').textContent = s.bestWin;

  // Ранг
  let rank = '🃏 Новичок';
  if (s.wins >= 100) rank = '👑 Легенда';
  else if (s.wins >= 50) rank = '💎 Мастер';
  else if (s.wins >= 20) rank = '🏆 Профи';
  else if (s.wins >= 5) rank = '⭐ Опытный';
  document.getElementById('profile-rank').textContent = rank;

  // Достижения
  const achs = document.querySelectorAll('.ach-item');
  if (s.wins >= 1) achs[0]?.classList.remove('locked');
  if (s.streak >= 5) achs[1]?.classList.remove('locked');
  if (s.coins >= 5000) achs[2]?.classList.remove('locked');
}

// ── Настройки ──
function refreshSettings() {
  const s = Game.getState().settings;
  document.getElementById('nick-input').value = Game.getState().username;
  document.getElementById('volume-slider').value = s.volume;
  document.getElementById('vol-val').textContent = s.volume + '%';
  document.getElementById('toggle-cards').checked = s.cards;
  document.getElementById('toggle-music').checked = s.music;
  // Фон
  document.querySelectorAll('.bg-opt').forEach(el => {
    el.classList.toggle('active', el.dataset.bg === s.bg);
  });
}

function saveNickname() {
  const val = document.getElementById('nick-input').value.trim();
  if (!val || val.length < 2) { showToast('Минимум 2 символа!'); return; }
  Game.getState().username = val;
  Game.save();
  showToast('✓ Ник сохранён');
}

function updateVolume(val) {
  document.getElementById('vol-val').textContent = val + '%';
  Game.getState().settings.volume = parseInt(val);
  SoundEngine.setVolume(parseInt(val));
  Game.save();
}

function toggleSetting(key, val) {
  Game.getState().settings[key] = val;
  SoundEngine.enabled[key] = val;
  Game.save();
}

function selectBg(el, bg) {
  document.querySelectorAll('.bg-opt').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  Game.getState().settings.bg = bg;
  applySettings();
  Game.save();
}

function applySettings() {
  const s = Game.getState().settings;
  document.body.className = '';
  if (s.bg !== 'classic') document.body.classList.add('bg-' + s.bg);
  SoundEngine.setVolume(s.volume);
  SoundEngine.enabled.cards = s.cards;
  SoundEngine.enabled.music = s.music;
}

// ══════════ MATCHMAKING ══════════
let mmActive = false;

function cancelMatchmaking() {
  Game.cancelMatchmaking();
  mmActive = false;
  openScreen('menu');
}

// Когда нажимают «Найти игру»
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.btn-play');
  if (btn) btn.onclick = startMatchmaking_flow;
});

function startMatchmaking_flow() {
  SoundEngine.buttonClick();
  if (mmActive) return;
  mmActive = true;
  openScreen('matchmaking');

  // Рендер сидений
  renderSeats([]);

  Game.startMatchmaking(
    (slots, countdownStarted, countdownVal) => {
      renderSeats(slots);
      document.getElementById('mm-counter').textContent = slots.length + '/6';
      const status = document.getElementById('mm-status');
      const cdBlock = document.getElementById('mm-countdown');
      const cdNum = document.getElementById('countdown-num');

      if (countdownStarted) {
        status.textContent = 'Игра начинается!';
        cdBlock.classList.remove('hidden');
        cdNum.textContent = countdownVal;
        // Кольцо прогресса
        const ring = document.getElementById('ring-fill');
        if (ring) {
          const pct = countdownVal / 15;
          const circ = 2 * Math.PI * 44;
          ring.style.strokeDasharray = circ;
          ring.style.strokeDashoffset = circ * (1 - pct);
        }
      } else {
        status.textContent = 'Ищем игроков...';
      }
    },
    (finalSlots) => {
      mmActive = false;
      initGame(finalSlots);
    }
  );
}

function renderSeats(slots) {
  const container = document.getElementById('mm-seats');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const seat = document.createElement('div');
    seat.className = 'mm-seat' + (i < slots.length ? ' occupied' : '');
    if (i < slots.length) {
      const p = slots[i];
      seat.innerHTML = `
        <div class="mm-seat-avatar">${Game.avatarLetter(p.name)}</div>
        <div class="mm-seat-name">${p.name.substring(0,10)}</div>
      `;
      if (i === 0) seat.classList.add('me');
    } else {
      seat.innerHTML = `<div class="mm-seat-empty">?</div>`;
    }
    container.appendChild(seat);
  }
}

// ══════════ GAME UI ══════════
let dealerHideCard = true;
let myTurnActive = false;

function initGame(players) {
  openScreen('game');
  dealerHideCard = true;
  myTurnActive = false;

  // Показываем панель ставок
  document.getElementById('bet-panel').classList.remove('hidden');
  document.getElementById('action-panel').classList.add('hidden');
  document.getElementById('result-overlay').classList.add('hidden');

  // Очищаем карты
  clearCards();
  renderOtherPlayers(players.filter((_, i) => i !== 0));

  // Обновляем HUD
  updateHUD();
  document.getElementById('player-name-tag').textContent = Game.getState().username;
  document.getElementById('current-bet').textContent = '0';
}

function clearCards() {
  document.getElementById('dealer-cards').innerHTML = '';
  document.getElementById('player-cards').innerHTML = '';
  document.getElementById('dealer-score').textContent = '?';
  document.getElementById('player-score').textContent = '0';
}

function addBet(amount) {
  const ok = Game.addBet(amount);
  if (!ok) { showToast('Недостаточно фишек!'); return; }
  SoundEngine.chipAdd();
  document.getElementById('current-bet').textContent = Game.getState().bet;
  // Анимация фишки
  animateChip(amount);
}

function clearBet() {
  Game.clearBet();
  document.getElementById('current-bet').textContent = '0';
}

function animateChip(amount) {
  const chip = document.createElement('div');
  chip.className = 'flying-chip';
  chip.textContent = amount;
  document.body.appendChild(chip);
  setTimeout(() => chip.remove(), 600);
}

function startRound() {
  const ok = Game.startRound((event) => {
    if (event === 'dealing_start') {
      SoundEngine.deal_start();
      document.getElementById('bet-panel').classList.add('hidden');
      // Анимация начала
      setTimeout(() => {
        Game.dealInitial(handleGameEvent);
      }, 300);
    }
  });
  if (!ok) { showToast('Поставьте ставку!'); return; }
  document.getElementById('deal-btn').disabled = true;
}

function handleGameEvent(event, data) {
  const s = Game.getState();

  switch (event) {
    case 'card_dealt':
      if (data.target === 'dealer') {
        renderDealerCards(true);
      } else {
        renderPlayerCards(data.p);
        if (data.p.index === 0) updatePlayerScore();
      }
      break;

    case 'dealing_done':
      myTurnActive = true;
      renderDealerCards(true); // скрываем вторую карту дилера
      renderPlayerCards(s.players[0]);
      updatePlayerScore();
      updateHUD();
      // Проверяем блэкджек у игрока
      if (Game.isBlackjack(s.players[0].hand)) {
        showToast('🃏 BLACKJACK!');
        SoundEngine.blackjack();
        Game.playerStand(handleGameEvent);
        return;
      }
      showActionPanel();
      break;

    case 'player_card':
    case 'player_double':
      renderPlayerCards(s.players[0]);
      updatePlayerScore();
      break;

    case 'player_bust':
      renderPlayerCards(s.players[0]);
      updatePlayerScore();
      showToast('💥 Перебор!');
      hideActionPanel();
      break;

    case 'player_stand':
      hideActionPanel();
      break;

    case 'bot_turn':
      renderOtherPlayerActive(data);
      setTimeout(() => Game.botPlay(data, s.dealer[0], handleGameEvent), 200);
      break;

    case 'bot_card':
      renderOtherPlayerCards(data);
      break;

    case 'dealer_turn':
      dealerHideCard = false;
      renderDealerCards(false);
      setTimeout(() => Game.dealerPlay(handleGameEvent), 500);
      break;

    case 'dealer_reveal':
      renderDealerCards(false);
      updateDealerScore(false);
      break;

    case 'dealer_card':
      renderDealerCards(false);
      updateDealerScore(false);
      break;

    case 'result':
      showResult(data);
      break;
  }
}

// ── Рендер карт ──
function makeCardEl(card, hidden = false) {
  const el = document.createElement('div');
  el.className = 'card' + (hidden ? ' card-back' : '') + (card && card.isRed && !hidden ? ' card-red' : '');
  if (!hidden && card) {
    el.innerHTML = `
      <div class="card-corner top-left">
        <span class="card-val">${card.value}</span>
        <span class="card-suit">${card.suit}</span>
      </div>
      <div class="card-center-suit">${card.suit}</div>
      <div class="card-corner bottom-right">
        <span class="card-val">${card.value}</span>
        <span class="card-suit">${card.suit}</span>
      </div>
    `;
  } else if (hidden) {
    el.innerHTML = `<div class="card-back-pattern"></div>`;
  }
  el.style.animation = 'card-deal-in 0.3s cubic-bezier(0.34,1.4,0.64,1) both';
  return el;
}

function renderDealerCards(hideSecond) {
  const s = Game.getState();
  const container = document.getElementById('dealer-cards');
  container.innerHTML = '';
  s.dealer.forEach((c, i) => {
    const hidden = hideSecond && i === 1;
    container.appendChild(makeCardEl(c, hidden));
  });
  if (!hideSecond) updateDealerScore(false);
  else document.getElementById('dealer-score').textContent = '?';
}

function updateDealerScore(hidden) {
  const s = Game.getState();
  if (hidden) { document.getElementById('dealer-score').textContent = '?'; return; }
  const score = Game.handScore(s.dealer);
  const el = document.getElementById('dealer-score');
  el.textContent = score;
  if (score > 21) el.style.color = '#e74c3c';
  else if (score === 21) el.style.color = '#f7c948';
  else el.style.color = '';
}

function renderPlayerCards(player) {
  const isMe = player.index === 0;
  const container = isMe
    ? document.getElementById('player-cards')
    : document.getElementById('other-player-cards-' + player.id);
  if (!container) return;
  container.innerHTML = '';
  player.hand.forEach(c => container.appendChild(makeCardEl(c, false)));
}

function updatePlayerScore() {
  const s = Game.getState();
  const me = s.players[0];
  const score = Game.handScore(me.hand);
  const el = document.getElementById('player-score');
  el.textContent = score;
  if (score > 21) el.style.color = '#e74c3c';
  else if (score === 21) el.style.color = '#f7c948';
  else el.style.color = '';
}

function renderOtherPlayers(bots) {
  const container = document.getElementById('other-players');
  container.innerHTML = '';
  bots.forEach(p => {
    const el = document.createElement('div');
    el.className = 'other-player';
    el.id = 'other-player-' + p.id;
    el.innerHTML = `
      <div class="other-player-name">${p.name}</div>
      <div class="other-player-mini-cards" id="other-player-cards-${p.id}"></div>
      <div class="other-player-score" id="other-player-score-${p.id}">-</div>
    `;
    container.appendChild(el);
  });
}

function renderOtherPlayerActive(player) {
  document.querySelectorAll('.other-player').forEach(el => el.classList.remove('active-player'));
  const el = document.getElementById('other-player-' + player.id);
  if (el) el.classList.add('active-player');
}

function renderOtherPlayerCards(player) {
  const container = document.getElementById('other-player-cards-' + player.id);
  const scoreEl = document.getElementById('other-player-score-' + player.id);
  if (!container) return;
  container.innerHTML = '';
  player.hand.forEach(c => {
    const el = document.createElement('div');
    el.className = 'mini-card-sm' + (c.isRed ? ' red' : '');
    el.textContent = c.value + c.suit;
    container.appendChild(el);
  });
  if (scoreEl) {
    const sc = Game.handScore(player.hand);
    scoreEl.textContent = sc;
    scoreEl.style.color = sc > 21 ? '#e74c3c' : sc === 21 ? '#f7c948' : '';
  }
  if (Game.isBust(player.hand)) {
    const el = document.getElementById('other-player-' + player.id);
    if (el) el.classList.add('busted');
  }
}

function showActionPanel() {
  const s = Game.getState();
  document.getElementById('action-panel').classList.remove('hidden');
  document.getElementById('action-bet').textContent = s.bet;
  document.getElementById('action-balance').textContent = s.coins;
  // Двойной только на первых 2 картах
  const me = s.players[0];
  const canDouble = me.hand.length === 2 && s.coins >= s.bet;
  document.getElementById('btn-double').style.opacity = canDouble ? '1' : '0.4';
  document.getElementById('btn-double').disabled = !canDouble;
}

function hideActionPanel() {
  document.getElementById('action-panel').classList.add('hidden');
}

function updateHUD() {
  document.getElementById('hud-coins').textContent = Game.getState().coins.toLocaleString();
}

// ── Результат ──
function showResult(data) {
  updateHUD();
  const overlay = document.getElementById('result-overlay');
  const emoji = document.getElementById('result-emoji');
  const title = document.getElementById('result-title');
  const desc = document.getElementById('result-desc');

  const map = {
    blackjack: { e: '🃏', t: 'BLACKJACK!', d: '+' + data.coinChange + ' фишек' },
    win:       { e: '🏆', t: 'Победа!',    d: '+' + data.coinChange + ' фишек' },
    push:      { e: '🤝', t: 'Ничья',      d: 'Ставка возвращена' },
    bust:      { e: '💥', t: 'Перебор!',   d: 'Потеряно ' + Math.abs(data.coinChange) + ' фишек' },
    lose:      { e: '😔', t: 'Проигрыш',   d: 'Потеряно ' + Math.abs(data.coinChange) + ' фишек' },
  };

  const r = map[data.result] || map.lose;
  emoji.textContent = r.e;
  title.textContent = r.t;
  desc.textContent = r.d;

  // Дилер
  desc.textContent += `\nДилер: ${data.dealerSc} | Ты: ${data.mySc}`;

  overlay.classList.remove('hidden');
  overlay.style.animation = 'fade-in 0.4s ease';
}

function playAgain() {
  Game.resetRound();
  document.getElementById('result-overlay').classList.add('hidden');
  clearCards();
  document.getElementById('bet-panel').classList.remove('hidden');
  document.getElementById('action-panel').classList.add('hidden');
  document.getElementById('current-bet').textContent = '0';
  document.getElementById('deal-btn').disabled = false;
  document.getElementById('dealer-score').textContent = '?';
  document.getElementById('player-score').textContent = '0';
  dealerHideCard = true;

  // Обновляем других игроков
  const s = Game.getState();
  renderOtherPlayers(s.players.filter((_, i) => i !== 0));
  updateHUD();
  refreshMenu();
}

function leaveGame() {
  Game.cancelMatchmaking();
  openScreen('menu');
  refreshMenu();
}

// ── Действия ──
function playerHit() {
  if (!myTurnActive) return;
  Game.playerHit(handleGameEvent);
}

function playerStand() {
  if (!myTurnActive) return;
  myTurnActive = false;
  Game.playerStand(handleGameEvent);
}

function playerDouble() {
  if (!myTurnActive) return;
  if (Game.getState().players[0].hand.length !== 2) return;
  myTurnActive = false;
  Game.playerDouble(handleGameEvent);
}

// ── Toast ──
let toastTimer = null;
function showToast(msg, duration = 2000) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 300);
  }, duration);
}
