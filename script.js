(() => {
  'use strict';
  const body = document.body;
  let lang = 'ja';
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* optional */ } };
  const countEl = document.querySelector('.paper-count');
  const topicCards = document.querySelectorAll('.research-card[data-topic]');
  const topicClear = document.querySelector('.topic-clear');
  const topicTargets = document.querySelectorAll('[data-topics]');
  function updateCount() {
    if (!countEl) return;
    const n = document.querySelectorAll('.paper:not([hidden])').length;
    countEl.textContent = lang === 'ja' ? `${n} 件` : `${n} items`;
  }
  function updateTopicLabel() {
    const topic = body.dataset.topic;
    if (!topic || !topicClear) return;
    const heading = document.querySelector(`.research-card[data-topic="${topic}"] .topic-name`);
    const name = (heading.querySelector(lang === 'ja' ? '.ja' : '.en') || heading).textContent;
    topicClear.querySelector('.topic-clear-label').textContent = lang === 'ja' ? `「${name}」を強調中` : `Highlighting: ${name}`;
  }
  function setLanguage(value) {
    lang = value === 'en' ? 'en' : 'ja';
    body.classList.toggle('lang-en', lang === 'en');
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    updateCount(); updateTopicLabel();
  }
  document.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { setLanguage(b.dataset.lang); save('portfolio-language', lang); }));
  setLanguage(read('portfolio-language'));
  function setTopic(topic) {
    if (topic) body.dataset.topic = topic; else delete body.dataset.topic;
    topicCards.forEach(card => card.classList.toggle('is-active', card.dataset.topic === topic));
    topicTargets.forEach(t => t.classList.toggle('topic-match', Boolean(topic) && t.dataset.topics.split(' ').includes(topic)));
    if (topicClear) topicClear.hidden = !topic;
    updateTopicLabel();
  }
  topicCards.forEach(card => card.addEventListener('click', event => {
    if (card.classList.contains('is-active')) { event.preventDefault(); setTopic(null); return; }
    setTopic(card.dataset.topic);
  }));
  if (topicClear) topicClear.addEventListener('click', () => setTopic(null));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelectorAll('.paper').forEach(paper => { paper.hidden = button.dataset.filter !== 'all' && paper.dataset.category !== button.dataset.filter; });
    updateCount();
  }));
})();

(() => {
  'use strict';
  const canvas = document.querySelector('#embedding-art');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  const slider = document.querySelector('#gap'), readout = document.querySelector('#gap-value'), tease = document.querySelector('.gap-tease');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 0, height = 0, frame = 0, time = 0, previous = 0, visible = true, gapTarget = 1, gap = 1;
  const hash = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const points = Array.from({ length: 260 }, (_, i) => { const g = i % 2 ? 'text' : 'image'; const r = Math.sqrt(hash(i + 1)); const t = hash(i + 101) * Math.PI * 2;
    return { group: g, dx: Math.cos(t) * r, dy: Math.sin(t) * r, size: .9 + hash(i + 7) * 1.6, phase: hash(i + 31) * Math.PI * 2 }; });
  function draw() {
    if (!context || !width) return;
    const style = getComputedStyle(canvas);
    const colors = { image: style.getPropertyValue('--plot-image').trim(), text: style.getPropertyValue('--plot-text').trim(), ink: style.getPropertyValue('--plot-ink').trim() };
    const mono = style.getPropertyValue('--plot-font').trim() || 'ui-monospace, monospace';
    context.clearRect(0, 0, width, height);
    const scale = Math.min(width, height), spreadX = Math.min(width, height * 1.3) * .22, spreadY = scale * .30, axis = -.30, offset = gap * Math.min(width * .28, scale * .40);
    const centres = { image: { x: width / 2 - Math.cos(axis) * offset, y: height / 2 - Math.sin(axis) * offset }, text: { x: width / 2 + Math.cos(axis) * offset, y: height / 2 + Math.sin(axis) * offset } };
    const sums = { image: { x: 0, y: 0, n: 0 }, text: { x: 0, y: 0, n: 0 } };
    points.forEach(p => { const c = centres[p.group]; const x = c.x + p.dx * spreadX + Math.sin(time * .6 + p.phase) * scale * .006; const y = c.y + p.dy * spreadY + Math.cos(time * .5 + p.phase) * scale * .004;
      const s = sums[p.group]; s.x += x; s.y += y; s.n += 1;
      context.beginPath(); context.arc(x, y, p.size * scale / 420, 0, Math.PI * 2); context.fillStyle = colors[p.group]; context.globalAlpha = .45 + (1 - Math.hypot(p.dx, p.dy)) * .5; context.fill(); });
    context.globalAlpha = 1;
    const mu = { image: { x: sums.image.x / sums.image.n, y: sums.image.y / sums.image.n }, text: { x: sums.text.x / sums.text.n, y: sums.text.y / sums.text.n } };
    const small = `${Math.max(9, scale * .028)}px ${mono}`;
    const vx = mu.text.x - mu.image.x, vy = mu.text.y - mu.image.y, len = Math.hypot(vx, vy), r = Math.max(4, scale * .013);
    if (len > r * 2.5) { const ux = vx / len, uy = vy / len, head = Math.max(6, scale * .02), ax = mu.text.x - ux * r, ay = mu.text.y - uy * r;
      context.strokeStyle = colors.ink; context.lineWidth = 1.2; context.beginPath(); context.moveTo(mu.image.x + ux * r, mu.image.y + uy * r); context.lineTo(ax, ay); context.stroke();
      context.fillStyle = colors.ink; context.beginPath(); context.moveTo(ax, ay); context.lineTo(ax - ux * head - uy * head * .45, ay - uy * head + ux * head * .45); context.lineTo(ax - ux * head + uy * head * .45, ay - uy * head - ux * head * .45); context.closePath(); context.fill();
      if (len > scale * .18) { context.font = small; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText('Δμ', (mu.image.x + mu.text.x) / 2 - uy * scale * .04, (mu.image.y + mu.text.y) / 2 + ux * scale * .04); } }
    context.font = small; context.textBaseline = 'middle';
    [['image', 'μ_img', 'right'], ['text', 'μ_txt', 'left']].forEach(([g, label, align]) => { const m = mu[g];
      context.fillStyle = style.backgroundColor === 'rgba(0, 0, 0, 0)' ? getComputedStyle(canvas.parentElement).backgroundColor : style.backgroundColor; context.strokeStyle = colors[g]; context.lineWidth = 1.5;
      context.beginPath(); context.arc(m.x, m.y, r, 0, Math.PI * 2); context.fill(); context.stroke(); context.fillStyle = colors[g]; context.beginPath(); context.arc(m.x, m.y, r * .35, 0, Math.PI * 2); context.fill();
      context.textAlign = align; context.fillText(label, m.x + (align === 'left' ? 1 : -1) * r * 1.9, m.y + r * 1.6); });
    context.font = `${Math.max(10, scale * .034)}px ${mono}`; context.textAlign = 'center'; const lift = spreadY + scale * .05;
    context.fillStyle = colors.image; context.fillText('image', centres.image.x, centres.image.y - lift); context.fillStyle = colors.text; context.fillText('text', centres.text.x, centres.text.y + lift);
    context.fillStyle = colors.ink; context.textAlign = 'right'; context.textBaseline = 'bottom'; context.font = small; context.fillText(`‖μ_img − μ_txt‖ = ${gap.toFixed(2)}`, width - 12, height - 10);
  }
  function tick(ts) { time += previous ? Math.min((ts - previous) / 1000, .05) : 0; previous = ts; gap += (gapTarget - gap) * .12; draw(); frame = requestAnimationFrame(tick); }
  function sync() { cancelAnimationFrame(frame); previous = 0; if (!reduced.matches && !document.hidden && visible) frame = requestAnimationFrame(tick); else { gap = gapTarget; draw(); } }
  function resize() { const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height; const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); context.setTransform(ratio, 0, 0, ratio, 0, 0); draw(); }
  function setGap(v) { gapTarget = v / 100; readout.value = gapTarget.toFixed(2); tease.classList.toggle('is-visible', gapTarget <= .08); if (reduced.matches) { gap = gapTarget; draw(); } }
  slider.addEventListener('input', () => setGap(Number(slider.value)));
  document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(e => { visible = e[0].isIntersecting; sync(); }).observe(canvas);
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas); else addEventListener('resize', resize);
  resize(); setGap(Number(slider.value)); sync();
})();

(() => {
  const root = document.documentElement, button = document.querySelector('.theme-toggle');
  if (!button) return;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || (system.matches ? 'dark' : 'light');
  const show = () => { const dark = current() === 'dark'; button.textContent = dark ? '☀' : '☾'; button.setAttribute('aria-pressed', String(dark)); button.title = dark ? 'ライトモード / Light mode' : 'ダークモード / Dark mode'; };
  button.addEventListener('click', () => {
    const next = current() === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('brutal-theme', next); } catch { /* optional */ }
    show();
  });
  system.addEventListener('change', show);
  show();
})();
