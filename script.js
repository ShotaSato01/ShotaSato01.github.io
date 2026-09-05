(() => {
  'use strict';
  const body = document.body;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  // Keep all categories in one timeline, using only the known date precision.
  // Equal dates retain their source order; filtering never changes that order.
  const paperList = document.querySelector('.paper-list');
  [...paperList.querySelectorAll('.paper')]
    .sort((a, b) => b.dataset.date.localeCompare(a.dataset.date))
    .forEach(paper => paperList.append(paper));

  let lang = 'ja';
  let paused = reducedMotion.matches;
  let userPaused = false;
  const readPreference = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const savePreference = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Storage is optional. */ } };
  userPaused = readPreference('portfolio-motion') === 'paused';
  paused = reducedMotion.matches || userPaused;
  function updateMotionLabel() {
    const label = reducedMotion.matches
      ? (lang === 'ja' ? '端末の設定によりアニメーションを停止中' : 'Animations paused by system preference')
      : (lang === 'ja' ? (paused ? 'アニメーションを再生' : 'アニメーションを停止') : (paused ? 'Play animations' : 'Pause animations'));
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    motionButton.textContent = paused ? '▷' : 'Ⅱ';
    motionButton.setAttribute('aria-pressed', String(paused));
  }
  function setLanguage(value) {
    lang = value === 'en' ? 'en' : 'ja';
    body.classList.toggle('lang-en', lang === 'en');
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === lang)));
    updateMotionLabel();
    updateCount();
    updateTopicLabel();
  }
  function updateCount() {
    const count = document.querySelectorAll('.paper:not([hidden])').length;
    document.querySelector('.paper-count').textContent = lang === 'ja' ? `${count} 件の研究・論文` : `${count} publications`;
  }
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
    setLanguage(button.dataset.lang);
    savePreference('portfolio-language', lang);
  }));
  setLanguage(readPreference('portfolio-language'));
  // Interest cards highlight the publications and experience tied to that interest.
  // Highlighting is independent of the category filter; it dims, never hides.
  const topicCards = document.querySelectorAll('.research-card[data-topic]');
  const topicClear = document.querySelector('.topic-clear');
  const topicTargets = document.querySelectorAll('[data-topics]');
  function updateTopicLabel() {
    const topic = body.dataset.topic;
    if (!topic) return;
    const card = document.querySelector(`.research-card[data-topic="${topic}"]`);
    const heading = card.querySelector('h3');
    const name = (heading.querySelector(lang === 'ja' ? '.ja' : '.en') || heading).textContent;
    topicClear.querySelector('.topic-clear-label').textContent = lang === 'ja' ? `「${name}」に関連する研究を強調中` : `Highlighting work on ${name}`;
  }
  function setTopic(topic) {
    if (topic) body.dataset.topic = topic; else delete body.dataset.topic;
    topicCards.forEach(card => card.classList.toggle('is-active', card.dataset.topic === topic));
    topicTargets.forEach(target => target.classList.toggle('topic-match', Boolean(topic) && target.dataset.topics.split(' ').includes(topic)));
    topicClear.hidden = !topic;
    updateTopicLabel();
  }
  topicCards.forEach(card => card.addEventListener('click', event => {
    if (card.classList.contains('is-active')) { event.preventDefault(); setTopic(null); return; }
    setTopic(card.dataset.topic);
  }));
  topicClear.addEventListener('click', () => setTopic(null));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.querySelectorAll('.paper').forEach(paper => { paper.hidden = button.dataset.filter !== 'all' && paper.dataset.category !== button.dataset.filter; });
    updateCount();
  }));
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('is-pending'); revealObserver.unobserve(entry.target); }
    }), { threshold: 0, rootMargin: '0px 0px -25px 0px' });
    document.querySelectorAll('.reveal').forEach(section => { section.classList.add('is-pending'); revealObserver.observe(section); });
  }
  const progress = document.querySelector('.scroll-progress');
  let scrollQueued = false;
  function updateProgress() {
    const available = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${available > 0 ? scrollY / available : 0})`;
    scrollQueued = false;
  }
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  addEventListener('resize', updateProgress);
  if ('ResizeObserver' in window) new ResizeObserver(updateProgress).observe(body);
  updateProgress();

  const canvas = document.querySelector('#embedding-art');
  const context = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let frame = 0;
  let time = 0;
  let previous = 0;
  let visible = true;
  const pointer = { x: 0, y: 0 };
  const colors = ['#315e91', '#7895b5', '#a5b5c8'];
  // Deterministic point clouds: an abstract illustration of representation spaces.
  const points = Array.from({ length: 210 }, (_, index) => {
    const group = index % 3;
    const a = index * 2.399963;
    const radius = Math.sqrt(((index * 37) % 101) / 101);
    return { group, a, radius, size: 1.2 + (index % 4) * .42, phase: index * .7 };
  });
  function draw() {
    if (!context || !width) return;
    context.clearRect(0, 0, width, height);
    const scale = Math.min(width, height);
    const centerX = width / 2 + pointer.x * scale * .014;
    const centerY = height / 2 + pointer.y * scale * .014;
    points.forEach(point => {
      const angle = point.group * Math.PI * 2 / 3 + time * .06 - .8;
      const cx = centerX + Math.cos(angle) * scale * .20;
      const cy = centerY + Math.sin(angle) * scale * .20;
      const a = point.a + time * .045;
      const drift = Math.sin(time * .5 + point.phase) * scale * .008;
      const x = cx + Math.cos(a) * point.radius * scale * .18 + drift;
      const y = cy + Math.sin(a) * point.radius * scale * .145;
      context.beginPath();
      context.arc(x, y, point.size * scale / 500, 0, Math.PI * 2);
      context.fillStyle = colors[point.group];
      context.globalAlpha = .55 + point.radius * .4;
      context.fill();
    });
    context.globalAlpha = 1;
  }
  function tick(timestamp) {
    time += previous ? Math.min((timestamp - previous) / 1000, .05) : 0;
    previous = timestamp;
    draw();
    frame = requestAnimationFrame(tick);
  }
  function syncAnimation() {
    cancelAnimationFrame(frame);
    previous = 0;
    if (!paused && !document.hidden && visible && context) frame = requestAnimationFrame(tick);
    else draw();
  }
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height;
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    if (context) context.setTransform(ratio, 0, 0, ratio, 0, 0);
    draw();
  }
  function applyMotion() {
    body.classList.toggle('motion-paused', paused);
    document.documentElement.classList.toggle('motion-paused', paused);
    updateMotionLabel();
    syncAnimation();
  }
  motionButton.addEventListener('click', () => {
    // The operating system's reduced-motion preference always takes precedence.
    if (reducedMotion.matches) return;
    userPaused = !paused;
    paused = userPaused;
    savePreference('portfolio-motion', paused ? 'paused' : 'playing');
    applyMotion();
  });
  function syncSystemPreference() {
    paused = reducedMotion.matches || userPaused;
    motionButton.disabled = reducedMotion.matches;
    applyMotion();
  }
  reducedMotion.addEventListener('change', syncSystemPreference);
  document.addEventListener('visibilitychange', syncAnimation);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; syncAnimation(); }).observe(canvas);
  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(canvas);
  else addEventListener('resize', resizeCanvas);
  canvas.parentElement.addEventListener('pointermove', event => {
    if (paused || event.pointerType === 'touch') return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left) / rect.width - .5;
    pointer.y = (event.clientY - rect.top) / rect.height - .5;
  });
  canvas.parentElement.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });
  resizeCanvas();
  syncSystemPreference();
})();
