/**
 * SOLACE 静界 — Visual Horror Canvas & Interactive Set-Piece Effects
 * - FilmGrainOverlay: lightweight 35mm film grain
 * - ECGMonitor: live Act 3 heart rate oscilloscope
 * - WatchingEyesOverlay: Act 4–5 eyes opening in the dark & tracking cursor
 * - FlashlightCorridor: Act 4 flickering beam + doorway spook
 * - VHSClimaxRenderer: Act 5 night-vision CCTV feed & horror film climax sequence
 */

export class FilmGrainOverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tile = document.createElement('canvas');
    this.tile.width = 160;
    this.tile.height = 160;
    this.tileCtx = this.tile.getContext('2d');
    this.frame = 0;
    this.active = false;
    this._generateTile();
    this.pattern = this.ctx.createPattern(this.tile, 'repeat');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  _generateTile() {
    const img = this.tileCtx.createImageData(160, 160);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 95;
    }
    this.tileCtx.putImageData(img, 0, 0);
  }

  resize() {
    this.canvas.width = Math.ceil(window.innerWidth / 2);
    this.canvas.height = Math.ceil(window.innerHeight / 2);
  }

  tick(dread) {
    if (dread < 0.16) return;
    this.frame++;
    if (this.frame % 3 !== 0) return;

    const { width, height } = this.canvas;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    const ox = -Math.floor(Math.random() * 120);
    const oy = -Math.floor(Math.random() * 120);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = this.pattern;
    ctx.fillRect(-ox, -oy, width + 160, height + 160);
    ctx.restore();
  }
}

export class ECGMonitor {
  constructor(canvas, bpmEl, statusEl) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bpmEl = bpmEl;
    this.statusEl = statusEl;
    this.points = new Array(220).fill(0);
    this.phase = 0;
    this.bpm = 74;
    this.lastTextUpdate = 0;
  }

  tick(dread, now) {
    // Target BPM climbs violently between dread 0.40 and 0.78
    const norm = Math.max(0, Math.min(1, (dread - 0.35) / 0.45));
    const targetBpm = Math.round(72 + norm * 84 + Math.sin(now * 0.002) * 4);
    this.bpm += (targetBpm - this.bpm) * 0.06;

    if (now - this.lastTextUpdate > 380) {
      this.lastTextUpdate = now;
      const shown = Math.round(this.bpm);
      this.bpmEl.textContent = shown > 152 && Math.random() < 0.25 ? 'ERR' : String(shown);

      if (shown < 92) {
        this.statusEl.textContent = '呼吸略微急促';
      } else if (shown < 122) {
        this.statusEl.textContent = '检测到肾上腺素飙升';
      } else {
        this.statusEl.textContent = '极度恐慌 · 不要回头';
      }
    }

    // Advance ECG phase
    const speed = (this.bpm / 60) * 0.022;
    this.phase = (this.phase + speed) % 1;

    let y = 0;
    const p = this.phase;
    if (p > 0.10 && p < 0.16) {
      y = -0.18 * Math.sin(((p - 0.10) / 0.06) * Math.PI);
    } else if (p >= 0.22 && p < 0.25) {
      y = 0.22;
    } else if (p >= 0.25 && p < 0.29) {
      y = -0.92;
    } else if (p >= 0.29 && p < 0.33) {
      y = 0.38;
    } else if (p >= 0.42 && p < 0.54) {
      y = -0.26 * Math.sin(((p - 0.42) / 0.12) * Math.PI);
    }

    // Occasional horror jitter
    if (dread > 0.6 && Math.random() < 0.08) {
      y += (Math.random() - 0.5) * 0.45;
    }

    this.points.push(y);
    if (this.points.length > 220) this.points.shift();

    const { width, height } = this.canvas;
    const ctx = this.ctx;
    ctx.fillStyle = '#070809';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid
    ctx.strokeStyle = 'rgba(180, 30, 30, 0.09)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < width; gx += 26) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, height);
      ctx.stroke();
    }
    for (let gy = 0; gy < height; gy += 24) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(width, gy);
      ctx.stroke();
    }

    // Waveform
    const mid = height * 0.58;
    const amp = height * 0.42;
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = this.bpm > 110 ? '#ef4444' : '#34d399';
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.strokeStyle;

    for (let i = 0; i < this.points.length; i++) {
      const px = (i / (this.points.length - 1)) * width;
      const py = mid + this.points[i] * amp;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

export class WatchingEyesOverlay {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eyes = [];
    this.mouseX = window.innerWidth / 2;
    this.mouseY = window.innerHeight / 2;

    this.resize();
    this._spawnEyes();

    window.addEventListener('resize', () => {
      this.resize();
      this._spawnEyes();
    });

    window.addEventListener('pointermove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }, { passive: true });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _spawnEyes() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.eyes = [];

    // Place 24 eyes around the dark perimeter so they frame the reader without blocking center text
    const count = w < 768 ? 14 : 24;
    for (let i = 0; i < count; i++) {
      let x, y;
      const side = i % 4;
      if (side === 0) {
        // Left margin
        x = 30 + Math.random() * Math.min(200, w * 0.2);
        y = 85 + Math.random() * (h - 150);
      } else if (side === 1) {
        // Right margin
        x = w - 30 - Math.random() * Math.min(200, w * 0.2);
        y = 85 + Math.random() * (h - 150);
      } else if (side === 2) {
        // Upper dark pockets
        x = w * 0.22 + Math.random() * (w * 0.56);
        y = 82 + Math.random() * 75;
      } else {
        // Bottom dark pockets
        x = w * 0.18 + Math.random() * (w * 0.64);
        y = h - 45 - Math.random() * 85;
      }

      this.eyes.push({
        x,
        y,
        size: 16 + Math.random() * 19,
        threshold: 0.70 + (i / count) * 0.22,
        openness: 0,
        blinkTimer: 2 + Math.random() * 6,
        isBlinking: false,
        blinkProgress: 0,
        crimson: Math.random() < 0.32,
        tilt: (Math.random() - 0.5) * 0.28,
      });
    }
  }

  tick(dread, dt) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (dread < 0.68) return;

    for (const eye of this.eyes) {
      const shouldBeOpen = dread >= eye.threshold;
      const targetOpen = shouldBeOpen ? 1 : 0;
      eye.openness += (targetOpen - eye.openness) * Math.min(1, dt * 2.5);

      if (eye.openness < 0.04) continue;

      // Asynchronous blinking
      eye.blinkTimer -= dt;
      if (eye.blinkTimer <= 0 && !eye.isBlinking) {
        eye.isBlinking = true;
        eye.blinkProgress = 0;
      }
      let lidFactor = eye.openness;
      if (eye.isBlinking) {
        eye.blinkProgress += dt * 7.5;
        if (eye.blinkProgress >= Math.PI) {
          eye.isBlinking = false;
          eye.blinkTimer = 2.4 + Math.random() * 5.8;
        } else {
          lidFactor *= Math.max(0.03, 1 - Math.sin(eye.blinkProgress));
        }
      }

      const r = eye.size;
      const h = r * 0.52 * lidFactor;

      ctx.save();
      ctx.translate(eye.x, eye.y);
      ctx.rotate(eye.tilt);

      // Soft dark socket shadow
      const socketGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.65);
      socketGrad.addColorStop(0, 'rgba(0,0,0,0.85)');
      socketGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = socketGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.65, 0, Math.PI * 2);
      ctx.fill();

      // Clip to almond eyelid shape
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.quadraticCurveTo(0, -h * 1.55, r, 0);
      ctx.quadraticCurveTo(0, h * 1.55, -r, 0);
      ctx.closePath();

      // Pale bloodshot sclera
      const scleraGrad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
      scleraGrad.addColorStop(0, eye.crimson ? '#dfd0cf' : '#dcd8ce');
      scleraGrad.addColorStop(0.7, eye.crimson ? '#b87777' : '#9c968b');
      scleraGrad.addColorStop(1, '#3d1515');
      ctx.fillStyle = scleraGrad;
      ctx.fill();

      ctx.save();
      ctx.clip();

      // Track cursor smoothly
      const dx = this.mouseX - eye.x;
      const dy = this.mouseY - eye.y;
      const angle = Math.atan2(dy, dx);
      const dist = Math.min(r * 0.34, Math.hypot(dx, dy) * 0.025);
      const px = Math.cos(angle - eye.tilt) * dist;
      const py = Math.sin(angle - eye.tilt) * dist * 0.65;

      // Iris
      const irisR = r * 0.41;
      ctx.fillStyle = eye.crimson ? '#4a0c0c' : '#1b1d1c';
      ctx.beginPath();
      ctx.arc(px, py, irisR, 0, Math.PI * 2);
      ctx.fill();

      // Dilated dark pupil
      ctx.fillStyle = '#030304';
      ctx.beginPath();
      ctx.arc(px, py, irisR * 0.58, 0, Math.PI * 2);
      ctx.fill();

      // Cold wet glint
      ctx.fillStyle = 'rgba(245, 240, 235, 0.78)';
      ctx.beginPath();
      ctx.arc(px - irisR * 0.28, py - irisR * 0.25, Math.max(1.2, r * 0.09), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Dark lid outline
      ctx.strokeStyle = 'rgba(15, 5, 5, 0.9)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.restore();
    }
  }
}

export class FlashlightCorridor {
  constructor(stageEl, maskEl, batteryEl, onDoorSpook) {
    this.stage = stageEl;
    this.mask = maskEl;
    this.batteryEl = batteryEl;
    this.onDoorSpook = onDoorSpook;
    this.doorHoverMs = 0;
    this.spooked = false;
    this.inDoorZone = false;
    this.battery = 14;

    this._bindEvents();
    this._startFlickerLoop();
  }

  _bindEvents() {
    const updatePos = (clientX, clientY) => {
      const rect = this.stage.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      this.mask.style.setProperty('--mx', `${x}px`);
      this.mask.style.setProperty('--my', `${y}px`);

      const relX = x / rect.width;
      const relY = y / rect.height;
      this.inDoorZone = relX > 0.42 && relX < 0.58 && relY > 0.25 && relY < 0.72;
    };

    this.stage.addEventListener('pointermove', (e) => {
      updatePos(e.clientX, e.clientY);
    });

    this.stage.addEventListener('touchmove', (e) => {
      if (e.touches[0]) {
        updatePos(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });
  }

  _startFlickerLoop() {
    setInterval(() => {
      if (this.inDoorZone && !this.spooked) {
        this.doorHoverMs += 150;
        if (this.doorHoverMs > 1100) {
          this.spooked = true;
          this.stage.classList.add('door-spooked');
          this.mask.classList.add('flicker-off');
          if (this.onDoorSpook) this.onDoorSpook();
          setTimeout(() => this.mask.classList.remove('flicker-off'), 210);
          setTimeout(() => {
            this.stage.classList.remove('door-spooked');
            this.spooked = false;
            this.doorHoverMs = 0;
          }, 1900);
        }
      } else {
        this.doorHoverMs = Math.max(0, this.doorHoverMs - 100);
      }

      // Organic dying-battery flashlight flicker
      if (Math.random() < 0.085) {
        this.mask.classList.add('flicker-off');
        setTimeout(() => this.mask.classList.remove('flicker-off'), 70 + Math.random() * 140);
        if (this.battery > 3 && Math.random() < 0.35) {
          this.battery--;
          this.batteryEl.textContent = `${this.battery}%`;
        }
      }
    }, 150);
  }
}

export class VHSClimaxRenderer {
  constructor(canvas, sourceImg) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.img = sourceImg;
    this.mode = 'idle'; // 'idle' | 'static' | 'approach' | 'lunge' | 'black'
    this.zoom = 1.02;
    this.lungeProgress = 0;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = Math.max(480, Math.floor(parent.clientWidth));
    this.canvas.height = Math.max(320, Math.floor(parent.clientHeight));
  }

  setMode(mode) {
    this.mode = mode;
    if (mode === 'lunge') {
      this.lungeProgress = 0;
    }
  }

  tick(now) {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    if (this.mode === 'black') {
      ctx.fillStyle = '#020203';
      ctx.fillRect(0, 0, width, height);
      return;
    }

    if (this.mode === 'static') {
      this._drawStatic(ctx, width, height, 0.95);
      ctx.fillStyle = 'rgba(220, 235, 235, 0.85)';
      ctx.font = 'bold 28px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO SIGNAL // 信号中断', width / 2, height / 2);
      return;
    }

    ctx.fillStyle = '#020304';
    ctx.fillRect(0, 0, width, height);

    // Camera breathing sway & creep zoom centered right onto the dark doorway
    let targetZoom = 1.65 + Math.sin(now * 0.0007) * 0.03;
    let shakeX = Math.sin(now * 0.0017) * 5;
    let shakeY = Math.cos(now * 0.0013) * 4;
    let brightness = 0.62;

    if (this.mode === 'approach') {
      targetZoom = 2.45;
      shakeX = (Math.random() - 0.5) * 16;
      shakeY = (Math.random() - 0.5) * 12;
      brightness = 0.78;
    } else if (this.mode === 'lunge') {
      this.lungeProgress = Math.min(1, this.lungeProgress + 0.045);
      targetZoom = 2.75 + this.lungeProgress * 1.15;
      shakeX = (Math.random() - 0.5) * 38;
      shakeY = (Math.random() - 0.5) * 28;
      brightness = 0.95;
    }

    this.zoom += (targetZoom - this.zoom) * 0.14;

    if (this.img && this.img.complete && this.img.naturalWidth > 0) {
      const iw = this.img.naturalWidth;
      const ih = this.img.naturalHeight;
      const scale = Math.max(width / iw, height / ih) * this.zoom;
      const dw = iw * scale;
      const dh = ih * scale;
      // Offset slightly so the doorway & pale gripping hand sit dead-center in the CCTV frame
      const dx = (width - dw) / 2 + shakeX;
      const dy = (height - dh) / 2 - height * 0.04 + shakeY;

      ctx.save();
      ctx.filter = this.mode === 'lunge'
        ? `contrast(1.9) brightness(${brightness}) grayscale(0.9)`
        : `contrast(1.45) brightness(${brightness}) grayscale(0.85) hue-rotate(65deg)`;
      ctx.drawImage(this.img, dx, dy, dw, dh);

      // Night-vision greenish-cyan phosphor tint
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this.mode === 'lunge' ? 'rgba(180, 90, 90, 0.55)' : 'rgba(145, 205, 190, 0.52)';
      ctx.fillRect(0, 0, width, height);

      // Red chromatic ghosting during approach/lunge
      if (this.mode === 'lunge' || this.mode === 'approach') {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = this.mode === 'lunge' ? 0.45 : 0.2;
        ctx.filter = 'contrast(2.1) hue-rotate(-140deg) saturate(3)';
        ctx.drawImage(this.img, dx + 10, dy - 4, dw, dh);
      }
      ctx.restore();
    }

    // Composite terrifying infrared apparition emerging out of the pitch-black doorway
    this._drawEmergingEntity(ctx, width, height, now, shakeX, shakeY);

    // VHS horizontal tracking tear bars
    if (Math.random() < (this.mode === 'lunge' ? 0.75 : 0.25)) {
      const barY = Math.random() * height;
      const barH = 4 + Math.random() * (this.mode === 'lunge' ? 46 : 16);
      ctx.fillStyle = this.mode === 'lunge'
        ? 'rgba(200, 25, 25, 0.22)'
        : 'rgba(180, 210, 210, 0.08)';
      ctx.fillRect(0, barY, width, barH);
    }

    // Subtle analog snow overlay
    this._drawStatic(ctx, width, height, this.mode === 'lunge' ? 0.24 : 0.11);

    // Heavy IR lens vignette
    const vig = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.22,
      width / 2, height / 2, Math.max(width, height) * 0.72
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.92)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, width, height);
  }

  _drawStatic(ctx, width, height, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 420; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const w = 1 + Math.random() * 4;
      const v = Math.floor(150 + Math.random() * 105);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, w, 1.5);
    }
    ctx.restore();
  }

  _drawEmergingEntity(ctx, width, height, now, shakeX, shakeY) {
    // In idle mode: barely perceptible pinpoint IR eye reflection deep inside the dark doorway
    const cx = width * 0.475 + shakeX * 0.6;
    const cy = height * 0.44 + shakeY * 0.6;

    if (this.mode === 'idle') {
      const glint = 0.28 + Math.sin(now * 0.003) * 0.14;
      ctx.save();
      ctx.fillStyle = `rgba(215, 245, 240, ${glint})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(200, 255, 240, 0.7)';
      ctx.beginPath();
      ctx.arc(cx - 11, cy, 1.8, 0, Math.PI * 2);
      ctx.arc(cx + 10, cy + 1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    // Approach & Lunge: gaunt, tilted, hollow-eyed pale apparition rushing straight at the lens
    const p = this.mode === 'lunge' ? 0.55 + this.lungeProgress * 0.75 : 0.42;
    const headW = width * 0.16 * p;
    const headH = height * 0.34 * p;
    const tilt = this.mode === 'lunge' ? -0.22 + Math.sin(now * 0.04) * 0.08 : -0.16;

    ctx.save();
    ctx.translate(width * 0.5 + shakeX * 1.15, height * 0.48 + shakeY * 1.15);
    ctx.rotate(tilt);

    // Suffocating pitch-black shadow body behind head
    const bodyGrad = ctx.createRadialGradient(0, headH * 0.5, headW * 0.2, 0, headH * 0.6, headW * 2.8);
    bodyGrad.addColorStop(0, 'rgba(0, 0, 0, 0.98)');
    bodyGrad.addColorStop(0.55, 'rgba(2, 2, 4, 0.92)');
    bodyGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, headH * 0.75, headW * 2.2, headH * 2.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Uncanny gaunt pale face lit harshly by IR camera LED
    const faceGrad = ctx.createRadialGradient(0, -headH * 0.12, headW * 0.1, 0, 0, headH * 1.15);
    faceGrad.addColorStop(0, this.mode === 'lunge' ? 'rgba(218, 224, 220, 0.88)' : 'rgba(175, 192, 186, 0.52)');
    faceGrad.addColorStop(0.55, 'rgba(72, 78, 76, 0.46)');
    faceGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.moveTo(0, -headH);
    ctx.bezierCurveTo(headW * 0.95, -headH * 0.85, headW * 0.85, headH * 0.15, headW * 0.48, headH * 0.78);
    ctx.quadraticCurveTo(0, headH * 1.18, -headW * 0.48, headH * 0.78);
    ctx.bezierCurveTo(-headW * 0.85, headH * 0.15, -headW * 0.95, -headH * 0.85, 0, -headH);
    ctx.fill();

    // Deep sunken pitch-black eye sockets
    ctx.fillStyle = '#010102';
    ctx.beginPath();
    ctx.ellipse(-headW * 0.34, -headH * 0.16, headW * 0.24, headH * 0.17, -0.12, 0, Math.PI * 2);
    ctx.ellipse(headW * 0.34, -headH * 0.12, headW * 0.25, headH * 0.18, 0.14, 0, Math.PI * 2);
    ctx.fill();

    // Pinpoint ghostly infrared eye-shine inside the voids
    ctx.fillStyle = this.mode === 'lunge' ? '#ffecec' : '#d8f5f0';
    ctx.shadowBlur = 16;
    ctx.shadowColor = this.mode === 'lunge' ? '#ef4444' : '#c8fff5';
    const pupilR = Math.max(2.5, headW * 0.042);
    ctx.beginPath();
    ctx.arc(-headW * 0.32, -headH * 0.15, pupilR, 0, Math.PI * 2);
    ctx.arc(headW * 0.32, -headH * 0.11, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Unnaturally elongated dark gaping jaw
    const mouthOpen = this.mode === 'lunge' ? headH * 0.48 : headH * 0.24;
    ctx.fillStyle = '#020001';
    ctx.beginPath();
    ctx.ellipse(0, headH * 0.45, headW * 0.32, mouthOpen, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawFallbackSilhouette(ctx, width, height, now) {
    // Deep corridor doorway with glowing pinpoint eyes in darkness
    ctx.fillStyle = '#070a0b';
    ctx.fillRect(width * 0.34, height * 0.08, width * 0.32, height * 0.88);
    ctx.fillStyle = '#020203';
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.45, width * 0.11, height * 0.22, 0.12, 0, Math.PI * 2);
    ctx.fill();

    const pulse = 0.7 + Math.sin(now * 0.01) * 0.3;
    ctx.fillStyle = `rgba(230, 245, 245, ${pulse})`;
    ctx.beginPath();
    ctx.arc(width * 0.47, height * 0.41, 3, 0, Math.PI * 2);
    ctx.arc(width * 0.535, height * 0.425, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}
