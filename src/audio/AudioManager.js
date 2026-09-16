export class AudioManager {
  constructor(options = {}) {
    this.enabled = options.enabled !== false;
    this.onError = typeof options.onError === 'function' ? options.onError : null;
    this.context = null;
    this.masterGain = null;
    this.muted = false;
    this._boundVisibilityChange = this._handleVisibilityChange.bind(this);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this._boundVisibilityChange);
    }
  }

  ensureContext() {
    if (!this.enabled || this.muted || typeof window === 'undefined') {
      return null;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }
    try {
      if (!this.context) {
        this.context = new AudioContextClass();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = 0.24;
        this.masterGain.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') {
        this.context.resume().catch(() => {});
      }
      return this.context;
    } catch (error) {
      this.reportError(error, { phase: 'audio-context' });
      return null;
    }
  }

  playTone(options = {}) {
    const context = this.ensureContext();
    if (!context || !this.masterGain) {
      return false;
    }
    const frequency = Number.isFinite(options.frequency) ? options.frequency : 440;
    const duration = Number.isFinite(options.duration) ? Math.max(0.03, options.duration) : 0.12;
    const volume = Number.isFinite(options.volume) ? Math.max(0, Math.min(1, options.volume)) : 0.45;
    const type = ['sine', 'square', 'triangle', 'sawtooth'].includes(options.type) ? options.type : 'sine';
    const delay = Number.isFinite(options.delay) ? Math.max(0, options.delay) : 0;
    try {
      const startTime = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(20, frequency), startTime);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      oscillator.connect(gain);
      gain.connect(this.masterGain);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.03);
      return true;
    } catch (error) {
      this.reportError(error, { phase: 'audio-tone' });
      return false;
    }
  }

  playCollect(type = 'wood') {
    if (type === 'cash') {
      return this.playTone({ frequency: 880, duration: 0.09, type: 'triangle', volume: 0.35 });
    }
    if (type === 'rawMeat') {
      return this.playTone({ frequency: 320, duration: 0.09, type: 'triangle', volume: 0.3 });
    }
    return this.playTone({ frequency: 520, duration: 0.08, type: 'triangle', volume: 0.28 });
  }

  playSale() {
    this.playTone({ frequency: 660, duration: 0.08, type: 'sine', volume: 0.3 });
    return this.playTone({ frequency: 990, duration: 0.12, type: 'sine', volume: 0.28, delay: 0.08 });
  }

  playExpansion() {
    this.playTone({ frequency: 392, duration: 0.12, type: 'triangle', volume: 0.3 });
    this.playTone({ frequency: 523, duration: 0.12, type: 'triangle', volume: 0.3, delay: 0.1});
    return this.playTone({ frequency: 784, duration: 0.22, type: 'triangle', volume: 0.32, delay: 0.2});
  }

  playFishing() {
    return this.playTone({ frequency: 740, duration: 0.1, type: 'sine', volume: 0.28 });
  }

  playError() {
    return this.playTone({ frequency: 150, duration: 0.18, type: 'sawtooth', volume: 0.2 });
  }

  toggleMute() {
    const context = this.context;
    this.muted = !this.muted;
    if (context && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0.0001 : 0.24, context.currentTime, 0.02);
    }
    if (!this.muted) {
      this.ensureContext();
    }
    return this.muted;
  }

  dispose() {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this._boundVisibilityChange);
    }
    if (this.context && this.masterGain) {
      this.masterGain.disconnect();
    }
    if (this.context && this.context.state !== 'closed') {
      this.context.close().catch(() => {});
    }
    this.context = null;
    this.masterGain = null;
  }

  _handleVisibilityChange() {
    if (typeof document === 'undefined' || !document.hidden || !this.context || this.context.state !== 'running') {
      return;
    }
    this.context.suspend().catch(() => {});
  }

  reportError(error, context = {}) {
    if (this.onError) {
      try {
        this.onError(error, context);
      } catch {
        return;
      }
    }
  }
}
