// ══════════ SOUND ENGINE ══════════
const SoundEngine = (() => {
  let ctx = null;
  let masterGain = null;
  let volume = 0.7;
  let enabled = { cards: true, music: false };
  let musicOsc = null;

  function init() {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(ctx.destination);
    } catch(e) { console.warn('No audio context'); }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function setVolume(v) {
    volume = v / 100;
    if (masterGain) masterGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.01);
  }

  function playTone(freq, type, duration, gain = 0.3, delay = 0) {
    if (!ctx || !enabled.cards) return;
    resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g); g.connect(masterGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    g.gain.setValueAtTime(0, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  }

  // Карта раздаётся — «вжух» + щелчок
  function cardDeal() {
    if (!ctx || !enabled.cards) return;
    resume();
    // Noise burst (swish)
    const bufSize = ctx.sampleRate * 0.12;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i/bufSize, 3);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass'; filter.frequency.value = 1500;
    const g = ctx.createGain(); g.gain.value = 0.5;
    src.connect(filter); filter.connect(g); g.connect(masterGain);
    src.start();
    // Click
    playTone(800, 'sine', 0.04, 0.2);
  }

  function chipAdd() {
    playTone(1200, 'sine', 0.08, 0.25);
    playTone(1600, 'sine', 0.05, 0.15, 0.06);
  }

  function win() {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.3, 0.3, i * 0.1));
  }

  function blackjack() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 'triangle', 0.4, 0.35, i * 0.08));
  }

  function lose() {
    [400, 320, 260].forEach((f, i) => playTone(f, 'sawtooth', 0.25, 0.2, i * 0.12));
  }

  function bust() {
    [300, 220].forEach((f, i) => playTone(f, 'sawtooth', 0.3, 0.3, i * 0.1));
  }

  function buttonClick() {
    playTone(440, 'sine', 0.06, 0.15);
  }

  function deal_start() {
    playTone(600, 'triangle', 0.15, 0.3);
    playTone(800, 'triangle', 0.12, 0.25, 0.1);
  }

  return { init, setVolume, cardDeal, chipAdd, win, blackjack, lose, bust, buttonClick, deal_start, enabled, resume };
})();

document.addEventListener('DOMContentLoaded', () => SoundEngine.init());
document.addEventListener('touchstart', () => SoundEngine.resume(), { once: true });
