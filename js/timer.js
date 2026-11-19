// スピードキューブ用タイマー（長押し → 離してスタート、何か押すとストップ）
const HOLD_MS = 300;
const INSPECTION_MS = 15000;

export class SpeedTimer {
  constructor({ area, display, onStateChange, onFinish, getInspection }) {
    this.area = area;
    this.display = display;
    this.onStateChange = onStateChange;
    this.onFinish = onFinish;
    this.getInspection = getInspection;
    this.state = 'idle'; // idle | inspectPending | inspecting | holding | ready | running | stopped
    this.afterHold = 'idle';
    this.holdTimer = null;
    this.startAt = 0;
    this.inspectAt = 0;
    this.raf = null;
  }

  setState(s) {
    this.state = s;
    this.area.classList.toggle('holding', s === 'holding');
    this.area.classList.toggle('ready', s === 'ready');
    this.area.classList.toggle('inspecting', s === 'inspecting' || (s === 'holding' && this.afterHold === 'inspecting'));
    this.onStateChange?.(s);
  }

  press() {
    switch (this.state) {
      case 'running':
        this.stop();
        break;
      case 'idle':
        if (this.getInspection()) {
          this.setState('inspectPending');
        } else {
          this.beginHold('idle');
        }
        break;
      case 'inspecting':
        this.beginHold('inspecting');
        break;
    }
  }

  release() {
    switch (this.state) {
      case 'stopped':
        this.setState('idle');
        break;
      case 'inspectPending':
        this.inspectAt = performance.now();
        this.setState('inspecting');
        this.loop();
        break;
      case 'holding':
        clearTimeout(this.holdTimer);
        this.setState(this.afterHold);
        if (this.afterHold === 'idle') this.display.textContent = this.lastText ?? '0.00';
        break;
      case 'ready':
        this.start();
        break;
    }
  }

  beginHold(from) {
    this.afterHold = from;
    this.setState('holding');
    if (from === 'idle') {
      this.lastText = this.display.textContent;
      this.display.textContent = '0.00';
    }
    this.holdTimer = setTimeout(() => {
      if (this.state === 'holding') this.setState('ready');
    }, HOLD_MS);
  }

  start() {
    const now = performance.now();
    this.penalty = null;
    if (this.afterHold === 'inspecting') {
      const used = now - this.inspectAt;
      if (used > INSPECTION_MS + 2000) this.penalty = 'DNF';
      else if (used > INSPECTION_MS) this.penalty = '+2';
    }
    this.startAt = now;
    this.setState('running');
    this.loop();
  }

  stop() {
    const time = Math.round(performance.now() - this.startAt);
    cancelAnimationFrame(this.raf);
    this.display.textContent = format(time);
    this.lastText = this.display.textContent;
    this.setState('stopped');
    this.onFinish?.(time, this.penalty);
  }

  // ソルブ中以外で状態をリセット（タブ切り替え時など）
  cancel() {
    if (this.state === 'running') return;
    clearTimeout(this.holdTimer);
    cancelAnimationFrame(this.raf);
    if (this.state !== 'idle') {
      this.display.textContent = this.lastText ?? '0.00';
      this.setState('idle');
    }
  }

  loop() {
    cancelAnimationFrame(this.raf);
    const step = () => {
      const now = performance.now();
      if (this.state === 'running') {
        this.display.textContent = format(now - this.startAt);
      } else if (this.state === 'inspecting' || (this.state === 'holding' && this.afterHold === 'inspecting') ||
        (this.state === 'ready' && this.afterHold === 'inspecting')) {
        const left = Math.ceil((INSPECTION_MS - (now - this.inspectAt)) / 1000);
        this.display.textContent = left > 0 ? String(left) : left > -2 ? '+2' : 'DNF';
      } else {
        return;
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
}

function format(ms) {
  const cs = Math.floor(ms / 10);
  const min = Math.floor(cs / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  const frac = String(cs % 100).padStart(2, '0');
  return min > 0 ? `${min}:${String(sec).padStart(2, '0')}.${frac}` : `${sec}.${frac}`;
}
