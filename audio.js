/**
 * SOLACE 静界 — Web Audio Procedural Soundscape Engine
 * Smoothly morphs from relaxing sleep white-noise + warm ambient pad
 * into sub-bass dread, accelerating heartbeat, spatial knocks, dissonant strings, and climax sting.
 */

export class HorrorAudioEngine {
  constructor() {
    this.ctx = null;
    this.isActive = false;
    this.dread = 0;
    this.masterGain = null;
    this.warmGain = null;
    this.rainGain = null;
    this.droneGain = null;
    this.dissonanceGain = null;
    this.warmOscs = [];
    this.droneOscs = [];
    this.dissonanceOscs = [];
    this.rainFilter = null;
    this.heartbeatTimer = null;
    this.knockTimer = null;
    this.climaxMuted = false;
  }

  async toggle() {
    if (!this.isActive) {
      await this.start();
      return true;
    } else {
      this.stop();
      return false;
    }
  }

  async start() {
    if (this.isActive) return;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this._buildGraph();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    this.isActive = true;
    this.climaxMuted = false;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.72, now, 0.5);

    this.updateDread(this.dread);
    this._scheduleHeartbeat();
    this._scheduleAmbientKnocks();
  }

  stop() {
    if (!this.isActive || !this.ctx) return;
    this.isActive = false;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(0.0001, now, 0.35);

    clearTimeout(this.heartbeatTimer);
    clearTimeout(this.knockTimer);
  }

  _buildGraph() {
    const ctx = this.ctx;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = 0.0001;
    this.masterGain.connect(ctx.destination);

    // 1. Warm calming pad (Cmaj9 voicing: C3, G3, B3, D4)
    this.warmGain = ctx.createGain();
    this.warmGain.gain.value = 0.22;
    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = 'lowpass';
    warmFilter.frequency.value = 680;
    this.warmGain.connect(warmFilter);
    warmFilter.connect(this.masterGain);

    const baseFreqs = [130.81, 196.0, 246.94, 293.66];
    baseFreqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      oscGain.gain.value = 0.18 / (i * 0.3 + 1);
      osc.connect(oscGain);
      oscGain.connect(this.warmGain);
      osc.start();
      this.warmOscs.push({ osc, baseFreq: freq });
    });

    // 2. Soft rain / static noise buffer (morphs from warm rain to harsh CRT static)
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
      b6 = white * 0.115926;
    }

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;

    this.rainFilter = ctx.createBiquadFilter();
    this.rainFilter.type = 'bandpass';
    this.rainFilter.frequency.value = 460;
    this.rainFilter.Q.value = 0.6;

    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0.25;

    noiseSrc.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    noiseSrc.start();

    // 3. Deep Sub-Bass Dread Drone (38Hz + 41.5Hz beating)
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.0001;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 140;
    this.droneGain.connect(droneFilter);
    droneFilter.connect(this.masterGain);

    [38.5, 41.2, 57.8].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.12 : 0.38;
      osc.connect(g);
      g.connect(this.droneGain);
      osc.start();
      this.droneOscs.push(osc);
    });

    // 4. Unsettling High Dissonant Bowed Harmonics (Waterphone / Horror Cluster)
    this.dissonanceGain = ctx.createGain();
    this.dissonanceGain.gain.value = 0.0001;

    const dissFilter = ctx.createBiquadFilter();
    dissFilter.type = 'bandpass';
    dissFilter.frequency.value = 1450;
    dissFilter.Q.value = 4.5;

    // Slow eerie LFO modulating gain slightly
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.23;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.04;
    lfo.connect(lfoDepth);
    lfoDepth.connect(this.dissonanceGain.gain);
    lfo.start();

    this.dissonanceGain.connect(dissFilter);
    dissFilter.connect(this.masterGain);

    [880, 932.33, 1318.5, 1396.9].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = 0.05;
      osc.connect(g);
      g.connect(this.dissonanceGain);
      osc.start();
      this.dissonanceOscs.push({ osc, baseFreq: freq });
    });
  }

  updateDread(dread) {
    this.dread = Math.max(0, Math.min(1, dread));
    if (!this.isActive || !this.ctx || this.climaxMuted) return;

    const now = this.ctx.currentTime;
    const d = this.dread;

    // Warm pad fades out & horribly detunes as dread passes 0.2
    const warmLevel = Math.max(0.0001, 0.26 * (1 - Math.min(1, d * 1.65)));
    this.warmGain.gain.setTargetAtTime(warmLevel, now, 0.25);

    this.warmOscs.forEach(({ osc, baseFreq }, idx) => {
      const detuneFactor = d < 0.18 ? 0 : (d - 0.18) * (idx % 2 === 0 ? -24 : 19);
      osc.frequency.setTargetAtTime(baseFreq + detuneFactor, now, 0.35);
    });

    // Rain morphs into colder high-frequency tape hiss / room static
    const rainFreq = 440 + d * 2400;
    const rainQ = 0.6 + d * 1.4;
    this.rainFilter.frequency.setTargetAtTime(rainFreq, now, 0.3);
    this.rainFilter.Q.setTargetAtTime(rainQ, now, 0.3);
    this.rainGain.gain.setTargetAtTime(0.22 + d * 0.28, now, 0.3);

    // Sub-bass drone swells from Act 2.5 onward
    const droneLevel = d < 0.25 ? 0.0001 : Math.pow((d - 0.25) / 0.75, 1.35) * 0.58;
    this.droneGain.gain.setTargetAtTime(droneLevel, now, 0.3);

    // High dissonant strings creep in after 0.58
    const dissLevel = d < 0.55 ? 0.0001 : Math.pow((d - 0.55) / 0.45, 1.5) * 0.32;
    this.dissonanceGain.gain.setTargetAtTime(dissLevel, now, 0.35);
    this.dissonanceOscs.forEach(({ osc, baseFreq }, i) => {
      const drift = Math.sin(now * (0.4 + i * 0.15)) * (d * 18);
      osc.frequency.setTargetAtTime(baseFreq + drift, now, 0.2);
    });
  }

  _scheduleHeartbeat() {
    clearTimeout(this.heartbeatTimer);
    if (!this.isActive) return;

    if (this.dread > 0.38 && !this.climaxMuted) {
      this._playHeartbeatPulse();
    }

    // Interval speeds up from 1100ms down to 430ms at peak dread
    const interval = Math.max(430, 1250 - this.dread * 820);
    this.heartbeatTimer = setTimeout(() => this._scheduleHeartbeat(), interval);
  }

  _playHeartbeatPulse() {
    if (!this.ctx || !this.isActive) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.55, (this.dread - 0.35) * 0.85);

    const thump = (delay, startFreq, peakGain) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(28, now + delay + 0.16);

      g.gain.setValueAtTime(0.0001, now + delay);
      g.gain.linearRampToValueAtTime(peakGain, now + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.2);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.22);
    };

    thump(0, 82, vol);
    thump(0.18, 66, vol * 0.65);
  }

  _scheduleAmbientKnocks() {
    clearTimeout(this.knockTimer);
    if (!this.isActive) return;

    if (this.dread > 0.48 && this.dread < 0.94 && !this.climaxMuted && Math.random() < 0.65) {
      this.playDistantKnock();
    }

    const nextDelay = 4500 + Math.random() * 6500;
    this.knockTimer = setTimeout(() => this._scheduleAmbientKnocks(), nextDelay);
  }

  playDistantKnock() {
    if (!this.ctx || !this.isActive) return;
    const now = this.ctx.currentTime;
    const pan = (Math.random() > 0.5 ? 1 : -1) * (0.55 + Math.random() * 0.4);
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = pan;
      panner.connect(this.masterGain);
    }
    const dest = panner || this.masterGain;

    // 2 or 3 eerie hollow knocks on wood
    const count = Math.random() > 0.45 ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const t = now + i * (0.24 + Math.random() * 0.07);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(145 + Math.random() * 25, t);
      osc.frequency.exponentialRampToValueAtTime(52, t + 0.08);

      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.18 + this.dread * 0.16, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  playSpookSting() {
    if (!this.ctx || !this.isActive) return;
    const now = this.ctx.currentTime;

    // Sudden metallic waterphone-like dissonance + low slam
    [622, 659, 1244, 1318].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, now + 0.65);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.09, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);

      osc.connect(g);
      g.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.75);
    });
  }

  playClimaxSequence() {
    if (!this.ctx || !this.isActive) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.climaxMuted = true;

    // 1. Complete sudden silence for 0.65s (terrifying horror movie vacuum)
    this.warmGain.gain.setTargetAtTime(0.0001, now, 0.04);
    this.rainGain.gain.setTargetAtTime(0.0001, now, 0.04);
    this.droneGain.gain.setTargetAtTime(0.0001, now, 0.04);
    this.dissonanceGain.gain.setTargetAtTime(0.0001, now, 0.04);

    // 2. Massive visceral horror sting at t + 0.72s
    const hitTime = now + 0.72;

    // Sub-bass cinematic boom
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(110, hitTime);
    sub.frequency.exponentialRampToValueAtTime(24, hitTime + 1.8);
    subGain.gain.setValueAtTime(0.0001, hitTime);
    subGain.gain.linearRampToValueAtTime(0.85, hitTime + 0.025);
    subGain.gain.exponentialRampToValueAtTime(0.0001, hitTime + 2.4);
    sub.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(hitTime);
    sub.stop(hitTime + 2.5);

    // Dissonant horror brass/violin shriek cluster
    const shriekFreqs = [311.13, 329.63, 466.16, 493.88, 932.33, 987.77, 1480];
    shriekFreqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = idx % 2 === 0 ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(f * 0.96, hitTime);
      osc.frequency.exponentialRampToValueAtTime(f * 1.07, hitTime + 0.45);
      osc.frequency.exponentialRampToValueAtTime(f * 0.88, hitTime + 2.2);

      filter.type = 'bandpass';
      filter.frequency.value = 1100 + idx * 180;
      filter.Q.value = 1.8;

      g.gain.setValueAtTime(0.0001, hitTime);
      g.gain.linearRampToValueAtTime(0.11, hitTime + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, hitTime + 2.35);

      osc.connect(filter);
      filter.connect(g);
      g.connect(this.masterGain);
      osc.start(hitTime);
      osc.stop(hitTime + 2.45);
    });

    // 3. Cold eerie room tone returns softly after the scream for the epilogue
    setTimeout(() => {
      if (!this.isActive || !this.ctx) return;
      const t = this.ctx.currentTime;
      this.rainFilter.frequency.setTargetAtTime(1600, t, 0.5);
      this.rainGain.gain.setTargetAtTime(0.12, t, 0.8);
      this.droneGain.gain.setTargetAtTime(0.16, t, 1.0);
    }, 3200);
  }
}
