/* Tarifs, échéancier, frise d'annulation et demande de réservation (simulée) */
(function () {
  const box = document.getElementById('booking');
  if (!box) return;
  const D = window.TL_DATA;
  const home = box.dataset.home;
  const H = D[home];
  const TL = window.TL || { t: (f) => f, lang: () => 'fr', reduced: true };
  const t = (fr, en) => (TL.lang() === 'en' ? en : fr);
  const loc = () => (TL.lang() === 'en' ? 'en-GB' : 'fr-FR');
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const gsap = window.gsap;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const days = (a, b) => Math.round((b - a) / 86400000);
  const money = n => new Intl.NumberFormat(loc(), { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmt = (d, o = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) => new Intl.DateTimeFormat(loc(), o).format(d);

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

  /* ---------- Sélection ---------- */
  const sel = { arr: null, dep: null, price: null };
  const summary = $('#summary');

  function render(animate) {
    if (!sel.arr) { summary.innerHTML = `<h3>${t('Votre séjour', 'Your stay')}</h3><p class="empty">${t('Choisissez une semaine pour voir le détail.', 'Pick a week to see the details.')}</p>`; return; }
    const nights = days(sel.arr, sel.dep);
    const second = monthsBefore(sel.arr, D.payment.secondMonthsBefore);
    const balance = workingDaysBefore(sel.arr, D.payment.balanceWorkingDaysBefore);
    const due = d => (d <= today ? t('dès la réservation', 'on booking') : t('avant le ', 'by ') + fmt(d, { day: 'numeric', month: 'long', year: 'numeric' }));
    const p = sel.price;
    const amt = (r) => (p ? money(p * r) : t(`${Math.round(r * 100)} % du loyer`, `${Math.round(r * 100)}% of the rent`));
    const j30 = addDays(sel.arr, -D.cancellation.fullRefundDays), j15 = addDays(sel.arr, -D.cancellation.halfDays);
    const span = Math.max(1, days(today, sel.arr));
    const z1 = Math.max(0, days(today, j30)), z2 = Math.max(0, days(today < j30 ? j30 : today, j15)), z3 = Math.max(0, days(today < j15 ? j15 : today, sel.arr));
    const title = home === 'chalet' ? 'Chalet Le Talon Libre' : t('Annexe, appartement 6 personnes', 'Annexe, 6-person apartment');
    summary.innerHTML = `
      <h3>${title}</h3>
      <p class="sum-dates">${fmt(sel.arr)} → ${fmt(sel.dep)}, ${nights} ${t('nuits', 'nights')}</p>
      <p class="total" data-total>${p ? money(p) : t('Sur demande', 'On request')}</p>
      ${p ? '' : `<p><span class="todo">${t('Grille tarifaire du chalet à compléter', 'Chalet rates to be completed')}</span></p>`}
      <dl>
        <dt>${t('1er acompte, 25 %', '1st deposit, 25%')}</dt><dd>${amt(D.payment.first)}<br><span class="note">${t('à la réservation', 'on booking')}</span></dd>
        <dt>${t('2e acompte, 25 %', '2nd deposit, 25%')}</dt><dd>${amt(D.payment.second)}<br><span class="note">${due(second)}</span></dd>
        <dt>${t('Solde, 50 %', 'Balance, 50%')}</dt><dd>${amt(1 - D.payment.first - D.payment.second)}<br><span class="note">${due(balance)}</span></dd>
        <dt class="gap">${t('Dépôt de garantie', 'Security deposit')}</dt><dd class="gap">${money(H.deposit)}</dd>
        <dt>${t('Taxe de séjour', 'Tourist tax')}</dt><dd>${t('non incluse', 'not included')}</dd>
        <dt>${t('Charges', 'Utilities')}</dt><dd>${t('incluses', 'included')}</dd>
        <dt>${t('Arrivée, départ', 'Check-in, check-out')}</dt><dd>${t(H.checkIn + ', ' + H.checkOut, H.checkInEn + ', ' + H.checkOutEn)}</dd>
      </dl>
      <div class="frise" aria-label="${t('Conditions d’annulation', 'Cancellation terms')}">
        <div class="frise-bar"><span class="z1" style="flex-basis:${z1 / span * 100}%"></span><span class="z2" style="flex-basis:${z2 / span * 100}%"></span><span class="z3" style="flex-basis:${z3 / span * 100}%"></span></div>
        <div class="frise-legend">
          ${z1 > 0 ? `<span><i style="background:#8fd0a6"></i>${t('Jusqu’au', 'Until')} ${fmt(j30, { day: 'numeric', month: 'long' })}${t(' : ', ': ')}${t('acomptes remboursés en totalité', 'deposits fully refunded')}</span>` : ''}
          ${z2 > 0 ? `<span><i style="background:#f0b45a"></i>${t('Jusqu’au', 'Until')} ${fmt(j15, { day: 'numeric', month: 'long' })}${t(' : ', ': ')}${t('50 % du loyer dû', '50% of the rent due')}</span>` : ''}
          <span><i style="background:#e2321f"></i>${t('Ensuite : totalité du loyer due', 'After that: full rent due')}</span>
        </div>
      </div>
      <div class="btn-group">
        <a class="btn btn-red" href="#demande" data-prefill><span class="btn-label">${t('Demander ces dates', 'Request these dates')}</span></a>
        <a class="btn btn-line" href="${H.planning}" target="_blank" rel="noopener"><span class="btn-label">${t('Planning réel', 'Live planning')}</span></a>
      </div>
      <p class="note" style="margin-top:1rem">${t('Calcul indicatif d’après les conditions du site actuel. Disponibilité à confirmer sur le planning réel.', 'Indicative calculation based on the current website terms. Availability to be confirmed on the live planning.')}</p>`;
    $('[data-prefill]', summary).addEventListener('click', () => prefill());
    if (animate && gsap && !TL.reduced) {
      gsap.from($$('dl > *, .frise, .btn-group', summary), { y: 10, opacity: 0, stagger: .025, duration: .5, ease: 'expo.out' });
      const totalEl = $('[data-total]', summary);
      if (p && totalEl) { const o = { v: p * .6 }; gsap.to(o, { v: p, duration: .8, ease: 'power3.out', onUpdate: () => { totalEl.textContent = money(o.v); } }); }
      gsap.from($$('.frise-bar span', summary), { scaleX: 0, transformOrigin: '0 50%', duration: .9, stagger: .1, ease: 'power3.out' });
    }
  }

  /* ---------- Annexe : semaines à prix publiés ---------- */
  const weeksBox = $('#weeks');
  const seasons = [
    { id: 'h26', fr: 'Hiver 2026-2027', en: 'Winter 2026-27', test: d => d >= new Date(2026, 8, 1) && d < new Date(2027, 5, 1) },
    { id: 'e27', fr: 'Été 2027', en: 'Summer 2027', test: d => d >= new Date(2027, 5, 1) && d < new Date(2027, 9, 1) },
    { id: 'h27', fr: 'Hiver 2027-2028', en: 'Winter 2027-28', test: d => d >= new Date(2027, 9, 1) && d < new Date(2028, 5, 1) }
  ];
  let season = 'h26';
  function renderWeeks(animate) {
    if (!weeksBox) return;
    const tabs = $('#season-tabs');
    tabs.innerHTML = seasons.map(s => `<button type="button" data-s="${s.id}" aria-pressed="${s.id === season}">${t(s.fr, s.en)}</button>`).join('');
    $$('button', tabs).forEach(b => b.addEventListener('click', () => { season = b.dataset.s; renderWeeks(true); }));
    const S = seasons.find(s => s.id === season);
    const list = H.weeks.map(([a, b, p]) => ({ a: parse(a), b: parse(b), p })).filter(w => S.test(w.a)).sort((x, y) => x.a - y.a);
    const byMonth = {};
    list.forEach(w => { const k = `${w.a.getFullYear()}-${w.a.getMonth()}`; (byMonth[k] = byMonth[k] || []).push(w); });
    weeksBox.innerHTML = Object.values(byMonth).map(ws => `
      <div class="month"><h3>${fmt(ws[0].a, { month: 'long', year: 'numeric' })}</h3>
        <div class="month-grid">${ws.map(w => {
          const past = w.a < today;
          const on = sel.arr && +sel.arr === +w.a && +sel.dep === +w.b;
          const same = w.a.getMonth() === w.b.getMonth();
          const label = same ? `${w.a.getDate()}–${fmt(w.b, { day: 'numeric', month: 'short' })}` : `${fmt(w.a, { day: 'numeric', month: 'short' })} – ${fmt(w.b, { day: 'numeric', month: 'short' })}`;
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

  /* ---------- Chalet : dates libres, tarif sur demande ---------- */
  const arrIn = $('#arr'), nightsIn = $('#nights');
  function fromInputs(animate) {
    if (!arrIn) return;
    const a = arrIn.value ? parse(arrIn.value) : null;
    const err = $('#arr-err');
    if (!a) { sel.arr = null; render(); return; }
    if (a <= today) { err.textContent = t('Choisissez une date à venir.', 'Choose a future date.'); return; }
    err.textContent = '';
    sel.arr = a; sel.dep = addDays(a, +nightsIn.value); sel.price = null;
    render(animate);
  }

  if (weeksBox) {
    const first = H.weeks.map(([a, b, p]) => ({ a: parse(a), b: parse(b), p })).find(w => w.a > today);
    if (first) { sel.arr = first.a; sel.dep = first.b; sel.price = first.p; }
    renderWeeks(false); render(false);
  } else if (arrIn) {
    arrIn.min = iso(addDays(today, 1));
    if (!arrIn.value) arrIn.value = '2026-12-19';
    nightsIn.innerHTML = Array.from({ length: 12 }, (_, i) => i + H.minNights).map(n => `<option value="${n}"${n === 7 ? ' selected' : ''}>${n} ${t('nuits', 'nights')}</option>`).join('');
    arrIn.addEventListener('change', () => fromInputs(true));
    nightsIn.addEventListener('change', () => fromInputs(true));
    fromInputs(false);
  }

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
    if (n === 1) {
      const a = form.arrivee.value ? parse(form.arrivee.value) : null, d = form.depart.value ? parse(form.depart.value) : null;
      ok = err('arrivee', !a ? t('Indiquez votre date d’arrivée.', 'Enter your arrival date.') : a <= today ? t('Choisissez une date à venir.', 'Choose a future date.') : '') && ok;
      ok = err('depart', !d ? t('Indiquez votre date de départ.', 'Enter your departure date.') : a && days(a, d) < H.minNights ? t(`Séjour de ${H.minNights} nuits minimum (ou à la semaine selon la période).`, `Minimum stay ${H.minNights} nights (or weekly depending on the period).`) : '') && ok;
      const n = (+form.adultes.value || 0) + (+form.enfants.value || 0);
      ok = err('personnes', n < 1 ? t('Indiquez au moins une personne.', 'Enter at least one guest.') : n > H.capacity ? t(`${H.capacity} personnes au maximum.`, `${H.capacity} guests maximum.`) : '') && ok;
    }
    if (n === 3) {
      ok = err('nom', form.nom.value.trim() ? '' : t('Indiquez votre nom.', 'Enter your name.')) && ok;
      ok = err('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim()) ? '' : t('Indiquez une adresse e-mail valide, par exemple nom@domaine.fr.', 'Enter a valid email address, for example name@domain.com.')) && ok;
      ok = err('accord', form.accord.checked ? '' : t('Cochez cette case pour envoyer la demande.', 'Tick this box to send the request.')) && ok;
    }
    if (!ok) { const first = $('.err:not(:empty)', form); first && first.previousElementSibling && first.previousElementSibling.focus && first.previousElementSibling.focus(); }
    return ok;
  }
  function prefill() {
    if (!sel.arr || !form) return;
    form.arrivee.value = iso(sel.arr); form.depart.value = iso(sel.dep);
    showStep(1);
  }
  if (form) {
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
        <dl class="tnum" style="display:grid;grid-template-columns:auto 1fr;gap:.3rem 1rem;margin:0 0 1rem">
          <dt>${t('Séjour', 'Stay')}</dt><dd style="margin:0">${fmt(a)} → ${fmt(d)}, ${days(a, d)} ${t('nuits', 'nights')}</dd>
          <dt>${t('Personnes', 'Guests')}</dt><dd style="margin:0">${(+form.adultes.value || 0) + (+form.enfants.value || 0)}</dd>
          <dt>${t('Services', 'Services')}</dt><dd style="margin:0">${services.length ? services.join(', ') : t('aucun', 'none')}</dd>
          <dt>${t('Réponse à', 'Reply to')}</dt><dd style="margin:0">${form.email.value.replace(/[<>]/g, '')}</dd>
        </dl>
        <button type="button" class="btn btn-line btn-s" data-again>${t('Faire une autre demande', 'Make another request')}</button></div>`;
      form.hidden = true; done.hidden = false;
      $('[data-again]', done).addEventListener('click', () => { form.reset(); form.hidden = false; done.hidden = true; showStep(1); });
      if (gsap && !TL.reduced) gsap.from(done.firstElementChild, { y: 30, opacity: 0, duration: .8, ease: 'expo.out' });
    });
    showStep(1);
    if (sel.arr) { form.arrivee.value = iso(sel.arr); form.depart.value = iso(sel.dep); }
  }

  document.addEventListener('tl:lang', () => {
    renderWeeks(false); render(false);
    if (nightsIn) { const v = nightsIn.value; nightsIn.innerHTML = Array.from({ length: 12 }, (_, i) => i + H.minNights).map(n => `<option value="${n}">${n} ${t('nuits', 'nights')}</option>`).join(''); nightsIn.value = v; }
  });
})();
