/* Viking Shield Security — interactions */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const root = document.documentElement;

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
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });

  /* mobile menu */
  const mb = $('.menu-btn');
  if (mb) {
    const set = open => { document.body.classList.toggle('menu-open', open); mb.setAttribute('aria-expanded', open); mb.setAttribute('aria-label', open ? 'Close menu' : 'Open menu'); };
    mb.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
    addEventListener('keydown', e => { if (e.key === 'Escape') set(false); });
    $$('.mobile-menu a').forEach((a, i) => { a.style.transitionDelay = 80 + i * 55 + 'ms'; a.addEventListener('click', () => set(false)); });
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
    }
  }

  /* showreel play/pause */
  const rc = $('.reel__ctrl');
  if (rc) rc.addEventListener('click', () => { const v = $('video', reel), p = reel.classList.toggle('paused'); p ? v.pause() : v.play(); rc.setAttribute('aria-label', p ? 'Play video' : 'Pause video'); });

  /* coverage search */
  const q = $('#city-q');
  if (q) {
    const cloud = $('.cloud'), out = $('.result'), items = $$('span', cloud);
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
      if (exact || hits.length === 1) { out.classList.add('yes'); out.innerHTML = `<span class="dot"></span><span>Yes. Viking Shield has covered sites in <b>${(exact || hits[0]).textContent}</b>. <a href="contact.html#book">Book a guard</a></span>`; }
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
