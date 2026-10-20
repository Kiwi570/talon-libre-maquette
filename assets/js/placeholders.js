/* Images : vraie image (manifeste TL_IMAGES) ou visuel provisoire dessiné en code */
(function () {
  const IMG = window.TL_IMAGES || {};
  const ILLUS = ['grok/massif-hiver-16x9', 'grok/massif-ete-16x9', 'grok/flaine-altitude-16x9', 'grok/carroz-ambiance-16x9', 'grok/acces-route-16x9', 'grok/inclus-linge-4x5', 'grok/inclus-veillee-4x5', 'grok/service-transfert-16x9'];
  const NS = 'http://www.w3.org/2000/svg';

  function rand(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function ridge(r, y, amp, w, h, steps) {
    let d = `M0 ${h} L0 ${y}`;
    for (let i = 1; i <= steps; i++) {
      const x = (i / steps) * w;
      const yy = y - amp * (0.3 + r() * 0.9) * (i % 2 ? 1 : 0.35);
      d += ` L${x.toFixed(1)} ${yy.toFixed(1)}`;
    }
    return d + ` L${w} ${h} Z`;
  }

  const icons = {
    sofa: 'M-60 10 h120 v28 h-120 z M-70 0 h20 v38 h-20 z M50 0 h20 v38 h-20 z M-50 -14 h100 v24 h-100 z',
    bed: 'M-80 20 h160 v24 h-160 z M-80 -20 v64 M80 4 v40 M-70 0 h50 v20 h-50 z',
    bath: 'M-70 0 h140 v12 a30 30 0 0 1 -30 30 h-80 a30 30 0 0 1 -30 -30 z M-50 0 v-40 a12 12 0 0 1 24 0',
    window: 'M-60 -50 h120 v100 h-120 z M0 -50 v100 M-60 0 h120',
    pot: 'M-44 -6 h88 v26 a20 20 0 0 1 -20 20 h-48 a20 20 0 0 1 -20 -20 z M-56 -6 h112 M-14 -26 c-8 -10 8 -14 0 -24 M14 -26 c-8 -10 8 -14 0 -24',
    stones: 'M-50 20 a30 16 0 1 0 60 0 a30 16 0 1 0 -60 0 M0 0 a26 14 0 1 0 52 0 a26 14 0 1 0 -52 0 M-30 -18 a22 12 0 1 0 44 0 a22 12 0 1 0 -44 0',
    pool: 'M-80 10 c20 -12 40 12 60 0 s40 -12 60 0 s40 12 60 0 M-80 30 c20 -12 40 12 60 0 s40 -12 60 0 s40 12 60 0 M-40 -10 v-40 M40 -10 v-40 M-40 -40 h80',
    ski: 'M-90 30 l180 -40 M-90 44 l180 -40 M-20 10 l-10 -50 M20 2 l-10 -50'
  };

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function placeholder(fig) {
    const type = fig.dataset.ph || 'dawn';
    const r = rand(fig.dataset.seed || fig.dataset.img || type);
    const W = 800, H = 1000;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid slice', class: 'ph-svg', 'aria-hidden': 'true' });
    const defs = el('defs', {});
    const gid = 'g' + Math.floor(r() * 1e9);
    const sky = el('linearGradient', { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 });
    const palettes = {
      dawn: ['#f4d6cf', '#cfe0ee', '#f1f4f6'], winter: ['#2f6ea3', '#9cc3df', '#eef3f6'], summer: ['#4f8ec2', '#bfe0f0', '#eef3f6'],
      night: ['#0a1522', '#1d3550', '#24394f'], interior: ['#d8b48a', '#b98e62', '#7a5a3c'], still: ['#e9e2d8', '#d6cbbd', '#b9a993'],
      pool: ['#9fd3ea', '#5aa8cf', '#2c6f98'], aerial: ['#f6f8f9', '#e4ebf0', '#cdd9e2'], texture: ['#f6f9fb', '#e6eef4', '#d7e2ea']
    };
    const pal = palettes[type] || palettes.dawn;
    pal.forEach((c, i) => sky.appendChild(el('stop', { offset: i / (pal.length - 1), 'stop-color': c })));
    defs.appendChild(sky);
    svg.appendChild(defs);
    svg.appendChild(el('rect', { width: W, height: H, fill: `url(#${gid})` }));

    if (['dawn', 'winter', 'summer', 'night'].includes(type)) {
      const tones = {
        dawn: ['#b7c7d6', '#d6e1ea', '#f7f9fa'], winter: ['#8fb0cb', '#c9dbe8', '#f7fafb'],
        summer: ['#5f7f6a', '#7fa27a', '#a9c48e'], night: ['#16283b', '#1f344b', '#e8eef3']
      }[type];
      svg.appendChild(el('path', { d: ridge(r, 470, 160, W, H, 9), fill: tones[0] }));
      svg.appendChild(el('path', { d: ridge(r, 600, 120, W, H, 7), fill: tones[1] }));
      svg.appendChild(el('path', { d: `M0 ${H} L0 760 C 260 690, 520 820, ${W} 700 L${W} ${H} Z`, fill: tones[2] }));
      if (type !== 'summer') {
        const tr = `M520 700 C 440 760, 600 800, 470 860 S 420 960, 360 1000`;
        svg.appendChild(el('path', { d: tr, fill: 'none', stroke: '#9db5cb', 'stroke-width': 4, 'stroke-linecap': 'round' }));
        svg.appendChild(el('path', { d: tr, fill: 'none', stroke: '#9db5cb', 'stroke-width': 4, transform: 'translate(16 4)', 'stroke-linecap': 'round' }));
      }
      if (type === 'night') for (let i = 0; i < 60; i++) svg.appendChild(el('circle', { cx: r() * W, cy: r() * 420, r: r() * 1.6 + .3, fill: '#fff', opacity: r() * .8 }));
    } else if (type === 'aerial' || type === 'texture') {
      for (let i = 0; i < 180; i++) svg.appendChild(el('circle', { cx: r() * W, cy: r() * H, r: r() * 2 + .4, fill: '#fff', opacity: .7 }));
      if (type === 'aerial') {
        const tr = 'M380 -20 C 560 120, 220 260, 400 400 S 580 680, 380 820 S 260 980, 420 1040';
        svg.appendChild(el('path', { d: tr, fill: 'none', stroke: '#9db5cb', 'stroke-width': 5 }));
        svg.appendChild(el('path', { d: tr, fill: 'none', stroke: '#9db5cb', 'stroke-width': 5, transform: 'translate(22 0)' }));
      }
    } else {
      const ink = type === 'interior' ? '#fff8ee' : type === 'pool' ? '#eaf6fb' : '#5a4a3a';
      svg.appendChild(el('rect', { x: 0, y: H * .72, width: W, height: H * .28, fill: '#000', opacity: .1 }));
      const g = el('g', { transform: `translate(${W / 2} ${H / 2}) scale(2.2)`, fill: 'none', stroke: ink, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: .85 });
      g.appendChild(el('path', { d: icons[fig.dataset.icon] || icons.window }));
      svg.appendChild(g);
    }
    return svg;
  }

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'fr'; }

  function srcset(key) {
    const m = IMG[key];
    return m.s.map(s => `assets/img/${key}-${s}.webp ${s}w`).join(', ');
  }

  function render(fig) {
    if (fig.dataset.rendered) return;
    fig.dataset.rendered = '1';
    const key = fig.dataset.img;
    const mob = fig.dataset.imgMobile;
    const alt = lang() === 'en' ? (fig.dataset.altEn || fig.dataset.labelEn || '') : (fig.dataset.alt || fig.dataset.label || '');
    if (key && IMG[key]) {
      const m = IMG[key];
      const picture = document.createElement('picture');
      if (mob && IMG[mob]) {
        const s = document.createElement('source');
        s.media = '(max-width: 700px) and (orientation: portrait)';
        s.srcset = srcset(mob);
        s.sizes = '100vw';
        picture.appendChild(s);
      }
      const img = document.createElement('img');
      img.srcset = srcset(key);
      img.sizes = fig.dataset.sizes || (fig.closest('.hero, .p-hero, .book-cta, .massif-stage, .guest, .compare') ? '100vw' : '(max-width: 760px) 92vw, 50vw');
      img.src = `assets/img/${key}-${m.s[Math.min(1, m.s.length - 1)]}.webp`;
      img.width = m.w; img.height = m.h;
      img.alt = fig.dataset.decorative !== undefined ? '' : alt.replace(/^(Photo du site actuel|Current site photo|Image Grok|Grok image)\s*:\s*/, '');
      img.decoding = 'async';
      img.loading = fig.hasAttribute('data-eager') ? 'eager' : 'lazy';
      if (fig.hasAttribute('data-eager')) img.fetchPriority = 'high';
      if (key.startsWith('site/') && !key.startsWith('site/logo')) img.className = 'img-grade';
      if (fig.dataset.pos) img.style.objectPosition = fig.dataset.pos;
      picture.appendChild(img);
      fig.appendChild(picture);
      fig.classList.add('has-img');
      // Images d'ambiance générées qui évoquent des lieux : mention discrète
      if (ILLUS.includes(key)) {
        const c = document.createElement('figcaption');
        c.className = 'illus';
        c.dataset.fr = 'Illustration'; c.dataset.en = 'Illustration';
        c.textContent = 'Illustration';
        fig.appendChild(c);
      }
    } else {
      fig.appendChild(placeholder(fig));
      const tag = document.createElement('span');
      tag.className = 'ph-tag';
      tag.textContent = (lang() === 'en' ? 'Temporary visual: ' : 'Visuel provisoire : ') + (lang() === 'en' ? fig.dataset.labelEn : fig.dataset.label).replace(/^(Photo du site actuel|Current site photo|Image Grok|Grok image)\s*:\s*/, '');
      tag.dataset.fr = 'Visuel provisoire : ' + (fig.dataset.label || '').replace(/^(Photo du site actuel|Image Grok)\s*:\s*/, '');
      tag.dataset.en = 'Temporary visual: ' + (fig.dataset.labelEn || '').replace(/^(Current site photo|Grok image)\s*:\s*/, '');
      fig.appendChild(tag);
      fig.setAttribute('role', 'img');
      fig.setAttribute('aria-label', alt);
    }
  }

  function relabel() {
    document.querySelectorAll('.media img').forEach(img => {
      const fig = img.closest('.media');
      if (!fig || fig.dataset.decorative !== undefined) return;
      const a = lang() === 'en' ? (fig.dataset.altEn || fig.dataset.labelEn) : (fig.dataset.alt || fig.dataset.label);
      img.alt = (a || '').replace(/^(Photo du site actuel|Current site photo|Image Grok|Grok image)\s*:\s*/, '');
    });
    document.querySelectorAll('.ph-tag').forEach(t => { t.textContent = t.dataset[lang()]; });
  }

  window.TL_MEDIA = { renderAll: () => document.querySelectorAll('.media[data-img]').forEach(render), relabel };
  window.TL_MEDIA.renderAll();
})();
