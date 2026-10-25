/* Le Talon Libre — interactions et animations principales */
(function () {
  const root = document.documentElement;
  const page = root.dataset.page;
  const reduced = root.classList.contains('reduced');
  const hasGSAP = typeof window.gsap !== 'undefined';
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } }
  };
  window.TL = window.TL || {};
  TL.reduced = reduced;
  TL.velocity = 0;

  if (!hasGSAP || typeof window.ScrollTrigger === 'undefined' || typeof window.SplitText === 'undefined') { root.classList.add('no-anim'); $('.loader') && $('.loader').remove(); return; }
  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ---------------- Langue ---------------- */
  const ATTRS = ['aria-label', 'content', 'placeholder', 'title', 'alt'];
  const splits = [];
  function lang() { return root.lang === 'en' ? 'en' : 'fr'; }
  TL.lang = lang;
  TL.t = (fr, en) => (lang() === 'en' ? en : fr);

  function applyLang(l, initial) {
    splits.forEach(s => s.split && s.split.revert());
    $$('[data-en]').forEach(el => {
      if (el.dataset.fr === undefined) el.dataset.fr = el.tagName === 'TITLE' ? el.textContent : el.innerHTML;
      const v = l === 'en' ? el.dataset.en : el.dataset.fr;
      if (el.tagName === 'TITLE') el.textContent = v; else el.innerHTML = v;
    });
    ATTRS.forEach(a => {
      const key = 'en' + a.replace(/(^|-)(\w)/g, (m, p, c) => c.toUpperCase());
      const keyFr = 'fr' + a.replace(/(^|-)(\w)/g, (m, p, c) => c.toUpperCase());
      $$(`[data-en-${a}]`).forEach(el => {
        if (el.dataset[keyFr] === undefined) el.dataset[keyFr] = el.getAttribute(a) || '';
        el.setAttribute(a, l === 'en' ? el.dataset[key] : el.dataset[keyFr]);
      });
    });
    root.lang = l;
    $$('[data-lang]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    store.set('tl-lang', l);
    if (window.TL_MEDIA) TL_MEDIA.relabel();
    splits.forEach(s => { s.split = makeSplit(s.el); if (!initial) gsap.set(s.split.chars, { clearProps: 'all' }); });
    if (!initial) {
      document.dispatchEvent(new CustomEvent('tl:lang', { detail: l }));
      ScrollTrigger.refresh();
    }
  }
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => applyLang(b.dataset.lang)));

  function makeSplit(el) {
    return new SplitText(el, { type: 'words,chars', wordsClass: 'w', charsClass: 'c', tag: 'span' });
  }

  /* ---------------- Défilement fluide ---------------- */
  let lenis = null;
  if (!reduced && typeof window.Lenis === 'function') {
    lenis = new Lenis({ lerp: 0.095, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', e => { ScrollTrigger.update(); TL.velocity = e.velocity || 0; });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    let last = scrollY;
    addEventListener('scroll', () => { TL.velocity = scrollY - last; last = scrollY; }, { passive: true });
  }
  TL.lenis = lenis;

  function scrollToTarget(target) {
    const off = -(parseInt(getComputedStyle(root).getPropertyValue('--header-h')) || 72) - ($('.subnav') ? 48 : 0);
    if (lenis) lenis.scrollTo(target, { offset: off, duration: 1.4 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + scrollY + off, behavior: 'auto' });
  }
  TL.scrollToTarget = scrollToTarget;

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href);
    if (url.origin !== location.origin) return;
    const samePage = url.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '') === location.pathname.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
    if (samePage && url.hash) {
      let t = null; try { t = document.getElementById(decodeURIComponent(url.hash.slice(1))); } catch (er) { /* ancre invalide */ }
      if (t) { e.preventDefault(); closeMenu(); scrollToTarget(t); history.replaceState(null, '', url.hash); }
      return;
    }
    // lien vers la page courante sans ancre : pas de rechargement ni de loader
    if (samePage && url.search === location.search && !a.hasAttribute('download')) { e.preventDefault(); closeMenu(); scrollToTarget(document.body); return; }
    if (!samePage && !reduced && /\.html$|\/$/.test(url.pathname) && !a.hasAttribute('download')) {
      e.preventDefault();
      leave(url.href);
    }
  });

  /* ---------------- Transitions de page ---------------- */
  function leave(href) {
    closeMenu();
    const path = $('.curtain path');
    try { sessionStorage.setItem('tl-trans', '1'); } catch (err) { /* */ }
    if (!path) { location.href = href; return; }
    const st = { p: 0 };
    gsap.to(st, {
      p: 1, duration: .75, ease: 'power3.inOut',
      onUpdate() {
        const y = 100 - st.p * 130;
        path.setAttribute('d', `M0 100 L0 ${y + 18} C 30 ${y - 6}, 70 ${y + 34}, 100 ${y} L100 100 Z`);
      },
      onComplete() { location.href = href; }
    });
  }
  addEventListener('pageshow', e => { if (e.persisted) { const p = $('.curtain path'); if (p) p.setAttribute('d', 'M0 100 L100 100 L100 100 L0 100 Z'); closeMenu(); } });

  /* ---------------- En-tête et menu ---------------- */
  const header = $('[data-header]');
  let lastY = 0;
  function onScrollHeader() {
    const y = scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = !$('#menu').hidden;
    header.classList.toggle('is-hidden', !menuOpen && y > 500 && y > lastY + 2);
    if (y < lastY - 2 || y < 500) header.classList.remove('is-hidden');
    lastY = y;
  }
  addEventListener('scroll', onScrollHeader, { passive: true });
  onScrollHeader();

  const menu = $('#menu');
  const menuBtn = $('.menu-toggle');
  const horsMenu = on => { $$('body > main, body > footer, .mbar, .altimeter, .skip').forEach(el => { el.inert = on; }); root.classList.toggle('menu-ouvert', on); };
  menu.setAttribute('data-lenis-prevent', '');
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); horsMenu(false); lenis && lenis.start();
    header.classList.remove('menu-open');
    menuBtn.textContent = 'Menu';
  }
  menuBtn.addEventListener('click', () => {
    const open = menu.hidden;
    if (!open) return closeMenu();
    menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true'); horsMenu(true); lenis && lenis.stop();
    header.classList.add('menu-open');
    menuBtn.textContent = TL.t('Fermer', 'Close');
    if (!reduced) gsap.from($$('#menu li'), { yPercent: 60, opacity: 0, stagger: .05, duration: .7, ease: 'expo.out' });
    const first = $('#menu a'); first && first.focus();
  });
  addEventListener('keydown', e => {
    if (menu.hidden) return;
    if (e.key === 'Escape') { closeMenu(); menuBtn.focus(); return; }
    if (e.key !== 'Tab') return;
    const items = [menuBtn, ...$$('a[href], button:not([disabled])', menu)];
    const i = items.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
    else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
  });

  /* ---------------- Ambiance sonore (bouton dans l'en-tête) ---------------- */
  const soundBtn = $('[data-sound]');
  let audio = null;
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      if (!audio) audio = makeAmbience();
      const on = soundBtn.getAttribute('aria-pressed') !== 'true';
      soundBtn.setAttribute('aria-pressed', String(on));
      audio && audio.set(on);
    });
  }

  // Ambiance sonore générée : vent + crépitement du poêle (aucun fichier)
  function makeAmbience() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    const master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
    const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.8;
    const wg = ctx.createGain(); wg.gain.value = 0.55;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(lp.frequency);
    wind.connect(lp).connect(wg).connect(master);
    wind.start(); lfo.start();
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const nd = noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 3);
    let timer = null;
    function crackle() {
      const s = ctx.createBufferSource(); s.buffer = noise;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200 + Math.random() * 2500;
      const g = ctx.createGain(); g.gain.value = 0.05 + Math.random() * (Math.random() < 0.1 ? 0.5 : 0.18);
      s.playbackRate.value = 0.6 + Math.random() * 1.6;
      s.connect(hp).connect(g).connect(master); s.start();
      timer = setTimeout(crackle, 40 + Math.random() * (Math.random() < 0.3 ? 900 : 220));
    }
    return {
      set(on) {
        if (ctx.state === 'suspended') ctx.resume();
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(on ? 0.22 : 0, ctx.currentTime, 0.6);
        clearTimeout(timer);
        if (on) crackle();
      }
    };
  }

  /* ---------------- Curseur et traces ---------------- */
  if (fine && !reduced) {
    root.classList.add('has-cursor');
    const cur = $('.cursor');
    const cv = $('.cursor-trail');
    const ctx = cv.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    resize(); addEventListener('resize', resize);
    const qx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' });
    const qy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    const pts = [];
    let dirty = false;
    addEventListener('pointermove', e => {
      qx(e.clientX); qy(e.clientY); cur.style.opacity = 1;
      pts.push({ x: e.clientX, y: e.clientY, t: performance.now() });
      if (pts.length > 60) pts.shift();
    }, { passive: true });
    document.addEventListener('pointerleave', () => { cur.style.opacity = 0; });
    document.addEventListener('pointerover', e => {
      cur.classList.toggle('is-active', !!e.target.closest('a, button, [role="slider"], .week, label, [data-zoom]'));
    });
    gsap.ticker.add(() => {
      const now = performance.now();
      while (pts.length && now - pts[0].t > 700) pts.shift();
      if (pts.length < 3) { if (dirty) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); dirty = false; } return; }
      dirty = true;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
          const nx = -dy / l * 4 * side, ny = dx / l * 4 * side;
          const age = 1 - (now - b.t) / 700;
          ctx.strokeStyle = `rgba(226, 50, 31, ${age * 0.55})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(a.x + nx, a.y + ny); ctx.lineTo(b.x + nx, b.y + ny); ctx.stroke();
        }
      }
    });
  }

  /* ---------------- Boutons magnétiques ---------------- */
  if (fine && !reduced) {
    $$('.magnetic').forEach(btn => {
      const lab = btn.querySelector('.btn-label');
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        gsap.to(btn, { x: x * .25, y: y * .35, duration: .5, ease: 'power3' });
        lab && gsap.to(lab, { x: x * .12, y: y * .15, duration: .5, ease: 'power3' });
      });
      btn.addEventListener('pointerleave', () => {
        gsap.to([btn, lab].filter(Boolean), { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' });
      });
    });
  }

  /* ---------------- Titres « genou plié » ---------------- */
  $$('.bend').forEach(el => splits.push({ el, split: null }));
  applyLang(lang(), true);

  const bendVisible = new Set();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) bendVisible.add(e.target); else { bendVisible.delete(e.target); e.target.style.transform = ''; } }));
  splits.forEach(s => io.observe(s.el));
  if (!reduced) {
    splits.forEach(s => {
      if (s.el.closest('.hero-inner')) return;
      gsap.set(s.split.chars, { yPercent: 105, skewX: -22, rotate: 5, opacity: 0 });
      ScrollTrigger.create({
        trigger: s.el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(s.split.chars, { yPercent: 0, skewX: 0, rotate: 0, opacity: 1, duration: 1.1, stagger: .016, ease: 'expo.out' })
      });
    });
    let skew = 0, applied = false;
    gsap.ticker.add(() => {
      const target = clamp(-TL.velocity * 0.2, -4, 4);
      TL.velocity *= .86;
      skew += (target - skew) * 0.14;
      if (Math.abs(skew) < 0.05 && Math.abs(target) < 0.05) {
        if (applied) { bendVisible.forEach(el => { el.style.transform = ''; }); applied = false; skew = 0; }
        return;
      }
      applied = true;
      bendVisible.forEach(el => { el.style.transform = `skewX(${skew.toFixed(2)}deg)`; el.style.transformOrigin = '0 100%'; });
    });
  }

  /* ---------------- Ouverture orchestrée ---------------- */
  const loader = $('.loader');
  let fromTransition = false;
  try { fromTransition = sessionStorage.getItem('tl-trans') === '1'; sessionStorage.removeItem('tl-trans'); } catch (e) { /* */ }
  const heroTitle = $('.hero-inner .bend');
  const heroSplit = splits.find(s => s.el === heroTitle);
  const heroMedia = $('.hero-media');
  if (reduced) {
    loader && loader.remove();
  } else {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => { loader && loader.remove(); ScrollTrigger.refresh(); } });
    if (loader) {
      if (fromTransition) loader.style.background = '#0d1b2a';
      const lp = $$('path', loader);
      lp.forEach(p => { const l = p.getTotalLength(); p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
      tl.to(lp, { strokeDashoffset: 0, duration: .8, ease: 'power2.inOut', stagger: .08 }, 0)
        .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'power3.inOut' }, .8);
    }
    const base = loader ? .9 : 0;
    if (heroMedia) tl.from(heroMedia, { scale: 1.16, duration: 1.8, ease: 'power3.out' }, base);
    if (heroSplit) {
      gsap.set(heroSplit.split.chars, { yPercent: 115, skewX: -26, rotate: 6, opacity: 0 });
      tl.to(heroSplit.split.chars, { yPercent: 0, skewX: 0, rotate: 0, opacity: 1, duration: 1, stagger: .022 }, base + .1);
    }
    const hm = $$('.hero-mask path');
    if (hm.length) tl.to(hm[0], { xPercent: -110, duration: 1.2, ease: 'power3.inOut' }, base - .2).to(hm[1], { xPercent: 110, duration: 1.2, ease: 'power3.inOut' }, '<');
    tl.from($$('.hero-foot > *, .hero-facts li, .p-hero .place'), { y: 26, opacity: 0, duration: .9, stagger: .06 }, base + .7)
      .from(header, { y: -80, opacity: 0, duration: .8, clearProps: 'transform,opacity' }, base + .5);
  }

  /* ---------------- Trace de télémark ---------------- */
  const main = $('main');
  const svgTrace = $('svg.trace', main);
  let lut = [], total = 0;
  function buildTrace() {
    if (!svgTrace) return;
    const mainTop = main.getBoundingClientRect().top + scrollY;
    const W = main.clientWidth;
    const H = main.scrollHeight;
    svgTrace.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgTrace.style.height = H + 'px';
    const wrapEl = $('.wrap', main);
    const wrapW = wrapEl ? wrapEl.getBoundingClientRect().width : W * .92;
    const margin = Math.max(6, (W - wrapW) / 2);
    const narrow = W < 760;
    const segs = [];
    $$('[data-trace]', main).forEach((sec, i) => {
      const r = sec.getBoundingClientRect();
      const cs = getComputedStyle(sec);
      const top = r.top + scrollY - mainTop;
      const right = sec.dataset.trace === 'r';
      const x = right ? W - margin * .5 : margin * .5;
      const insT = Math.min(140, (parseFloat(cs.paddingTop) || 0) * .55);
      const insB = Math.min(140, (parseFloat(cs.paddingBottom) || 0) * .55);
      segs.push({ x, y0: i === 0 ? top + r.height : top + insT, y1: top + r.height - insB });
    });
    if (segs.length < 2) return;
    const f = n => n.toFixed(1);
    let d = `M${f(segs[0].x)} ${f(segs[0].y1)}`;
    for (let i = 1; i < segs.length; i++) {
      const A = segs[i - 1], B = segs[i];
      const dy = B.y0 - A.y1;
      if (narrow && i > 1) d += ` M${f(A.x)} ${f(A.y1)}`;
      if (Math.abs(B.x - A.x) < 1) d += ` L${f(B.x)} ${f(B.y0)}`;
      else d += ` C${f(A.x)} ${f(A.y1 + dy * .62)}, ${f(B.x)} ${f(B.y0 - dy * .62)}, ${f(B.x)} ${f(B.y0)}`;
      if (!narrow) d += ` L${f(B.x)} ${f(B.y1)}`;
    }
    const [a, b] = $$('path', svgTrace);
    a.setAttribute('d', d);
    b.setAttribute('d', d);
    b.setAttribute('transform', `translate(${W < 760 ? 4 : 7} 0)`);
    total = a.getTotalLength();
    lut = [];
    const N = 400;
    for (let i = 0; i <= N; i++) { const p = a.getPointAtLength(total * i / N); lut.push([total * i / N, p.x, p.y]); }
    [a, b].forEach(p => { p.style.strokeDasharray = `${total} ${total}`; });
    svgTrace.dataset.top = mainTop;
    updateTrace();
  }
  function updateTrace() {
    if (!lut.length) return;
    const [a, b] = $$('path', svgTrace);
    const head = $('.trace-head', svgTrace);
    if (reduced) { a.style.strokeDashoffset = 0; b.style.strokeDashoffset = 0; head && (head.style.display = 'none'); return; }
    const y = scrollY + innerHeight * .64 - (+svgTrace.dataset.top || 0);
    let lo = 0, hi = lut.length - 1;
    if (y <= lut[0][2]) hi = 0;
    else if (y >= lut[hi][2]) lo = hi;
    else { while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lut[m][2] < y) lo = m; else hi = m; } }
    const p = lut[hi];
    const len = p[0];
    a.style.strokeDashoffset = total - len;
    b.style.strokeDashoffset = total - len;
    if (head) { head.setAttribute('cx', p[1] + 3.5); head.setAttribute('cy', p[2]); head.style.opacity = main.clientWidth >= 760 && len > 4 && len < total - 4 ? 1 : 0; }
  }
  ScrollTrigger.addEventListener('refresh', buildTrace);
  // Le contenu change de hauteur (tarifs, formulaire) : on recalcule tracé et déclencheurs
  if ('ResizeObserver' in window) {
    let lastH = main.offsetHeight, rsT = 0;
    new ResizeObserver(() => {
      const h = main.offsetHeight;
      if (Math.abs(h - lastH) < 4) return;
      lastH = h;
      clearTimeout(rsT);
      rsT = setTimeout(() => ScrollTrigger.refresh(), 300);
    }).observe(main);
  }
  addEventListener('scroll', updateTrace, { passive: true });
  if (lenis) lenis.on('scroll', updateTrace);

  /* ---------------- Altimètre ---------------- */
  const alt = $('.altimeter');
  if (alt) {
    const from = +alt.dataset.altFrom, to = +alt.dataset.altTo;
    const val = $('[data-alt]', alt);
    const fmt = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
    const upd = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = clamp(scrollY / (max || 1), 0, 1);
      val.textContent = fmt(Math.round((from + (to - from) * p) / 10) * 10);
      alt.style.setProperty('--alt-pos', p * 100 + '%');
      alt.classList.toggle('is-on', scrollY > innerHeight * .6);
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ---------------- Images : révélations et parallaxe ---------------- */
  if (!reduced) {
    $$('.reveal-media').forEach((m, i) => {
      if (m.closest('.hscroll-track')) { m.classList.remove('reveal-media'); return; }
      const dir = m.dataset.reveal || (i % 3 === 1 ? 'left' : i % 3 === 2 ? 'right' : 'up');
      const fromClip = { up: 'inset(100% 0% 0% 0%)', left: 'inset(0% 100% 0% 0%)', right: 'inset(0% 0% 0% 100%)' }[dir];
      gsap.set(m, { clipPath: fromClip });
      ScrollTrigger.create({
        trigger: m, start: 'top 90%', once: true,
        onEnter: () => {
          gsap.to(m, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out' });
          gsap.to(m.children, { scale: 1, duration: 1.8, ease: 'expo.out' });
        }
      });
    });
    $$('.media.parallax').forEach(m => {
      const inner = m.querySelector('picture img, svg.ph-svg') || m.firstElementChild;
      if (!inner) return;
      gsap.fromTo(inner, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: m, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  } else {
    $$('.reveal-media').forEach(m => m.classList.remove('reveal-media'));
  }

  /* ---------------- Compteurs ---------------- */
  $$('[data-count]').forEach(el => {
    const target = +el.dataset.count;
    const fmt = n => Math.round(n).toLocaleString(lang() === 'en' ? 'en-GB' : 'fr-FR').replace(/\u202f/g, '\u00a0');
    if (reduced) { el.textContent = fmt(target); return; }
    const from = +(el.dataset.countFrom || 0);
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => { const o = { v: from }; el.textContent = fmt(from); gsap.to(o, { v: target, duration: 1.6, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); }, onComplete: () => { el.textContent = fmt(target); } }); } });
  });

  /* ---------------- Manifeste : mots + talon qui se lève ---------------- */
  const manifest = $('.manifest');
  if (manifest) {
    const q = $('.manifest-quote', manifest);
    const wrapWords = () => {
      if (!q) return [];
      if (!q.dataset.wrapped || q.dataset.wrapped !== lang()) {
        q.innerHTML = q.textContent.trim().split(/\s+/).map(w => `<span class="wd">${w}</span>`).join(' ');
        q.dataset.wrapped = lang();
      }
      return $$('.wd', q);
    };
    let words = wrapWords();
    const boot = $('.heel .boot-g', manifest);
    if (!reduced) {
      const mm = gsap.matchMedia();
      mm.add('(min-width: 861px)', () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: manifest, start: 'top top', end: '+=60%', pin: true, scrub: .6 } });
        tl.to(words, { opacity: 1, stagger: .1, ease: 'none' }, 0);
        if (boot) tl.to(boot, { rotate: -24, svgOrigin: '101 54', ease: 'none', duration: words.length * .1 }, 0);
      });
      mm.add('(max-width: 860px)', () => {
        gsap.to(words, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: q, start: 'top 80%', end: 'bottom 45%', scrub: true } });
        if (boot) gsap.to(boot, { rotate: -24, svgOrigin: '101 54', ease: 'none', scrollTrigger: { trigger: '.heel', start: 'top 85%', end: 'bottom 40%', scrub: true } });
      });
      document.addEventListener('tl:lang', () => { words = wrapWords(); gsap.set(words, { opacity: 1 }); });
    } else {
      document.addEventListener('tl:lang', () => { words = wrapWords(); });
    }
  }

  /* ---------------- Comparateur Chalet / Annexe ---------------- */
  $$('.compare').forEach(cmp => {
    const handle = $('.compare-handle', cmp);
    let pos = 50;
    const set = p => { pos = clamp(p, 4, 96); cmp.style.setProperty('--pos', pos + '%'); handle.setAttribute('aria-valuenow', Math.round(pos)); };
    let drag = false;
    const fromEvent = e => { const r = cmp.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); };
    cmp.addEventListener('pointerdown', e => { drag = true; cmp.setPointerCapture(e.pointerId); fromEvent(e); gsap.killTweensOf(state); });
    cmp.addEventListener('pointermove', e => { if (drag) fromEvent(e); });
    cmp.addEventListener('pointerup', () => { drag = false; });
    cmp.addEventListener('pointercancel', () => { drag = false; });
    handle.addEventListener('keydown', e => {
      const k = { ArrowLeft: -5, ArrowRight: 5, Home: -100, End: 100 }[e.key];
      if (k !== undefined) { e.preventDefault(); set(pos + k); }
    });
    const state = { p: 50 };
    if (!reduced) {
      ScrollTrigger.create({
        trigger: cmp, start: 'top 70%', once: true,
        onEnter: () => gsap.timeline({ onUpdate: () => set(state.p) })
          .to(state, { p: 26, duration: 1.1, ease: 'power3.inOut' })
          .to(state, { p: 74, duration: 1.3, ease: 'power3.inOut' })
          .to(state, { p: 50, duration: 1, ease: 'power3.inOut' })
      });
    }
    set(50);
  });

  /* ---------------- Bandes horizontales épinglées ---------------- */
  const mmH = gsap.matchMedia();
  mmH.add({ big: '(min-width: 861px)', small: '(max-width: 860px)' }, ctx => {
    $$('.hscroll').forEach(sec => {
      const track = $('.hscroll-track', sec);
      if (!track) return;
      if (reduced || ctx.conditions.small) { sec.classList.add('native'); return; }
      sec.classList.remove('native');
      sec.classList.add('pinned');
      const cards = $$('.h-card', track);

      // Barre de progression au-dessus de la bande
      let bar = $('.hscroll-progress', sec);
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'hscroll-progress';
        bar.setAttribute('aria-hidden', 'true');
        bar.innerHTML = '<span></span>';
        track.before(bar);
      }
      const fill = bar.firstElementChild;

      // Les photos prennent la hauteur disponible : la bande et ses légendes tiennent toujours dans l'écran
      const fit = () => {
        const sub = $('.subnav');
        sec.style.setProperty('--sub-h', sub ? sub.offsetHeight + 'px' : '0px');
        let mh = 320;
        for (let pass = 0; pass < 2; pass++) {
          sec.style.setProperty('--mh', mh + 'px');
          const capH = Math.max(40, ...cards.map(c => Array.from(c.children).filter(x => !x.classList.contains('media')).reduce((a, x) => a + x.offsetHeight, 0)));
          mh = clamp(track.clientHeight - capH - 34, 200, 640);
        }
        sec.style.setProperty('--mh', mh + 'px');
      };
      fit();
      ScrollTrigger.addEventListener('refreshInit', fit);

      // Défilement plus court : la bande avance plus vite que la molette
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => '+=' + Math.round(dist() * .5), pin: true, scrub: .6, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: self => { fill.style.transform = `scaleX(${self.progress})`; }
        }
      });
      cards.forEach((card, i) => {
        const m = $('.media', card);
        const inner = m && (m.querySelector('picture img, svg.ph-svg') || m.firstElementChild);
        if (inner) gsap.fromTo(inner, { xPercent: -5, scale: 1.1 }, { xPercent: 5, scale: 1.1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        gsap.from(card, { y: i % 2 ? 22 : -14, rotate: i % 2 ? 1 : -1, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'left 60%', scrub: true } });
      });
      return () => ScrollTrigger.removeEventListener('refreshInit', fit);
    });
    return () => $$('.hscroll').forEach(sec => {
      sec.classList.remove('native', 'pinned');
      sec.style.removeProperty('--mh');
      const bar = $('.hscroll-progress', sec);
      bar && bar.remove();
    });
  });

  /* ---------------- Cartes inclinables ---------------- */
  $$('.od-card').forEach((card, i) => {
    if (!reduced) gsap.from(card, { rotateX: -24, y: 80, opacity: 0, duration: 1.3, ease: 'expo.out', delay: (i % 3) * .08, scrollTrigger: { trigger: card, start: 'top 92%', once: true } });
    if (!fine || reduced) return;
    const glare = $('.glare', card);
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      gsap.to(card, { rotateY: (px - .5) * 12, rotateX: (.5 - py) * 10, duration: .6, ease: 'power3' });
      glare && (glare.style.setProperty('--gx', px * 100 + '%'), glare.style.setProperty('--gy', py * 100 + '%'));
    });
    card.addEventListener('pointerleave', () => gsap.to(card, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, .5)' }));
  });

  /* ---------------- Grand Massif : bascule hiver / été ---------------- */
  const stage = $('.massif-stage');
  if (stage) {
    const winter = $('.layer-winter', stage);
    const cv = document.createElement('canvas');
    cv.width = 200; cv.height = 90;
    const c = cv.getContext('2d');
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    const blobs = Array.from({ length: 22 }, () => ({ x: rnd() * 200, y: rnd() * 90, s: .4 + rnd() * .9, d: rnd() * .35 }));
    function drawMask(p) {
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#000'; c.fillRect(0, 0, 200, 90);
      c.globalCompositeOperation = 'destination-out';
      blobs.forEach(b => {
        const q = clamp((p - b.d) / (1 - b.d), 0, 1);
        const r = q * 130 * b.s;
        if (r <= 0) return;
        const g = c.createRadialGradient(b.x, b.y, r * .55, b.x, b.y, r);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, r, 0, Math.PI * 2); c.fill();
      });
      if (p >= .999) { c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 200, 90); }
      winter.style.setProperty('--melt', `url(${cv.toDataURL()})`);
    }
    drawMask(0);
    const st = { p: 0 };
    const btns = $$('[data-season]');
    btns.forEach(btn => btn.addEventListener('click', () => {
      const summer = btn.dataset.season === 'ete';
      btns.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      $$('.season-panel').forEach(p => { p.hidden = p.dataset.panel !== btn.dataset.season; });
      gsap.to(st, { p: summer ? 1 : 0, duration: reduced ? .01 : 1.6, ease: 'power2.inOut', onUpdate: () => drawMask(st.p) });
      if (!reduced) gsap.from($$('.season-panel:not([hidden]) li'), { y: 14, opacity: 0, stagger: .04, duration: .6, ease: 'expo.out' });
    }));
    if (!reduced) gsap.fromTo($$('.media', stage), { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------------- Itinéraires et coches ---------------- */
  $$('[data-route]').forEach((p, i) => {
    let l = 0;
    try { l = p.getTotalLength(); } catch (e) { l = 0; }
    if (!l) return;
    p.style.strokeDasharray = l;
    p.style.strokeDashoffset = reduced ? 0 : l;
    if (!reduced) gsap.to(p, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: p.closest('.map'), start: `top ${80 - i * 10}%`, end: 'bottom 60%', scrub: 1 } });
  });
  if (!reduced) {
    $$('.amen ul').forEach(ul => {
      const paths = $$('svg path', ul);
      paths.forEach(p => { p.style.strokeDasharray = 20; p.style.strokeDashoffset = 20; });
      ScrollTrigger.create({ trigger: ul, start: 'top 85%', once: true, onEnter: () => gsap.to(paths, { strokeDashoffset: 0, duration: .5, stagger: .06, ease: 'power2.out' }) });
    });
    $$('.review').forEach((r, i) => {
      gsap.from($$('.ln', r), { scaleX: 0, transformOrigin: '0 50%', duration: 1, stagger: .15, ease: 'power3.out', delay: i * .2, scrollTrigger: { trigger: r, start: 'top 85%', once: true } });
      gsap.from($('.q', r), { yPercent: -60, opacity: 0, duration: 1, ease: 'bounce.out', delay: i * .2, scrollTrigger: { trigger: r, start: 'top 85%', once: true } });
    });
    $$('.room').forEach((room, i) => {
      gsap.fromTo(room, { rotateY: i % 2 ? 60 : -60, opacity: 0, transformOrigin: i % 2 ? '100% 50%' : '0% 50%' }, { rotateY: 0, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: room, start: 'top 95%', end: 'top 55%', scrub: .6 } });
    });
    const cta = $('.book-cta');
    if (cta) {
      gsap.fromTo($('.media', cta), { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: cta, start: 'top bottom', end: 'bottom bottom', scrub: true } });
      gsap.from($$('.book-link', cta), { x: i => (i ? 60 : -60), opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: $('.book-links', cta), start: 'top 85%', once: true } });
    }
    const fb = $('.footer-brand');
    if (fb) gsap.from(fb, { yPercent: 60, opacity: 0, skewX: -12, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: fb, start: 'top 95%', once: true } });
    $$('.facts').forEach(list => gsap.from(list.children, { y: 18, opacity: 0, stagger: .06, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: list, start: 'top 92%', once: true } }));
  }

  /* ---------------- Sous-navigation active ---------------- */
  const subLinks = $$('.subnav a');
  subLinks.forEach(a => {
    const t = document.getElementById(a.getAttribute('href').slice(1));
    if (!t) return;
    ScrollTrigger.create({
      trigger: t, start: 'top 45%', end: 'bottom 45%',
      onToggle: s => { if (s.isActive) { subLinks.forEach(x => x.classList.toggle('is-active', x === a)); a.scrollIntoView({ block: 'nearest', inline: 'center' }); } }
    });
  });

  /* ---------------- Barre de réservation mobile ---------------- */
  const mbar = $('.mbar');
  if (mbar) {
    const blockers = new Set();
    const link = $('a', mbar);
    const upd = () => {
      const on = scrollY > innerHeight * .7 && !blockers.size && !document.documentElement.classList.contains('lb-open');
      mbar.classList.toggle('is-on', on);
      mbar.setAttribute('aria-hidden', String(!on));
      link.tabIndex = on ? 0 : -1;
    };
    const io3 = new IntersectionObserver(es => { es.forEach(e => (e.isIntersecting ? blockers.add(e.target) : blockers.delete(e.target))); upd(); }, { rootMargin: '0px 0px -10% 0px' });
    $$('#tarifs, #demande, #reserver, .site-footer').forEach(el => io3.observe(el));
    addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ---------------- Ancre à l'arrivée ---------------- */
  addEventListener('load', () => {
    ScrollTrigger.refresh();
    if (location.hash) {
      let t = null; try { t = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (er) { /* ancre invalide */ }
      if (t) setTimeout(() => scrollToTarget(t), reduced ? 0 : 900);
    }
  });
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('resize', () => { clearTimeout(TL._rs); TL._rs = setTimeout(() => ScrollTrigger.refresh(), 200); });
})();
