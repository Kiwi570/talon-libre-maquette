/* Tarifs, échéancier, frise d'annulation et demande de réservation (simulée) */
(function () {
  const box = document.getElementById('booking');
  if (!box) return;
  const D = window.TL_DATA;
  const home = box.dataset.home;
  const TL = window.TL || { t: (f) => f, lang: () => 'fr', reduced: true };
  const t = (fr, en) => (TL.lang() === 'en' ? en : fr);
  const loc = () => (TL.lang() === 'en' ? 'en-GB' : 'fr-FR');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const gsap = window.gsap;

  let apt = '6';
  const H = () => (home === 'chalet' ? D.chalet : apt === '8' ? D.annexe8 : D.annexe);
  const weeksMode = () => home === 'annexe' && apt === '6';

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const days = (a, b) => Math.round((b - a) / 86400000);
  const money = n => new Intl.NumberFormat(loc(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  // « 1er » en français pour le premier jour du mois
  const fmt = (d, o = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => {
    const s = new Intl.DateTimeFormat(loc(), o).format(d);
    return TL.lang() === 'en' || d.getDate() !== 1 ? s : s.replace(/(^|\s)1(\s)/, '$11er$2');
  };
  const long = d => fmt(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const short = d => fmt(d, { day: 'numeric', month: 'short' });

  /* Jours fériés français et jours ouvrables (lundi à samedi hors fériés) */
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  function holidays(y) {
    const e = easter(y);
    return new Set(['01-01', '05-01', '05-08', '07-14', '08-15', '11-01', '11-11', '12-25'].map(md => `${y}-${md}`)
      .concat([addDays(e, 1), addDays(e, 39), addDays(e, 50)].map(iso)));
  }
  function workingDaysBefore(date, n) {
    let d = new Date(date), count = 0;
    while (count < n) {
      d = addDays(d, -1);
      if (d.getDay() !== 0 && !holidays(d.getFullYear()).has(iso(d))) count++;
    }
    return d;
  }
  function monthsBefore(date, m) {
    const d = new Date(date.getFullYear(), date.getMonth() - m, 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(date.getDate(), last));
    return d;
  }

  /* ---------- Récapitulatif ---------- */
  const sel = { arr: null, dep: null, price: null };
  const summary = $('#summary');
  const aptName = () => (home === 'chalet' ? 'Chalet Le Talon Libre' : apt === '8' ? t('Annexe, appartement 8 personnes', 'Annexe, apartment for 8') : t('Annexe, appartement 6 personnes', 'Annexe, apartment for 6'));

  function render(animate) {
    const h = H();
    if (!sel.arr) {
      summary.innerHTML = `<h3>${aptName()}</h3><p class="empty">${weeksMode() ? t('Choisissez une semaine pour voir le détail.', 'Pick a week to see the details.') : t('Choisissez une date d’arrivée pour voir le détail.', 'Pick an arrival date to see the details.')}</p>`;
      updateSelbar();
      return;
    }
    const nights = days(sel.arr, sel.dep);
    const second = monthsBefore(sel.arr, D.payment.secondMonthsBefore);
    const balance = workingDaysBefore(sel.arr, D.payment.balanceWorkingDaysBefore);
    const p = sel.price;
    const due2 = second <= today ? t('dès la réservation, arrivée dans moins de 2 mois', 'on booking, arrival within 2 months') : t('avant le ', 'by ') + long(second);
    const dueB = balance <= today ? t('dès la réservation', 'on booking') : t('avant le ', 'by ') + long(balance);
    const row = (label, pct, when) => p
      ? `<dt>${label}, ${t(`${pct} %`, `${pct}%`)}</dt><dd>${money(p * pct / 100)}<br><span class="note">${when}</span></dd>`
      : `<dt>${label}</dt><dd>${t(`${pct} % du loyer`, `${pct}% of the rent`)}<br><span class="note">${when}</span></dd>`;
    const j30 = addDays(sel.arr, -D.cancellation.fullRefundDays), j15 = addDays(sel.arr, -D.cancellation.halfDays);
    const span = Math.max(1, days(today, sel.arr));
    const z1 = Math.max(0, days(today, j30)), z2 = Math.max(0, days(today < j30 ? j30 : today, j15)), z3 = Math.max(0, days(today < j15 ? j15 : today, sel.arr));
    summary.innerHTML = `
      <h3>${aptName()}</h3>
      <p class="sum-dates">${fmt(sel.arr)} → ${fmt(sel.dep)}, ${nights} ${t('nuits', 'nights')}</p>
      ${p ? `<p class="total" data-total>${money(p)}</p>` : `<p class="total total-s">${t('Tarif selon la période', 'Rate depends on the period')}</p><p class="sum-hint">${t('Le montant exact vous est confirmé par e-mail après votre demande.', 'The exact amount is confirmed by email after your request.')}</p>`}
      <dl>
        ${row(t('1er acompte', '1st deposit'), 25, t('à la réservation', 'on booking'))}
        ${row(t('2e acompte', '2nd deposit'), 25, due2)}
        ${row(t('Solde', 'Balance'), 50, dueB)}
        <dt class="gap">${t('Dépôt de garantie', 'Security deposit')}</dt><dd class="gap">${h.deposit ? money(h.deposit) : t('à confirmer', 'to be confirmed')}</dd>
        <dt>${t('Taxe de séjour', 'Tourist tax')}</dt><dd>${t('non incluse', 'not included')}</dd>
        <dt>${t('Charges', 'Utilities')}</dt><dd>${t('incluses', 'included')}</dd>
        <dt>${t('Arrivée, départ', 'Check-in, check-out')}</dt><dd>${t(h.checkIn + ', ' + h.checkOut, h.checkInEn + ', ' + h.checkOutEn)}</dd>
      </dl>
      <div class="frise" role="img" aria-label="${t('Conditions d’annulation', 'Cancellation terms')}">
        <div class="frise-bar"><span class="z1" style="flex-basis:${z1 / span * 100}%"></span><span class="z2" style="flex-basis:${z2 / span * 100}%"></span><span class="z3" style="flex-basis:${z3 / span * 100}%"></span></div>
        <div class="frise-legend">
          ${z1 > 0 ? `<span><i class="z1"></i>${t('Jusqu’au', 'Until')} ${fmt(j30, { day: 'numeric', month: 'long' })}${t(' : ', ': ')}${t('acomptes remboursés en totalité', 'deposits fully refunded')}</span>` : ''}
          ${z2 > 0 ? `<span><i class="z2"></i>${t('Jusqu’au', 'Until')} ${fmt(j15, { day: 'numeric', month: 'long' })}${t(' : ', ': ')}${t('50 % du loyer dû', '50% of the rent due')}</span>` : ''}
          <span><i class="z3"></i>${t('Ensuite : totalité du loyer due', 'After that: full rent due')}</span>
        </div>
      </div>
      <div class="btn-group">
        <a class="btn btn-red" href="#demande" data-prefill><span class="btn-label">${t('Demander ces dates', 'Request these dates')}</span></a>
        ${h.planning ? `<a class="btn btn-line" href="${h.planning}" target="_blank" rel="noopener"><span class="btn-label">${t('Voir le calendrier', 'See the calendar')}</span></a>` : ''}
      </div>
      <p class="note sum-note">${t('Montant indicatif. Après votre demande, vous recevez un e-mail de confirmation puis le contrat.', 'Indicative amount. After your request, you receive a confirmation email, then the contract.')}</p>`;
    $('[data-prefill]', summary).addEventListener('click', () => prefill());
    if (animate && gsap && !TL.reduced) {
      gsap.from($$('dl > *, .frise, .btn-group', summary), { y: 10, opacity: 0, stagger: .025, duration: .5, ease: 'expo.out' });
      const totalEl = $('[data-total]', summary);
      if (p && totalEl) { const o = { v: p * .6 }; gsap.to(o, { v: p, duration: .8, ease: 'power3.out', onUpdate: () => { totalEl.textContent = money(o.v); }, onComplete: () => { totalEl.textContent = money(p); } }); }
      gsap.from($$('.frise-bar span', summary), { scaleX: 0, transformOrigin: '0 50%', duration: .9, stagger: .1, ease: 'power3.out' });
    }
    updateSelbar();
  }

  /* ---------- Annexe 6 pers. : semaines à prix publiés ---------- */
  const weeksBox = $('#weeks');
  const seasons = [
    { id: 'h26', fr: 'Hiver 2026-2027', en: 'Winter 2026-27', test: d => d >= new Date(2026, 8, 1) && d < new Date(2027, 5, 1) },
    { id: 'e27', fr: 'Été 2027', en: 'Summer 2027', test: d => d >= new Date(2027, 5, 1) && d < new Date(2027, 9, 1) },
    { id: 'h27', fr: 'Hiver 2027-2028', en: 'Winter 2027-28', test: d => d >= new Date(2027, 9, 1) && d < new Date(2028, 5, 1) }
  ];
  let season = 'h26';
  const allWeeks = () => D.annexe.weeks.map(([a, b, p]) => ({ a: parse(a), b: parse(b), p }));
  function renderWeeks(animate) {
    if (!weeksBox) return;
    const tabs = $('#season-tabs');
    tabs.innerHTML = seasons.map(s => `<button type="button" data-s="${s.id}" aria-pressed="${s.id === season}">${t(s.fr, s.en)}</button>`).join('');
    $$('button', tabs).forEach(b => b.addEventListener('click', () => { season = b.dataset.s; renderWeeks(true); }));
    const S = seasons.find(s => s.id === season);
    const list = allWeeks().filter(w => S.test(w.a)).sort((x, y) => x.a - y.a);
    const byMonth = {};
    list.forEach(w => { const k = `${w.a.getFullYear()}-${w.a.getMonth()}`; (byMonth[k] = byMonth[k] || []).push(w); });
    weeksBox.innerHTML = Object.values(byMonth).map(ws => `
      <div class="month"><h3>${fmt(ws[0].a, { month: 'long', year: 'numeric' })}</h3>
        <div class="month-grid">${ws.map(w => {
          const past = w.a < today;
          const on = sel.arr && +sel.arr === +w.a && +sel.dep === +w.b;
          const same = w.a.getMonth() === w.b.getMonth();
          const label = same ? `${w.a.getDate() === 1 && TL.lang() !== 'en' ? '1er' : w.a.getDate()}–${short(w.b)}` : `${short(w.a)} – ${short(w.b)}`;
          return `<button type="button" class="week${past ? ' is-past' : ''}" data-a="${iso(w.a)}" data-b="${iso(w.b)}" data-p="${w.p}" aria-pressed="${!!on}" ${past ? 'disabled' : ''} data-past="${t('passée', 'past')}">
            <span class="d">${fmt(w.a, { weekday: 'short' })} ${label}</span><span class="p">${money(w.p)}</span></button>`;
        }).join('')}</div></div>`).join('');
    $$('.week', weeksBox).forEach(btn => btn.addEventListener('click', () => {
      sel.arr = parse(btn.dataset.a); sel.dep = parse(btn.dataset.b); sel.price = +btn.dataset.p;
      $$('.week', weeksBox).forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      render(true);
    }));
    if (animate && gsap && !TL.reduced) gsap.from($$('.week', weeksBox), { y: 16, opacity: 0, stagger: .015, duration: .6, ease: 'expo.out' });
  }

  /* ---------- Chalet et Annexe 8 pers. : dates libres, tarif sur demande ---------- */
  const arrIn = $('#arr'), nightsIn = $('#nights');
  const fillNights = keep => {
    if (!nightsIn) return;
    const v = keep ? nightsIn.value : '7';
    nightsIn.innerHTML = Array.from({ length: 12 }, (_, i) => i + H().minNights).map(n => `<option value="${n}">${n} ${t('nuits', 'nights')}</option>`).join('');
    nightsIn.value = v && +v >= H().minNights ? v : '7';
  };
  function fromInputs(animate) {
    if (!arrIn) return;
    const a = arrIn.value ? parse(arrIn.value) : null;
    const errEl = $('#arr-err');
    if (!a) { sel.arr = null; render(); return; }
    if (a <= today) { errEl.textContent = t('Choisissez une date à venir.', 'Choose a future date.'); return; }
    errEl.textContent = '';
    sel.arr = a; sel.dep = addDays(a, +nightsIn.value); sel.price = null;
    render(animate);
  }
  if (arrIn) {
    arrIn.min = iso(addDays(today, 1));
    if (!arrIn.value) arrIn.value = '2026-12-19';
    fillNights(false);
    arrIn.addEventListener('change', () => fromInputs(true));
    nightsIn.addEventListener('change', () => fromInputs(true));
  }

  /* ---------- Choix de l'appartement (Annexe) ---------- */
  function setApt(v, animate) {
    if (home !== 'annexe') return;
    apt = v;
    $$('[data-apt]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.apt === v)));
    const wb = $('#weeks-block'), db = $('#dates-block');
    if (wb) wb.hidden = v !== '6';
    if (db) db.hidden = v !== '8';
    if (form && form.appartement) form.appartement.value = v;
    if (form) { form.adultes.max = H().capacity; form.enfants.max = H().capacity; }
    if (v === '6') {
      const first = allWeeks().find(w => w.a > today);
      if (first) { sel.arr = first.a; sel.dep = first.b; sel.price = first.p; }
      renderWeeks(false);
      render(animate);
    } else {
      fillNights(true);
      fromInputs(animate);
    }
  }
  $$('[data-apt]').forEach(b => b.addEventListener('click', () => setApt(b.dataset.apt, true)));
  $$('[data-pick-apt]').forEach(b => b.addEventListener('click', () => setApt(b.dataset.pickApt, true)));

  /* ---------- Formulaire en 3 étapes ---------- */
  const form = $('#request');
  let step = 1;
  function showStep(n) {
    step = n;
    $$('.step-panel', form).forEach(p => { p.hidden = +p.dataset.step !== n; });
    $$('.steps li', form.parentElement).forEach((li, i) => { li.classList.toggle('is-done', i + 1 < n); li.classList.toggle('is-current', i + 1 === n); });
    $('[data-prev]', form).hidden = n === 1;
    $('[data-next]', form).hidden = n === 3;
    $('[data-submit]', form).hidden = n !== 3;
    const panel = $(`.step-panel[data-step="${n}"]`, form);
    if (gsap && !TL.reduced) gsap.from(panel, { x: 40, opacity: 0, duration: .6, ease: 'expo.out' });
  }
  function err(name, msg) { const e = $(`[data-err="${name}"]`, form); if (e) e.textContent = msg || ''; return !msg; }
  function validate(n) {
    let ok = true;
    const h = H();
    if (n === 1) {
      const a = form.arrivee.value ? parse(form.arrivee.value) : null, d = form.depart.value ? parse(form.depart.value) : null;
      ok = err('arrivee', !a ? t('Indiquez votre date d’arrivée.', 'Enter your arrival date.') : a <= today ? t('Choisissez une date à venir.', 'Choose a future date.') : '') && ok;
      ok = err('depart', !d ? t('Indiquez votre date de départ.', 'Enter your departure date.')
        : a && d <= a ? t('La date de départ doit suivre la date d’arrivée.', 'The departure date must be after the arrival date.')
        : a && days(a, d) < h.minNights ? t(`Séjour de ${h.minNights} nuits minimum (ou à la semaine selon la période).`, `Minimum stay ${h.minNights} nights (or weekly depending on the period).`) : '') && ok;
      const n2 = (+form.adultes.value || 0) + (+form.enfants.value || 0);
      ok = err('personnes', n2 < 1 ? t('Indiquez au moins une personne.', 'Enter at least one guest.') : n2 > h.capacity ? t(`${h.capacity} personnes au maximum pour ce logement.`, `${h.capacity} guests maximum for this home.`) : '') && ok;
    }
    if (n === 3) {
      ok = err('nom', form.nom.value.trim() ? '' : t('Indiquez votre nom.', 'Enter your name.')) && ok;
      ok = err('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim()) ? '' : t('Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.', 'Enter a valid email address, for example name@domain.com.')) && ok;
      ok = err('accord', form.accord.checked ? '' : t('Cochez cette case pour envoyer la demande.', 'Tick this box to send the request.')) && ok;
    }
    if (!ok) { const first = $('.err:not(:empty)', form); const f = first && first.closest('.field'); const inp = f ? $('input, select, textarea', f) : null; inp && inp.focus(); }
    return ok;
  }
  function recap() {
    const r = $('#recap');
    if (!r || !sel.arr) return;
    r.hidden = false;
    r.innerHTML = `<span><strong>${aptName()}</strong>${short(sel.arr)} → ${short(sel.dep)}${sel.price ? ', ' + money(sel.price) : ''}</span><a class="link-trace" href="#tarifs">${t('modifier', 'change')}</a>`;
  }
  function prefill() {
    if (!sel.arr || !form) return;
    form.arrivee.value = iso(sel.arr); form.depart.value = iso(sel.dep);
    form.depart.min = iso(addDays(sel.arr, H().minNights));
    if (form.appartement) form.appartement.value = apt;
    recap();
    showStep(1);
  }
  if (form) {
    // Dates : pas de date passée, départ calé sur la durée minimale
    form.arrivee.min = iso(addDays(today, 1));
    const syncDep = () => {
      if (!form.arrivee.value) return;
      const a = parse(form.arrivee.value);
      const minDep = addDays(a, H().minNights);
      form.depart.min = iso(minDep);
      if (!form.depart.value || parse(form.depart.value) < minDep) form.depart.value = iso(addDays(a, 7));
      const r = $('#recap'); if (r) r.hidden = true;
    };
    form.arrivee.addEventListener('change', syncDep);
    form.depart.addEventListener('change', () => { const r = $('#recap'); if (r) r.hidden = true; });
    if (form.appartement) form.appartement.addEventListener('change', () => setApt(form.appartement.value, false));
    $('[data-next]', form).addEventListener('click', () => { if (validate(step)) showStep(step + 1); });
    $('[data-prev]', form).addEventListener('click', () => showStep(step - 1));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (!validate(3)) return;
      const a = parse(form.arrivee.value), d = parse(form.depart.value);
      const services = $$('input[name="services"]:checked', form).map(i => i.parentElement.textContent.trim());
      const done = $('#request-done');
      done.innerHTML = `<div class="confirm" role="status">
        <h3>${t('Demande prête à partir', 'Request ready to send')}</h3>
        <p>${t('Simulation : rien n’a été envoyé. Sur le site en ligne, vous recevriez un e-mail de confirmation, puis le contrat de location.', 'Simulation: nothing has been sent. On the live site you would receive a confirmation email, then the rental contract.')}</p>
        <dl class="confirm-dl tnum">
          <dt>${t('Logement', 'Home')}</dt><dd>${aptName()}</dd>
          <dt>${t('Séjour', 'Stay')}</dt><dd>${fmt(a)} → ${fmt(d)}, ${days(a, d)} ${t('nuits', 'nights')}</dd>
          <dt>${t('Personnes', 'Guests')}</dt><dd>${(+form.adultes.value || 0) + (+form.enfants.value || 0)}</dd>
          <dt>${t('Services', 'Services')}</dt><dd>${services.length ? services.join(', ') : t('aucun', 'none')}</dd>
          <dt>${t('Réponse à', 'Reply to')}</dt><dd>${form.email.value.replace(/[<>&"]/g, '')}</dd>
        </dl>
        <button type="button" class="btn btn-line btn-s" data-again>${t('Faire une autre demande', 'Make another request')}</button></div>`;
      form.hidden = true; done.hidden = false;
      $('[data-again]', done).addEventListener('click', () => { form.reset(); form.hidden = false; done.hidden = true; showStep(1); if (form.appartement) form.appartement.value = apt; });
      if (TL.scrollToTarget) TL.scrollToTarget(done); else done.scrollIntoView({ block: 'start' });
      done.focus({ preventScroll: true });
      if (gsap && !TL.reduced) gsap.from(done.firstElementChild, { y: 30, opacity: 0, duration: .8, ease: 'expo.out' });
    });
    showStep(1);
  }

  /* ---------- Barre de sélection sur téléphone (dans la section Tarifs) ---------- */
  const selbar = document.createElement('div');
  selbar.className = 'selbar';
  selbar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(selbar);
  let inBooking = false, summaryVisible = false;
  function updateSelbar() {
    if (!sel.arr) { selbar.classList.remove('is-on'); return; }
    selbar.innerHTML = `<button type="button" class="selbar-info" data-to-summary><strong>${short(sel.arr)} → ${short(sel.dep)}</strong><span>${sel.price ? money(sel.price) : t('Tarif sur demande', 'Rate on request')}, ${t('voir le détail', 'see details')}</span></button><a class="btn btn-red" href="#demande" data-prefill-bar><span class="btn-label">${t('Demander', 'Request')}</span></a>`;
    $('[data-prefill-bar]', selbar).addEventListener('click', () => prefill());
    $('[data-to-summary]', selbar).addEventListener('click', () => TL.scrollToTarget ? TL.scrollToTarget(summary) : summary.scrollIntoView());
    toggleSelbar();
  }
  function toggleSelbar() {
    const on = matchMedia('(max-width: 960px)').matches && inBooking && !summaryVisible && !!sel.arr;
    selbar.classList.toggle('is-on', on);
    selbar.setAttribute('aria-hidden', String(!on));
    $$('a, button', selbar).forEach(el => { el.tabIndex = on ? 0 : -1; });
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { es.forEach(e => { if (e.target === box) inBooking = e.isIntersecting; else summaryVisible = e.isIntersecting; }); toggleSelbar(); }, { threshold: [0, .15] }).observe(box);
    new IntersectionObserver(es => { es.forEach(e => { summaryVisible = e.intersectionRatio > .35; }); toggleSelbar(); }, { threshold: [0, .35, .6] }).observe(summary);
  }

  /* ---------- Démarrage ---------- */
  if (home === 'annexe') setApt('6', false);
  else fromInputs(false);
  if (form && sel.arr) { form.arrivee.value = iso(sel.arr); form.depart.value = iso(sel.dep); }

  document.addEventListener('tl:lang', () => {
    if (weeksMode()) renderWeeks(false);
    fillNights(true);
    render(false);
    if ($('#recap') && !$('#recap').hidden) recap();
  });
})();
