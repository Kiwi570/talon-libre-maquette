/* Visionneuse photos : clic sur une vraie photo pour l'agrandir, flèches, clavier, balayage */
(function () {
  const IMG = window.TL_IMAGES || {};
  const TL = window.TL || {};
  const gsap = window.gsap;
  const t = (fr, en) => (document.documentElement.lang === 'en' ? en : fr);
  const EXCLUDE = '.hero-media, .compare, .guest-bg, .book-cta, .massif-stage, .od-card, .site-footer';
  const clean = s => (s || '').replace(/^(Photo du site actuel|Current site photo|Image Grok|Grok image)\s*:\s*/, '');

  const figs = [];
  const seen = new Set();
  document.querySelectorAll('.media.has-img[data-img^="site/"]').forEach(fig => {
    if (fig.closest(EXCLUDE) || fig.dataset.img.startsWith('site/logo')) return;
    figs.push(fig);
  });
  if (!figs.length) return;
  const items = [];
  figs.forEach(fig => {
    const key = fig.dataset.img;
    if (!seen.has(key)) { seen.add(key); items.push({ key, fig }); }
    fig.dataset.zoom = items.findIndex(i => i.key === key);
    fig.tabIndex = 0;
    fig.setAttribute('role', 'button');
    const badge = document.createElement('span');
    badge.className = 'zoom-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.innerHTML = '<svg viewBox="0 0 20 20"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M12.6 12.6 17 17M8.5 6v5M6 8.5h5"/></svg>';
    fig.appendChild(badge);
  });
  const label = fig => t('Agrandir la photo : ', 'Enlarge photo: ') + clean(t(fig.dataset.label, fig.dataset.labelEn));
  const relabel = () => figs.forEach(f => f.setAttribute('aria-label', label(f)));
  relabel();

  /* ---------- Fenêtre ---------- */
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.hidden = true;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <div class="lb-stage"><img class="lb-img" alt=""></div>
    <div class="lb-bar">
      <p class="lb-cap"></p>
      <p class="lb-count tnum" aria-live="polite"></p>
    </div>
    <button type="button" class="lb-btn lb-prev"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>
    <button type="button" class="lb-btn lb-next"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></button>
    <button type="button" class="lb-btn lb-close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
  document.body.appendChild(box);
  const img = box.querySelector('.lb-img');
  const cap = box.querySelector('.lb-cap');
  const count = box.querySelector('.lb-count');
  const btnPrev = box.querySelector('.lb-prev'), btnNext = box.querySelector('.lb-next'), btnClose = box.querySelector('.lb-close');
  const setBtnLabels = () => {
    btnPrev.setAttribute('aria-label', t('Photo précédente', 'Previous photo'));
    btnNext.setAttribute('aria-label', t('Photo suivante', 'Next photo'));
    btnClose.setAttribute('aria-label', t('Fermer', 'Close'));
    box.setAttribute('aria-label', t('Photos en grand', 'Large photos'));
  };
  setBtnLabels();

  let idx = 0, lastFocus = null;
  const src = key => { const m = IMG[key]; return `assets/img/${key}-${m.s[m.s.length - 1]}.webp`; };
  const srcset = key => IMG[key].s.map(s => `assets/img/${key}-${s}.webp ${s}w`).join(', ');

  function show(i, dir) {
    idx = (i + items.length) % items.length;
    const it = items[idx];
    const apply = () => {
      img.srcset = srcset(it.key);
      img.sizes = '100vw';
      img.src = src(it.key);
      img.alt = clean(t(it.fig.dataset.label, it.fig.dataset.labelEn));
      cap.textContent = img.alt.charAt(0).toUpperCase() + img.alt.slice(1);
      count.textContent = `${idx + 1} / ${items.length}`;
    };
    if (gsap && !TL.reduced && dir) {
      gsap.to(img, { x: -40 * dir, opacity: 0, duration: .18, ease: 'power2.in', onComplete: () => { apply(); gsap.fromTo(img, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: .45, ease: 'expo.out' }); } });
    } else apply();
    // préchargement des voisines
    [idx + 1, idx - 1].forEach(j => { const k = items[(j + items.length) % items.length].key; const p = new Image(); p.srcset = srcset(k); p.sizes = '100vw'; });
  }

  function open(i, fromFig) {
    lastFocus = document.activeElement;
    box.hidden = false;
    document.documentElement.classList.add('lb-open');
    TL.lenis && TL.lenis.stop();
    show(i);
    if (gsap && !TL.reduced) {
      gsap.fromTo(box, { opacity: 0 }, { opacity: 1, duration: .35, ease: 'power2.out' });
      const r = fromFig.getBoundingClientRect();
      const run = () => {
        const ir = img.getBoundingClientRect();
        if (!ir.width) return;
        gsap.fromTo(img, { x: r.left + r.width / 2 - (ir.left + ir.width / 2), y: r.top + r.height / 2 - (ir.top + ir.height / 2), scale: Math.max(r.width / ir.width, .2) }, { x: 0, y: 0, scale: 1, duration: .7, ease: 'expo.out' });
      };
      img.complete ? requestAnimationFrame(run) : img.addEventListener('load', run, { once: true });
      gsap.from(box.querySelectorAll('.lb-btn, .lb-bar'), { opacity: 0, duration: .5, delay: .2 });
    }
    btnClose.focus();
  }
  function close() {
    const done = () => {
      box.hidden = true;
      document.documentElement.classList.remove('lb-open');
      TL.lenis && TL.lenis.start();
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
    };
    if (gsap && !TL.reduced) gsap.to(box, { opacity: 0, duration: .25, ease: 'power2.in', onComplete: done });
    else done();
  }

  document.addEventListener('click', e => {
    const fig = e.target.closest('[data-zoom]');
    if (!fig || box.contains(fig)) return;
    e.preventDefault();
    open(+fig.dataset.zoom, fig);
  });
  document.addEventListener('keydown', e => {
    if (!box.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1, -1); }
      else if (e.key === 'Tab') {
        const f = [btnClose, btnPrev, btnNext];
        const k = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(k + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
      return;
    }
    const fig = document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-zoom]');
    if (fig && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(+fig.dataset.zoom, fig); }
  });
  btnPrev.addEventListener('click', () => show(idx - 1, -1));
  btnNext.addEventListener('click', () => show(idx + 1, 1));
  btnClose.addEventListener('click', close);
  box.addEventListener('click', e => { if (e.target === box || e.target.classList.contains('lb-stage')) close(); });

  // Balayage tactile
  let sx = 0, sy = 0;
  box.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  box.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) close();
  }, { passive: true });

  // Bouton « Voir les N photos » dans l'ouverture des pages logement
  const galleryBtns = document.querySelectorAll('[data-gallery]');
  const setGalleryLabels = () => galleryBtns.forEach(btn => {
    const l = btn.querySelector('.btn-label');
    if (l) l.textContent = t(`Voir les ${items.length} photos`, `See the ${items.length} photos`);
  });
  galleryBtns.forEach(btn => btn.addEventListener('click', () => open(0, btn)));
  setGalleryLabels();
  TL.openGallery = i => open(i || 0, figs[0]);

  document.addEventListener('tl:lang', () => { relabel(); setBtnLabels(); setGalleryLabels(); if (!box.hidden) show(idx); });
})();
