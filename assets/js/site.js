/* Viking Shield Security — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;
  var lio = new IntersectionObserver(es => es.forEach(e => { const L = lives.find(l => l.el === e.target); if (L) L.visible = e.isIntersecting; }), { rootMargin: '100px' });

  /* header: scrolled state, hide on scroll down */
  const header = $('.header'), bar = $('.progress');
  let lastY = 0, ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    header && header.classList.toggle('is-scrolled', y > 30);
    if (header && !document.body.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > 500 && y > lastY + 4);
    if (y < lastY - 4 && header) header.classList.remove('is-hidden');
    lastY = y;
    bar && bar.style.setProperty('--p', max > 0 ? y / max : 0);
    const hero = $('.hero, .page-hero');
    if (hero && !reduce) hero.style.setProperty('--hp', Math.min(1, y / innerHeight).toFixed(3));
    scrollLinked();
    ticking = false;
  };
  addEventListener('resize', () => onScroll());
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });

  /* mobile menu */
  const mb = $('.menu-btn');
  if (mb) {
    const set = open => { document.body.classList.toggle('menu-open', open); mb.setAttribute('aria-expanded', open); mb.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
    mb.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
    $$('.mobile-menu .m-link, .mobile-menu > .btn').forEach((a, i) => a.style.transitionDelay = 80 + i * 50 + 'ms');
    $$('.mobile-menu a').forEach(a => a.addEventListener('click', () => set(false)));
  }

  /* services dropdown (desktop) */
  $$('.dd').forEach(dd => {
    const btn = $('.dd__btn', dd); let tm;
    const open = v => { dd.classList.toggle('open', v); btn.setAttribute('aria-expanded', v); };
    btn.addEventListener('click', e => { e.stopPropagation(); open(!dd.classList.contains('open')); });
    if (fine) { dd.addEventListener('pointerenter', () => { clearTimeout(tm); open(true); }); dd.addEventListener('pointerleave', () => { tm = setTimeout(() => open(false), 180); }); }
    document.addEventListener('click', e => { if (!dd.contains(e.target)) open(false); });
    dd.addEventListener('keydown', e => { if (e.key === 'Escape') { open(false); btn.focus(); } });
    dd.addEventListener('focusout', e => { if (!dd.contains(e.relatedTarget)) open(false); });
  });
  /* services accordion (mobile menu) */
  $$('.m-acc').forEach(acc => { const b = $('.m-acc__btn', acc); b.addEventListener('click', () => { const v = !acc.classList.contains('open'); acc.classList.toggle('open', v); b.setAttribute('aria-expanded', v); }); });

  /* locations hub filter */
  const lq = $('#loc-q');
  if (lq) {
    const out = $('#loc-result'), idle = out.innerHTML;
    const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    lq.addEventListener('input', () => {
      const v = norm(lq.value); let pages = 0, towns = 0, first = null;
      $$('[data-region]').forEach(r => {
        let any = false;
        $$('[data-name]', r).forEach(el => { const hit = !v || norm(el.dataset.name).includes(v); el.classList.toggle('dim', !hit); el.classList.toggle('hit', !!v && hit && el.classList.contains('pill')); if (hit && v) { any = true; el.classList.contains('loc') ? (pages++, first = first || el) : towns++; } });
        r.hidden = !!v && !any;
      });
      out.className = 'result';
      if (!v) { out.innerHTML = idle; $$('[data-region]').forEach(r => r.hidden = false); return; }
      if (pages || towns) { out.classList.add('yes'); out.innerHTML = `<span class="dot"></span><span>${pages ? `${pages} city page${pages > 1 ? 's' : ''}` : ''}${pages && towns ? ' and ' : ''}${towns ? `${towns} more communit${towns > 1 ? 'ies' : 'y'}` : ''} covered.${first ? ` <a href="${first.getAttribute('href')}">Open ${first.dataset.name}</a>` : ''}</span>`; }
      else { out.classList.add('no'); out.innerHTML = `<span>Not on our list yet, but we cover new sites across Ontario. <a href="contact.html#book">Tell us about yours</a></span>`; }
    });
  }

  /* split headings into words */
  $$('[data-split]').forEach(el => {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = part; s.style.setProperty('--i', i++);
            if (el.dataset.split === 'silver') s.className = 'silver';
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (n.classList.contains('silver') || n.classList.contains('accent')) {
            // keep gradient text: wrap the element itself
            const w = document.createElement('span'); w.className = 'w';
            n.style.setProperty('--i', i++); n.style.display = 'inline-block';
            const inner = document.createElement('span'); inner.style.setProperty('--i', i - 1);
            n.replaceWith(w); inner.append(n); w.append(inner);
          } else walk(n);
        }
      });
    };
    walk(el); el.classList.add('split');
  });

  /* reveal on view */
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px', threshold: .12 });
  $$('[data-reveal], .split, .checks').forEach(el => io.observe(el));
  $$('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => { c.setAttribute('data-reveal', ''); c.style.setProperty('--d', i * 90 + 'ms'); io.observe(c); }));
  $$('.checks li').forEach((li, i) => li.style.setProperty('--i', i % 6));
  requestAnimationFrame(() => $$('[data-reveal], .split').forEach(el => { if (el.getBoundingClientRect().top < innerHeight) { el.classList.add('in'); io.unobserve(el); } }));

  /* count up */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = to + suf; return; }
    const t0 = performance.now(), dur = 1800;
    const step = now => { const k = Math.min(1, (now - t0) / dur), v = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * v) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* videos: play only while visible */
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; if (!reduce && !v.closest('.paused')) v.play().catch(() => {}); }
    else v.pause();
  }), { rootMargin: '200px' });
  $$('video[data-src], video[autoplay]').forEach(v => { v.muted = true; v.playsInline = true; vio.observe(v); });


  /* ---------- live interactive scenes ---------- */
  const HINTS = {
    city: ['aim the searchlight', 'for lightning'],
    concierge: ['look around the lobby', 'to switch the lobby lights'],
    patrol: ['steer the patrol car', 'to switch the light bar · hold to speed up'],
    site: ['aim the flashlight', 'to switch the floodlights'],
    retail: ['track shoppers on CAM 04', 'to toggle tracking'],
  };
  const lives = [];
  if (window.renderScene && !reduce) $$('[data-live]').forEach(el => {
    const name = el.dataset.live, host = el.closest('[data-live-host]') || el, clickable = !el.hasAttribute('data-noclick');
    const cv = document.createElement('canvas'); cv.className = 'live__canvas'; cv.setAttribute('aria-hidden', 'true');
    const lo = el.dataset.res === 'lo' || innerWidth < 760, k = lo ? .5 : .75;
    cv.width = 1280 * k; cv.height = 720 * k; el.append(cv);
    const L = { el, host, name, ctx: cv.getContext('2d'), k, t: Math.random(), visible: false, drawn: false,
      inp: { x: .5, y: .45, on: true, flash: 0, live: true }, tgt: { x: .5, y: .45 }, last: -1e9, speed: 1, hold: false };
    if (el.hasAttribute('data-hint')) {
      const h = HINTS[name], verb = fine ? 'Move' : 'Drag', tap = fine ? 'Click' : 'Tap';
      const chip = document.createElement('span'); chip.className = 'live__hint';
      const M = { city: 'Drag: searchlight · Tap: lightning', concierge: 'Drag to look · Tap: lights', patrol: 'Drag to steer · Tap: lights', site: 'Drag: flashlight · Tap: floodlights', retail: 'Drag to track · Tap: tracking' };
      chip.innerHTML = `<span class="live__pulse"></span>${fine ? `${verb} to ${h[0]}${clickable ? ` · ${tap} ${h[1]}` : ''}` : M[name]}`;
      host.append(chip);
    }
    const pos = e => { const r = el.getBoundingClientRect(); L.tgt.x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); L.tgt.y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)); L.last = performance.now(); host.classList.add('is-live'); };
    host.addEventListener('pointermove', pos, { passive: true });
    host.addEventListener('pointerdown', e => { pos(e); if (name === 'patrol' && !e.target.closest('a,button,input,select,textarea,label,aside')) L.hold = true; });
    addEventListener('pointerup', () => L.hold = false);
    host.addEventListener('pointerleave', () => L.hold = false);
    if (clickable) host.addEventListener('click', e => {
      if (e.target.closest('a,button,input,select,textarea,label,aside,form')) return;
      if (name === 'city') L.inp.flash = 1; else L.inp.on = !L.inp.on;
      host.classList.add('is-live');
    });
    lives.push(L); lio.observe(el);
  });
  let lastFrame = 0;
  const liveLoop = now => {
    requestAnimationFrame(liveLoop);
    if (now - lastFrame < 31) return;
    const dt = Math.min(100, now - lastFrame); lastFrame = now;
    for (const L of lives) {
      if (!L.visible || L.el.closest('.paused')) continue;
      if (now - L.last > 2600) { const s = now / 1000 + L.t * 10; L.tgt.x = .5 + .32 * Math.sin(s * .45); L.tgt.y = .42 + .16 * Math.sin(s * .8); }
      L.inp.x += (L.tgt.x - L.inp.x) * .09; L.inp.y += (L.tgt.y - L.inp.y) * .09;
      L.inp.flash *= .86;
      L.speed += ((L.hold ? 3 : 1) - L.speed) * .08;
      L.t = (L.t + dt / 8000 * L.speed) % 1;
      L.ctx.setTransform(L.k, 0, 0, L.k, 0, 0);
      window.renderScene(L.ctx, L.name, L.t, L.inp);
      if (!L.drawn) { L.drawn = true; L.el.classList.add('is-drawn'); }
    }
  };
  if (lives.length) requestAnimationFrame(liveLoop);

  /* hero spotlight follows the cursor */
  const hero = $('.hero');
  if (hero && fine && !reduce) hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', e.clientX - r.left + 'px'); hero.style.setProperty('--my', e.clientY - r.top + 'px'); });

  /* card spotlight + tilt */
  if (fine && !reduce) {
    $$('.vcard, .card').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        c.style.setProperty('--x', x + 'px'); c.style.setProperty('--y', y + 'px');
        if (c.classList.contains('vcard')) { c.style.setProperty('--ry', ((x / r.width) - .5) * 7 + 'deg'); c.style.setProperty('--rx', -((y / r.height) - .5) * 7 + 'deg'); }
      });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
    /* magnetic buttons */
    $$('.btn--primary, .btn--ghost').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--bx', (e.clientX - r.left - r.width / 2) * .18 + 'px'); b.style.setProperty('--by', (e.clientY - r.top - r.height / 2) * .3 + 'px'); });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
  }

  /* scroll-linked bits: procedure list, report timeline, steps, reel */
  const procItems = $$('.proc__list li'), report = $('.report'), steps = $('.steps'), reel = $('.reel'), subnav = $$('.subnav a');
  function prog(el, start = .85, end = .35) { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(1, (innerHeight * start - r.top) / (r.height + innerHeight * (start - end)))); }
  function scrollLinked() {
    procItems.forEach(li => { const r = li.getBoundingClientRect(); li.classList.toggle('on', r.top < innerHeight * .7); });
    if (report) {
      const p = prog(report, .9, .5); report.style.setProperty('--rp', p.toFixed(3));
      const lis = $$('li', report); lis.forEach((li, i) => { if (p > i / lis.length || reduce) li.classList.add('on'); });
    }
    if (steps) {
      const p = prog(steps, .85, .55); steps.style.setProperty('--sp', p.toFixed(3));
      const lis = $$('li', steps); lis.forEach((li, i) => li.classList.toggle('on', p >= i / (lis.length - 1) - .02));
    }
    if (reel && !reduce) reel.style.setProperty('--sp', prog(reel, 1, .6).toFixed(3));
    if (subnav.length) {
      let cur = subnav[0];
      subnav.forEach(a => { const s = $(a.getAttribute('href')); if (s && s.getBoundingClientRect().top < innerHeight * .4) cur = a; });
      subnav.forEach(a => a.classList.toggle('on', a === cur));
      const ind = $('.subnav__ind'); if (ind) { ind.style.setProperty('--ix', cur.offsetLeft + 'px'); ind.style.setProperty('--iw', cur.offsetWidth + 'px'); }
    }
  }

  /* showreel play/pause */
  $$('.reel__ctrl').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); const r = b.closest('.reel'), p = r.classList.toggle('paused'); b.setAttribute('aria-label', p ? 'Play scene' : 'Pause scene'); }));

  /* coverage search */
  const q = $('#city-q');
  if (q) {
    const cloud = $('.cloud'), out = $('.result'), items = [...cloud.children];
    const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
    const idle = out.innerHTML;
    q.addEventListener('input', () => {
      const v = norm(q.value);
      let hits = [];
      items.forEach(s => { const h = v.length > 1 && norm(s.textContent).includes(v); s.classList.toggle('hit', h); if (h) hits.push(s); });
      cloud.classList.toggle('filtering', v.length > 1);
      out.className = 'result';
      if (v.length < 2) { out.innerHTML = idle; return; }
      const exact = items.find(s => norm(s.textContent) === v);
      if (exact || hits.length === 1) { out.classList.add('yes'); const h = exact || hits[0], href = h.getAttribute('href'); out.innerHTML = `<span class="dot"></span><span>Yes. Viking Shield has covered sites in <b>${h.textContent}</b>. ${href ? `<a href="${href}">See ${h.textContent} security</a>` : '<a href="contact.html#book">Book a guard</a>'}</span>`; }
      else if (hits.length) { out.classList.add('yes'); out.innerHTML = `<span class="dot"></span><span>${hits.length} matching communities on our coverage list. Keep typing to narrow it down.</span>`; }
      else { out.classList.add('no'); out.innerHTML = `<span>Not on our list yet, but we cover new sites across Ontario. <a href="contact.html#book">Tell us about yours</a></span>`; }
      (exact || hits[0])?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
  }

  /* live clock (Toronto time) */
  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tick = () => clocks.forEach(c => c.textContent = f.format(new Date()) + ' ET');
    tick(); setInterval(tick, 1000);
  }
  $$('[data-year]').forEach(y => y.textContent = new Date().getFullYear());

  /* forms: prefill service from ?service=, validate, then go to thanks page */
  const params = new URLSearchParams(location.search), svc = params.get('service');
  if (svc) $$('select[name=service], select[name=position]').forEach(s => { if ([...s.options].some(o => o.value === svc)) s.value = svc; });
  $$('form[data-form]').forEach(f => {
    f.setAttribute('novalidate', '');
    f.addEventListener('submit', e => {
      e.preventDefault();
      let ok = true;
      $$('.input, .select, .textarea', f).forEach(i => { const fld = i.closest('.field'); const v = i.checkValidity(); fld && fld.classList.toggle('invalid', !v); if (!v && ok) { i.focus(); ok = false; } });
      if (!ok) return;
      const b = $('button[type=submit]', f); b.disabled = true; b.querySelector('[data-label]').textContent = 'Sending…';
      location.href = f.getAttribute('action');
    });
    $$('.input, .select, .textarea', f).forEach(i => i.addEventListener('input', () => { if (i.checkValidity()) i.closest('.field')?.classList.remove('invalid'); }));
  });

  /* soft page transitions between internal pages */
  if (!reduce) $$('a[href]').forEach(a => {
    const h = a.getAttribute('href');
    if (!h || h.startsWith('#') || h.startsWith('http') || h.startsWith('tel:') || h.startsWith('mailto:') || a.target === '_blank') return;
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      const url = new URL(h, location.href);
      if (url.pathname === location.pathname) return;
      e.preventDefault(); document.body.classList.add('leaving');
      setTimeout(() => location.href = url.href, 300);
    });
  });
  addEventListener('pageshow', e => { if (e.persisted) document.body.classList.remove('leaving'); });

  onScroll();
})();
