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
  const body = document.body;
  const root = document.documentElement;
  const read = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const save = (key, value) => { try { localStorage.setItem(key, value); } catch { /* optional */ } };
  // Theme: dark by default, light on request. Both palettes share the same structure.
  const themeButton = document.querySelector('.theme-toggle');
  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeButton.setAttribute('aria-pressed', String(theme === 'light'));
    themeButton.textContent = theme === 'light' ? '☾' : '☀';
    themeButton.title = theme === 'light' ? 'Dark theme' : 'Light theme';
    themeButton.setAttribute('aria-label', themeButton.title);
    draw();
  }
  themeButton.addEventListener('click', () => { const next = root.dataset.theme === 'light' ? 'dark' : 'light'; save('portfolio-theme', next); applyTheme(next); });
  // Motion: pause everything that moves.
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  let userPaused = read('portfolio-motion') === 'paused';
  let paused = reducedMotion.matches || userPaused;
  function applyMotion() {
    body.classList.toggle('motion-paused', paused);
    motionButton.textContent = paused ? '▷' : 'Ⅱ';
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.disabled = reducedMotion.matches;
    motionButton.title = paused ? 'Play animations' : 'Pause animations';
    motionButton.setAttribute('aria-label', motionButton.title);
    syncAnimation();
  }
  motionButton.addEventListener('click', () => { if (reducedMotion.matches) return; userPaused = !paused; paused = userPaused; save('portfolio-motion', paused ? 'paused' : 'playing'); applyMotion(); });
  reducedMotion.addEventListener('change', () => { paused = reducedMotion.matches || userPaused; applyMotion(); });
  // Canvas: image embeddings and text embeddings as two clouds. The slider sets how far apart they sit.
  const canvas = document.querySelector('#embedding-art');
  const context = canvas.getContext('2d');
  const slider = document.querySelector('#gap');
  const readout = document.querySelector('#gap-value');
  const tease = document.querySelector('.gap-tease');
  let width = 0, height = 0, frame = 0, time = 0, previous = 0, visible = true;
  let gapTarget = 1, gap = 1;
  const palettes = { dark: { image: '#9db4cf', text: '#7db0f5', ink: '#8d97a7' }, light: { image: '#7895b5', text: '#315e91', ink: '#616b77' } };
  // Deterministic pseudo-random spread per point, so the picture is the same on every load.
  const hash = n => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const points = Array.from({ length: 260 }, (_, index) => {
    const group = index % 2 ? 'text' : 'image';
    const r = Math.sqrt(hash(index + 1));
    const theta = hash(index + 101) * Math.PI * 2;
    return { group, dx: Math.cos(theta) * r, dy: Math.sin(theta) * r, size: .9 + hash(index + 7) * 1.6, phase: hash(index + 31) * Math.PI * 2 };
  });
  function draw() {
    if (!context || !width) return;
    const colors = palettes[root.dataset.theme === 'light' ? 'light' : 'dark'];
    context.clearRect(0, 0, width, height);
    const scale = Math.min(width, height);
    const spreadX = scale * .22, spreadY = scale * .30;
    const axis = -.35; // tilt of the line joining the two clouds
    const offset = gap * scale * .40;
    const centres = {
      image: { x: width / 2 - Math.cos(axis) * offset, y: height / 2 - Math.sin(axis) * offset },
      text: { x: width / 2 + Math.cos(axis) * offset, y: height / 2 + Math.sin(axis) * offset },
    };
    const sums = { image: { x: 0, y: 0, n: 0 }, text: { x: 0, y: 0, n: 0 } };
    points.forEach(point => {
      const c = centres[point.group];
      const drift = Math.sin(time * .6 + point.phase) * scale * .006;
      const x = c.x + point.dx * spreadX + drift;
      const y = c.y + point.dy * spreadY + Math.cos(time * .5 + point.phase) * scale * .004;
      const sum = sums[point.group]; sum.x += x; sum.y += y; sum.n += 1;
      context.beginPath();
      context.arc(x, y, point.size * scale / 420, 0, Math.PI * 2);
      context.fillStyle = colors[point.group];
      context.globalAlpha = .45 + (1 - Math.hypot(point.dx, point.dy)) * .5;
      context.fill();
    });
    context.globalAlpha = 1;
    const mu = {
      image: { x: sums.image.x / sums.image.n, y: sums.image.y / sums.image.n },
      text: { x: sums.text.x / sums.text.n, y: sums.text.y / sums.text.n },
    };
    const smallFont = `${Math.max(9, scale * .028)}px IBM Plex Mono, ui-monospace, monospace`;
    // Vector μ_img → μ_txt
    const vx = mu.text.x - mu.image.x, vy = mu.text.y - mu.image.y, len = Math.hypot(vx, vy);
    const r = Math.max(4, scale * .013);
    if (len > r * 2.5) {
      const ux = vx / len, uy = vy / len, head = Math.max(6, scale * .02);
      const ax = mu.text.x - ux * r, ay = mu.text.y - uy * r; // arrow ends at the rim of μ_txt
      context.strokeStyle = colors.ink; context.lineWidth = 1.2; context.setLineDash([]);
      context.beginPath(); context.moveTo(mu.image.x + ux * r, mu.image.y + uy * r); context.lineTo(ax, ay); context.stroke();
      context.fillStyle = colors.ink;
      context.beginPath(); context.moveTo(ax, ay);
      context.lineTo(ax - ux * head - uy * head * .45, ay - uy * head + ux * head * .45);
      context.lineTo(ax - ux * head + uy * head * .45, ay - uy * head - ux * head * .45);
      context.closePath(); context.fill();
      if (len > scale * .18) {
        context.font = smallFont; context.textAlign = 'center'; context.textBaseline = 'middle';
        context.fillText('Δμ', (mu.image.x + mu.text.x) / 2 - uy * scale * .04, (mu.image.y + mu.text.y) / 2 + ux * scale * .04);
      }
    }
    // Mean markers: a ring with a dot, in each modality's colour
    context.font = smallFont; context.textBaseline = 'middle';
    [['image', 'μ_img', 'right'], ['text', 'μ_txt', 'left']].forEach(([group, label, align]) => {
      const m = mu[group];
      context.fillStyle = getComputedStyle(canvas).backgroundColor; context.strokeStyle = colors[group]; context.lineWidth = 1.5;
      context.beginPath(); context.arc(m.x, m.y, r, 0, Math.PI * 2); context.fill(); context.stroke();
      context.fillStyle = colors[group];
      context.beginPath(); context.arc(m.x, m.y, r * .35, 0, Math.PI * 2); context.fill();
      context.textAlign = align;
      context.fillText(label, m.x + (align === 'left' ? 1 : -1) * r * 1.9, m.y + r * 1.6);
    });
    // Labels sit just outside each cloud, on the far side from the other cloud.
    context.font = `${Math.max(10, scale * .034)}px IBM Plex Mono, ui-monospace, monospace`;
    context.textBaseline = 'middle';
    const lift = spreadY + scale * .05;
    context.fillStyle = colors.image; context.textAlign = 'center';
    context.fillText('image', centres.image.x, centres.image.y - lift);
    context.fillStyle = colors.text;
    context.fillText('text', centres.text.x, centres.text.y + lift);
    // Distance between the two centres, in the units the slider uses.
    context.fillStyle = colors.ink; context.textAlign = 'right'; context.textBaseline = 'bottom';
    context.font = `${Math.max(9, scale * .028)}px IBM Plex Mono, ui-monospace, monospace`;
    context.fillText(`‖μ_img − μ_txt‖ = ${gap.toFixed(2)}`, width - 12, height - 10);
  }
  function tick(timestamp) {
    time += previous ? Math.min((timestamp - previous) / 1000, .05) : 0;
    previous = timestamp;
    gap += (gapTarget - gap) * .12;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function syncAnimation() { cancelAnimationFrame(frame); previous = 0; if (!paused && !document.hidden && visible && context) frame = requestAnimationFrame(tick); else { gap = gapTarget; draw(); } }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect(); width = rect.width; height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  function setGap(value) {
    gapTarget = value / 100;
    readout.value = gapTarget.toFixed(2);
    tease.classList.toggle('is-visible', gapTarget <= .08);
    if (paused) { gap = gapTarget; draw(); }
  }
  slider.addEventListener('input', () => setGap(Number(slider.value)));
  setGap(Number(slider.value));
  document.addEventListener('visibilitychange', syncAnimation);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncAnimation(); }).observe(canvas);
  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(canvas); else addEventListener('resize', resizeCanvas);
  resizeCanvas();
  applyTheme(read('portfolio-theme') === 'light' ? 'light' : 'dark');
  applyMotion();
})();
