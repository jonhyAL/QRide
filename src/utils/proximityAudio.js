// Utilidad Web Audio API para alertas sonoras acústicas de proximidad (ADAS de moto / radar de reversa)
class ProximityAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastBeepTime = 0;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  isMuted() {
    return this.muted;
  }

  playBeep(frequency = 880, duration = 0.08, type = 'sine', volume = 0.3) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Error sintetizando sonido de proximidad:', e);
    }
  }

  // Alerta de Advertencia (Objeto aproximándose ~2m a 4m)
  playWarningTone() {
    const now = Date.now();
    // Throttle cada 250ms para no saturar
    if (now - this.lastBeepTime < 240) return;
    this.lastBeepTime = now;
    this.playBeep(920, 0.07, 'triangle', 0.25);
  }

  // Alerta Crítica (Peligro Inminente < 1.8m)
  playCriticalTone() {
    const now = Date.now();
    // Throttle cada 140ms (pitido rápido y penetrante)
    if (now - this.lastBeepTime < 130) return;
    this.lastBeepTime = now;

    // Doble tono agudo tipo radar de colisión automotriz
    this.playBeep(1400, 0.06, 'sawtooth', 0.35);
    setTimeout(() => {
      this.playBeep(1100, 0.05, 'square', 0.25);
    }, 65);
  }

  // Sonido de confirmación al iniciar escaneo
  playArmTone() {
    this.playBeep(600, 0.08, 'sine', 0.2);
    setTimeout(() => this.playBeep(880, 0.12, 'sine', 0.2), 90);
  }
}

export const proximityAudio = new ProximityAudioSynthesizer();
