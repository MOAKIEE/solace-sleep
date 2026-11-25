/**
 * SOLACE 静界 — Main Descent Orchestrator
 * Coordinates scroll-driven palette/typography decay, fourth-wall telemetry,
 * unprompted live support chat corruption, scroll-up trap, and Act 5 horror climax.
 */

import { HorrorAudioEngine } from './audio.js';
import {
  FilmGrainOverlay,
  ECGMonitor,
  WatchingEyesOverlay,
  FlashlightCorridor,
  VHSClimaxRenderer,
} from './effects.js';

const root = document.documentElement;
const body = document.body;

const audio = new HorrorAudioEngine();
const grain = new FilmGrainOverlay(document.getElementById('grain-canvas'));
const ecg = new ECGMonitor(
  document.getElementById('ecg-canvas'),
  document.getElementById('bpm-value'),
  document.getElementById('bpm-status')
);
const eyes = new WatchingEyesOverlay(document.getElementById('eyes-canvas'));
const climaxRenderer = new VHSClimaxRenderer(
  document.getElementById('climax-canvas'),
  document.getElementById('climax-source-img')
);

// State
let currentDread = 0;
let currentAct = 1;
let maxDreadReached = 0;
let lockWarningTriggered = false;
let climaxTriggered = false;
let climaxAutoTimer = null;
let lastMouseMoveAt = performance.now();
let lastFrameTime = performance.now();
let chatStageReached = 0;
let unreadCount = 0;

// Elements
const audioToggleBtn = document.getElementById('audio-toggle');
const audioLabel = audioToggleBtn.querySelector('.audio-label');
const heroSoundBtn = document.getElementById('hero-sound-btn');
const flashOverlay = document.getElementById('flash-overlay');
const lockWarning = document.getElementById('lock-warning');
const fourthWallSub = document.getElementById('fourth-wall-subtitle');
const liveClockEl = document.getElementById('live-clock');
const cctvTimestampEl = document.getElementById('cctv-timestamp');
const distanceNoteEl = document.getElementById('distance-note');
const stillnessEl = document.getElementById('stillness-message');
const deviceMetaEl = document.getElementById('device-meta');
const liveLogFeed = document.getElementById('live-log-feed');

// Support Widget Elements
const supportWidget = document.getElementById('support-widget');
const supportToggle = document.getElementById('support-toggle');
const supportPanel = document.getElementById('support-panel');
const supportClose = document.getElementById('support-close');
const supportMessages = document.getElementById('support-messages');
const supportUnread = document.getElementById('support-unread');
const supportAgentName = document.getElementById('support-agent-name');
const supportAgentStatus = document.getElementById('support-agent-status');
const supportLabel = document.getElementById('support-label');
const supportAvatar = document.getElementById('support-avatar');
const quickReplyBtn = document.getElementById('quick-reply-btn');

// Climax Elements
const climaxPrompt = document.getElementById('climax-prompt');
const climaxTriggerBtn = document.getElementById('climax-trigger-btn');
const climaxScreamText = document.getElementById('climax-scream-text');
const climaxDistEl = document.getElementById('climax-dist');
const climaxSignalEl = document.getElementById('climax-signal');
const epilogueScreen = document.getElementById('epilogue-screen');
const epilogueTypewriter = document.getElementById('epilogue-typewriter');
const epilogueActions = document.getElementById('epilogue-actions');
const wakeBtn = document.getElementById('wake-btn');

// Color interpolation helper for seamless background transition
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerpColor(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return `rgb(${r}, ${g}, ${bl})`;
}

// Multi-stop color progression from pristine warm white -> hospital grey -> oppressive dark -> pitch black
const BG_STOPS = [
  { p: 0.0, color: '#faf9f6' },
  { p: 0.22, color: '#e9eae3' },
  { p: 0.42, color: '#b5b8b1' },
  { p: 0.56, color: '#1b1d1d' },
  { p: 0.74, color: '#090809' },
  { p: 1.0, color: '#020203' },
];

function getBackgroundAt(dread) {
  for (let i = 0; i < BG_STOPS.length - 1; i++) {
    const s1 = BG_STOPS[i];
    const s2 = BG_STOPS[i + 1];
    if (dread >= s1.p && dread <= s2.p) {
      const localT = (dread - s1.p) / (s2.p - s1.p);
      return lerpColor(s1.color, s2.color, localT);
    }
  }
  return '#020203';
}

// Flashlight Corridor Setup
new FlashlightCorridor(
  document.getElementById('flashlight-stage'),
  document.getElementById('flashlight-mask'),
  document.getElementById('battery-pct'),
  () => {
    audio.playSpookSting();
    triggerFlash('flash-cold', 110);
    body.classList.add('screen-shake');
    setTimeout(() => body.classList.remove('screen-shake'), 480);
  }
);

function triggerFlash(className, durationMs = 130) {
  flashOverlay.className = className;
  setTimeout(() => {
    flashOverlay.className = '';
  }, durationMs);
}

// Audio Toggle UI
async function toggleAudioUI() {
  const on = await audio.toggle();
  audioToggleBtn.classList.toggle('is-active', on);
  audioToggleBtn.setAttribute('aria-pressed', String(on));
  updateAudioButtonLabel(on);
}

function updateAudioButtonLabel(isOn) {
  if (!isOn) {
    audioLabel.textContent = currentAct >= 4 ? '打开声音（慎点）' : '开启白噪音';
  } else {
    if (currentAct <= 2) audioLabel.textContent = '白噪音播放中';
    else if (currentAct === 3) audioLabel.textContent = '监听声场已开启';
    else audioLabel.textContent = '关不掉的声音';
  }
}

audioToggleBtn.addEventListener('click', toggleAudioUI);
heroSoundBtn.addEventListener('click', async () => {
  if (!audio.isActive) {
    await toggleAudioUI();
  }
  heroSoundBtn.textContent = '正在播放 · 柔和雨声';
});

// Pricing CTA reactions
document.querySelectorAll('.price-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.id === 'eternal-btn') {
      btn.textContent = '契约已生效 · 不可撤销';
      triggerFlash('flash-red', 160);
      audio.playSpookSting();
      pushSupportMessage('你刚刚点下了“同意”。今晚记得不要关窗帘。', 'horror', true);
    } else {
      btn.textContent = '该方案已停用 · 仅剩永恒版';
    }
  });
});

// Third reviewer watching mini-eye tracks cursor
const miniEye = document.querySelector('.mini-eye');
window.addEventListener('pointermove', (e) => {
  lastMouseMoveAt = performance.now();
  if (!miniEye) return;
  const rect = miniEye.getBoundingClientRect();
  const dx = e.clientX - (rect.left + rect.width / 2);
  const dy = e.clientY - (rect.top + rect.height / 2);
  const angle = Math.atan2(dy, dx);
  miniEye.style.setProperty('--eye-x', `${Math.cos(angle) * 5.5}px`);
  miniEye.style.setProperty('--eye-y', `${Math.sin(angle) * 2.5}px`);
}, { passive: true });

// =========================================================================
// LIVE SUPPORT WIDGET (Polite -> Concerned -> Terrifying)
// =========================================================================
function setChatOpen(open) {
  supportPanel.hidden = !open;
  supportToggle.setAttribute('aria-expanded', String(open));
  if (open) {
    unreadCount = 0;
    supportUnread.hidden = true;
    supportMessages.scrollTop = supportMessages.scrollHeight;
  }
}

supportToggle.addEventListener('click', () => setChatOpen(supportPanel.hidden));
supportClose.addEventListener('click', () => setChatOpen(false));

let quickReplyStep = 0;
const QUICK_REPLIES = [
  {
    q: '你们的设备安全吗？',
    a: '完全安全！所有用户入睡后都非常安静，从来没有人投诉过。',
    type: 'bot',
    nextQ: '评价里那个周小姐怎么回事？',
  },
  {
    q: '评价里那个周小姐怎么回事？',
    a: '系统误显示而已……请您不要再往下翻了，下面的测试页早就该下线了。',
    type: 'horror',
    nextQ: '你不是客服，你是谁？',
  },
  {
    q: '你不是客服，你是谁？',
    a: '我就在你屏幕后面。顺便一提，你身后的门好像没关严。',
    type: 'horror',
    nextQ: '停止对话',
  },
];

quickReplyBtn.addEventListener('click', () => {
  const item = QUICK_REPLIES[quickReplyStep];
  if (!item) {
    pushSupportMessage('你无法离开对话。', 'horror', false);
    return;
  }
  const userBubble = document.createElement('div');
  userBubble.className = 'chat-msg user';
  userBubble.textContent = item.q;
  supportMessages.appendChild(userBubble);
  supportMessages.scrollTop = supportMessages.scrollHeight;

  quickReplyStep++;
  quickReplyBtn.textContent = item.nextQ;

  setTimeout(() => {
    pushSupportMessage(item.a, item.type, false);
  }, 550);
});

function pushSupportMessage(text, type = 'horror', autoPop = false) {
  const msg = document.createElement('div');
  msg.className = `chat-msg ${type}`;
  msg.textContent = text;
  supportMessages.appendChild(msg);
  supportMessages.scrollTop = supportMessages.scrollHeight;

  if (supportPanel.hidden) {
    unreadCount++;
    supportUnread.textContent = String(unreadCount);
    supportUnread.hidden = false;
  }

  if (autoPop) {
    setChatOpen(true);
  }
}

function advanceSupportScript(dread) {
  if (dread > 0.30 && chatStageReached < 1) {
    chatStageReached = 1;
    pushSupportMessage('您好，注意到您停留了很久。需要我为您安排今晚的深度入睡吗？', 'bot', false);
  }
  if (dread > 0.50 && chatStageReached < 2) {
    chatStageReached = 2;
    supportWidget.classList.add('is-corrupted');
    supportAgentName.textContent = '小静 [信号异常]';
    supportAgentStatus.textContent = '距离你 2.1 米';
    supportLabel.textContent = '它在发消息';
    supportAvatar.textContent = '静';
    pushSupportMessage('请立刻停止向下滚动。下面的内容不是我们写的，我们删了三次，它自己又长回来了。', 'horror', true);
    audio.playDistantKnock();
  }
  if (dread > 0.72 && chatStageReached < 3) {
    chatStageReached = 3;
    supportAgentName.textContent = '不要回头';
    supportAgentStatus.textContent = '在线 · 正在看你的摄像头';
    supportAvatar.textContent = '●';
    pushSupportMessage('你听见门把手的响声了吗？千万不要转头，它以为你还没发现它。', 'horror', true);
  }
  if (dread > 0.88 && chatStageReached < 4) {
    chatStageReached = 4;
    pushSupportMessage('太晚了。我已经进来了。', 'horror', false);
  }
}

// =========================================================================
// SUBTLE TEXT FLICKER ENGINE (Brief horrifying flashes on innocent words)
// =========================================================================
const flickerEls = Array.from(document.querySelectorAll('.flicker-text')).map((el) => ({
  el,
  original: el.textContent,
  alt: el.dataset.alt,
}));

setInterval(() => {
  if (currentDread < 0.06 || currentDread > 0.65) return;
  const prob = 0.14 + currentDread * 0.45;
  if (Math.random() > prob) return;

  const target = flickerEls[Math.floor(Math.random() * flickerEls.length)];
  if (!target || !target.alt) return;

  target.el.textContent = target.alt;
  target.el.classList.add('is-flickering');

  setTimeout(() => {
    target.el.textContent = target.original;
    target.el.classList.remove('is-flickering');
  }, 110 + Math.random() * 140);
}, 1450);

// =========================================================================
// FOURTH-WALL LIVE CLOCK & STILLNESS OBSERVER
// =========================================================================
function pad(n) {
  return String(n).padStart(2, '0');
}

function updateFourthWallTelemetry() {
  const now = new Date();
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const timeStr = `${hh}:${mm}:${ss}`;

  if (liveClockEl) liveClockEl.textContent = timeStr;
  if (cctvTimestampEl) {
    cctvTimestampEl.textContent = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${timeStr}`;
  }

  if (fourthWallSub) {
    const hour = now.getHours();
    const timeComment = (hour >= 22 || hour < 5)
      ? `现在已经是本地时间 ${hh}:${mm}，房间里只剩屏幕光亮着。`
      : `现在是本地时间 ${hh}:${mm}，但你身后的阴影看起来比平时更深。`;
    fourthWallSub.textContent = `${timeComment} 静界传感器已自动接管。`;
  }

  if (deviceMetaEl) {
    deviceMetaEl.textContent = `VIEWPORT: ${window.innerWidth}×${window.innerHeight} // DREAD: ${Math.round(currentDread * 100)}% // CAM-LINK: ACTIVE`;
  }

  // Update dynamic distance readout based on dread
  if (distanceNoteEl) {
    const meters = Math.max(0.2, (3.2 - currentDread * 3.1)).toFixed(1);
    if (currentDread > 0.72) {
      distanceNoteEl.innerHTML = '第二热源距离你 <span>0.3 米</span> —— 就在你的椅背后面。';
    } else {
      distanceNoteEl.innerHTML = `第二热源位于你身后约 <span>${meters} 米</span> 处，正在缓慢靠近。`;
    }
  }

  // Detect cursor stillness in Act 3+
  const idleSeconds = (performance.now() - lastMouseMoveAt) / 1000;
  if (stillnessEl && currentDread > 0.42) {
    if (idleSeconds > 4.5) {
      stillnessEl.textContent = '你停下鼠标不动了。你也听见身后的呼吸声了吗？';
    } else if (currentDread > 0.65) {
      stillnessEl.textContent = '别再滑了。屏幕光线照不到你背后的角落。';
    }
  }
}

setInterval(updateFourthWallTelemetry, 1000);
updateFourthWallTelemetry();

// Append live creepy log entries as user enters Act 3
let lastLogStage = 0;
function checkLogFeed(dread) {
  if (!liveLogFeed) return;
  const now = new Date();
  const stamp = `[${pad(now.getHours())}:${pad(now.getMinutes())}]`;

  const addLog = (html) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="log-time">${stamp}</span> ${html}`;
    liveLogFeed.prepend(li);
    while (liveLogFeed.children.length > 5) {
      liveLogFeed.removeChild(liveLogFeed.lastElementChild);
    }
  };

  if (dread > 0.48 && lastLogStage < 1) {
    lastLogStage = 1;
    addLog('房间红外读数异常：<span class="text-blood">门缝温度骤降 6.4°C</span>。');
  }
  if (dread > 0.58 && lastLogStage < 2) {
    lastLogStage = 2;
    addLog('音频麦克风捕捉到极低频人声：<i>“你看到我了吗”</i>。');
  }
  if (dread > 0.68 && lastLogStage < 3) {
    lastLogStage = 3;
    addLog('<span class="text-blood">警告：受试者正在进入封存楼层，无法撤回。</span>');
  }
}

// =========================================================================
// ACT TRANSITIONS & NAVIGATION / TITLE MUTATION
// =========================================================================
const ACT_TITLES = {
  1: 'SOLACE 静界 — 下一代智能深度睡眠系统',
  2: 'SOLACE 静界 — 今晚别睁眼',
  3: 'REC ● 它在你身后',
  4: '别再往下滑了',
  5: '找到你了',
};

const navItems = document.querySelectorAll('.nav-item');
const brandNameEl = document.querySelector('.brand-name');
const navCtaEl = document.getElementById('nav-cta');
const faviconEl = document.getElementById('dynamic-favicon');

const FAVICON_CALM = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='13' fill='%234f6d7a'/%3E%3C/svg%3E";
const FAVICON_EYE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23050507'/%3E%3Cpath d='M2 16 Q16 4 30 16 Q16 28 2 16 Z' fill='%23dcd4d0' stroke='%239b0b0b' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='5' fill='%239b0b0b'/%3E%3Ccircle cx='16' cy='16' r='2.5' fill='%23000'/%3E%3C/svg%3E";

function applyAct(act) {
  if (act === currentAct) return;
  currentAct = act;
  body.setAttribute('data-act', String(act));
  document.title = ACT_TITLES[act] || ACT_TITLES[1];

  if (faviconEl) {
    faviconEl.href = act >= 3 ? FAVICON_EYE : FAVICON_CALM;
  }

  navItems.forEach((item) => {
    const key = `act${act}`;
    item.textContent = item.dataset[key] || item.dataset.normal;
  });

  if (brandNameEl) {
    brandNameEl.textContent = brandNameEl.dataset[`act${act}`] || brandNameEl.dataset.normal;
  }

  if (navCtaEl) {
    navCtaEl.textContent = navCtaEl.dataset[`act${act}`] || navCtaEl.dataset.normal;
  }

  updateAudioButtonLabel(audio.isActive);

  // Brief atmospheric shutter when plunging into Act 4
  if (act === 4) {
    triggerFlash('flash-black', 140);
  }
}

// =========================================================================
// SCROLL HANDLER (Continuous Dread Curve)
// =========================================================================
function handleScroll() {
  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.max(0, Math.min(1, window.scrollY / maxScroll));

  // If user reached deep Act 4 (dread > 0.80) and suddenly tries to flee upward,
  // show a chilling one-time warning + shake (never trapping them permanently!)
  if (maxDreadReached > 0.80 && progress < maxDreadReached - 0.14 && !lockWarningTriggered && !climaxTriggered) {
    lockWarningTriggered = true;
    lockWarning.hidden = false;
    body.classList.add('screen-shake');
    audio.playSpookSting();
    setTimeout(() => body.classList.remove('screen-shake'), 500);
    setTimeout(() => {
      lockWarning.hidden = true;
    }, 3600);
  }

  currentDread = progress;
  maxDreadReached = Math.max(maxDreadReached, progress);

  // Continuous CSS variables
  root.style.setProperty('--dread', progress.toFixed(4));
  root.style.setProperty('--bg-color', getBackgroundAt(progress));

  const grainOp = progress < 0.18 ? 0 : Math.min(0.46, (progress - 0.18) * 0.62);
  const vigOp = progress < 0.22 ? 0 : Math.min(0.96, (progress - 0.22) * 1.35);
  const scanOp = progress < 0.42 ? 0 : Math.min(0.42, (progress - 0.42) * 0.72);
  const bleedOp = progress < 0.48 ? 0 : Math.min(0.88, (progress - 0.48) * 1.65);
  const skew = progress < 0.45 ? 0 : Math.sin(progress * 18) * ((progress - 0.45) * 1.8);
  const chrom = progress < 0.42 ? 0 : (progress - 0.42) * 5;

  root.style.setProperty('--grain-opacity', grainOp.toFixed(3));
  root.style.setProperty('--vignette-opacity', vigOp.toFixed(3));
  root.style.setProperty('--scanline-opacity', scanOp.toFixed(3));
  root.style.setProperty('--bleed-opacity', bleedOp.toFixed(3));
  root.style.setProperty('--skew-deg', `${skew.toFixed(2)}deg`);
  root.style.setProperty('--chromatic', `${chrom.toFixed(2)}px`);

  // Discrete Acts
  let act = 1;
  if (progress >= 0.90) act = 5;
  else if (progress >= 0.70) act = 4;
  else if (progress >= 0.45) act = 3;
  else if (progress >= 0.20) act = 2;
  applyAct(act);

  audio.updateDread(progress);
  advanceSupportScript(progress);
  checkLogFeed(progress);

  // Auto-arm climax if user sits at the very bottom for 4.2s without clicking
  if (progress > 0.965 && !climaxTriggered) {
    if (!climaxAutoTimer) {
      climaxAutoTimer = setTimeout(() => {
        if (currentDread > 0.95 && !climaxTriggered) {
          runHorrorClimax();
        }
      }, 4200);
    }
  } else if (climaxAutoTimer) {
    clearTimeout(climaxAutoTimer);
    climaxAutoTimer = null;
  }
}

window.addEventListener('scroll', handleScroll, { passive: true });
handleScroll();

// =========================================================================
// ACT 5: HORROR FILM CLIMAX SEQUENCE
// =========================================================================
climaxTriggerBtn.addEventListener('click', () => {
  runHorrorClimax();
});

async function runHorrorClimax() {
  if (climaxTriggered) return;
  climaxTriggered = true;
  clearTimeout(climaxAutoTimer);

  // Hide prompt & close support widget for full cinematic framing
  climaxPrompt.classList.add('is-hidden');
  setChatOpen(false);
  supportWidget.style.display = 'none';

  // Ensure audio runs if user already enabled it
  audio.playClimaxSequence();

  // Phase 1: Dead silence & NO SIGNAL snow (700ms)
  climaxSignalEl.textContent = 'LOST';
  climaxDistEl.textContent = '0.1m';
  climaxRenderer.setMode('static');
  document.title = '...';

  await wait(700);

  // Phase 2: Sudden cold flash -> Entity closer in doorway (420ms)
  triggerFlash('flash-cold', 110);
  climaxRenderer.setMode('approach');
  climaxSignalEl.textContent = 'BREACHED';
  climaxDistEl.textContent = '0.0m';
  body.classList.add('screen-shake');

  await wait(440);

  // Phase 3: Full Horror Climax Lunge (1800ms, safe cinematic pacing — not rapid strobe)
  body.classList.remove('screen-shake');
  body.classList.add('climax-shake');
  climaxRenderer.setMode('lunge');
  triggerFlash('flash-red', 180);
  climaxScreamText.textContent = '找到你了';
  climaxScreamText.classList.add('is-visible');
  document.title = '找到你了';

  await wait(650);
  climaxScreamText.textContent = '别 关 灯';

  await wait(550);
  triggerFlash('flash-red', 160);
  climaxScreamText.textContent = '你在里面吗';

  await wait(620);

  // Phase 4: Hard cut to pitch-black silence -> Quiet chilling epilogue
  body.classList.remove('climax-shake');
  climaxScreamText.classList.remove('is-visible');
  climaxRenderer.setMode('black');
  triggerFlash('flash-black', 400);

  await wait(500);

  epilogueScreen.hidden = false;
  document.title = 'SOLACE 静界 — 深度睡眠已开始';

  const now = new Date();
  const stamp = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const epilogueText =
    `感谢您选择 SOLACE 静界。\n\n` +
    `您的「永恒深度睡眠」已于 ${stamp} 正式开启。\n` +
    `卧室门已为您从外侧锁妥。\n\n` +
    `无论听到什么声音，都请不要睁开眼睛。`;

  await typeText(epilogueTypewriter, epilogueText, 48);
  epilogueActions.hidden = false;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function typeText(el, text, speedMs) {
  el.textContent = '';
  for (let i = 0; i < text.length; i++) {
    el.textContent += text[i];
    await wait(text[i] === '\n' ? speedMs * 4 : speedMs);
  }
}

// Reset / Wake Up button so user can replay cleanly from the sunny marketing top
wakeBtn.addEventListener('click', () => {
  climaxTriggered = false;
  maxDreadReached = 0;
  lockWarningTriggered = false;
  chatStageReached = 0;
  lastLogStage = 0;

  epilogueScreen.hidden = true;
  epilogueActions.hidden = true;
  epilogueTypewriter.textContent = '';
  climaxPrompt.classList.remove('is-hidden');
  climaxRenderer.setMode('idle');
  climaxSignalEl.textContent = 'UNSTABLE';
  climaxDistEl.textContent = '0.4m';

  supportWidget.style.display = '';
  supportWidget.classList.remove('is-corrupted');
  supportAgentName.textContent = '客服小静';
  supportAgentStatus.textContent = '在线 · 随时为您解答';
  supportLabel.textContent = '在线睡眠顾问';
  supportAvatar.textContent = '静';
  supportMessages.innerHTML = '<div class="chat-msg bot">您好！欢迎来到 SOLACE 静界，有任何睡眠困扰都可以问我哦。</div>';
  quickReplyStep = 0;
  quickReplyBtn.textContent = QUICK_REPLIES[0].q;

  if (audio.isActive) {
    audio.climaxMuted = false;
    audio.updateDread(0);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// =========================================================================
// MAIN ANIMATION LOOP
// =========================================================================
function renderLoop(now) {
  const dt = Math.min(0.1, (now - lastFrameTime) / 1000);
  lastFrameTime = now;

  grain.tick(currentDread);

  if (currentDread > 0.32 && currentDread < 0.85) {
    ecg.tick(currentDread, now);
  }

  if (currentDread > 0.65) {
    eyes.tick(currentDread, dt);
  }

  if (currentDread > 0.82) {
    climaxRenderer.tick(now);
  }

  requestAnimationFrame(renderLoop);
}

requestAnimationFrame(renderLoop);
