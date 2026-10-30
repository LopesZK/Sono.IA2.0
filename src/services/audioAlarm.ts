import { AlarmSoundType } from '../types/detector';

class AudioAlarmService {
  private ctx: AudioContext | null = null;
  private isAlarmPlaying = false;
  private intervalId: number | null = null;
  private currentOscillators: OscillatorNode[] = [];
  private masterGain: GainNode | null = null;
  private lastSpeechTime = 0;

  // Initialize or resume AudioContext after user gesture
  public initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isPlaying(): boolean {
    return this.isAlarmPlaying;
  }

  public startAlarm(
    soundType: AlarmSoundType = 'shrill-buzzer',
    volume = 1.0,
    voiceAlerts = true,
    vibration = true
  ): void {
    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;

    try {
      const ctx = this.initContext();

      // Setup Master Gain
      const master = ctx.createGain();
      master.gain.setValueAtTime(Math.max(0.1, Math.min(1.0, volume)), ctx.currentTime);
      master.connect(ctx.destination);
      this.masterGain = master;

      // Start vibrating if supported
      if (vibration && typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 700]);
      }

      // Voice warning in Portuguese
      if (voiceAlerts) {
        this.speakWarning('Atenção! Acorde! Alerta de sono!');
      }

      // Start specific sound pattern
      switch (soundType) {
        case 'emergency-siren':
          this.playEmergencySiren(ctx, master);
          break;
        case 'two-tone':
          this.playTwoTone(ctx, master);
          break;
        case 'pulsed-alarm':
          this.playPulsedAlarm(ctx, master);
          break;
        case 'shrill-buzzer':
        default:
          this.playShrillBuzzer(ctx, master);
          break;
      }
    } catch (err) {
      console.error('Failed to trigger audio alarm:', err);
    }
  }

  public stopAlarm(): void {
    this.isAlarmPlaying = false;

    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.currentOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    });
    this.currentOscillators = [];

    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // disconnected
      }
      this.masterGain = null;
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0); // stop vibration
    }
  }

  public testAlarm(soundType: AlarmSoundType, volume = 0.8, voice = false): void {
    this.stopAlarm();
    this.startAlarm(soundType, volume, voice, true);
    setTimeout(() => {
      this.stopAlarm();
    }, 1800);
  }

  public playGentleDrowsyChime(volume = 0.6): void {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Two warm warning beeps (like modern car lane assist / fatigue alert)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(880.0, now + 0.12); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.04);
      gain.gain.setValueAtTime(volume * 0.7, now + 0.1);
      gain.gain.setValueAtTime(0.01, now + 0.11);
      gain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([150, 100, 150]);
      }
    } catch (err) {
      console.warn('Could not play drowsy chime:', err);
    }
  }

  public speakWarning(text: string): void {
    const now = Date.now();
    if (now - this.lastSpeechTime < 3000) return; // avoid speech queue buildup
    this.lastSpeechTime = now;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  // --- Sound Implementations ---

  // Piercing high-frequency car buzzer (1400Hz - 2400Hz saw pulse)
  private playShrillBuzzer(ctx: AudioContext, destination: GainNode): void {
    const burst = () => {
      if (!this.isAlarmPlaying) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Aggressive frequency alternation
      osc.frequency.setValueAtTime(1760, now); // A6
      osc.frequency.setValueAtTime(2637, now + 0.08); // E7
      osc.frequency.setValueAtTime(1760, now + 0.16);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.setValueAtTime(0.9, now + 0.22);
      gain.gain.linearRampToValueAtTime(0.0, now + 0.24);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 0.25);
    };

    burst();
    this.intervalId = window.setInterval(burst, 280);
  }

  // Frequency-modulated sweeping siren
  private playEmergencySiren(ctx: AudioContext, destination: GainNode): void {
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100, ctx.currentTime);

    // LFO to modulate siren frequency up and down fast (3Hz)
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(3.5, ctx.currentTime);
    lfoGain.gain.setValueAtTime(450, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0.9, ctx.currentTime);
    osc.connect(gain);
    gain.connect(destination);

    osc.start();
    lfo.start();

    this.currentOscillators.push(osc, lfo);
  }

  // Two-tone European emergency vehicle alert (Hi-Lo horn)
  private playTwoTone(ctx: AudioContext, destination: GainNode): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    gain.gain.setValueAtTime(0.5, ctx.currentTime);

    let isHigh = true;
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(1174.66, now); // D6

    osc.connect(gain);
    gain.connect(destination);
    osc.start();
    this.currentOscillators.push(osc);

    this.intervalId = window.setInterval(() => {
      if (!this.isAlarmPlaying || !this.ctx) return;
      isHigh = !isHigh;
      const targetFreq = isHigh ? 1174.66 : 880.0;
      osc.frequency.setValueAtTime(targetFreq, this.ctx.currentTime);
    }, 240);
  }

  // Fast pulsating warning beep
  private playPulsedAlarm(ctx: AudioContext, destination: GainNode): void {
    const pulse = () => {
      if (!this.isAlarmPlaying) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);

      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 0.13);
    };

    pulse();
    this.intervalId = window.setInterval(pulse, 150);
  }
}

export const audioAlarm = new AudioAlarmService();
