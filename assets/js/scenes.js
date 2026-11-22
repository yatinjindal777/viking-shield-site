// Procedural cinematic night scenes, rendered frame-by-frame to video.
// render(ctx, scene, t) draws one frame; t runs 0..1 and loops seamlessly.
(function () {
  const W = 1280, H = 720, TAU = Math.PI * 2;
  function rng(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646); }
  const wave = (t, k, p = 0) => Math.sin(TAU * (t * k + p));
  const frac = x => x - Math.floor(x);
  let NT = null;
  const DEF = { x: .5, y: .45, on: true, flash: 0 };
  const pulse = (t, a, b) => { const v = frac(t); return v < a || v > b ? 0 : Math.sin(Math.PI * (v - a) / (b - a)); };

  function glow(c, x, y, r, color, a) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color.replace('A', a));
    g.addColorStop(0.35, color.replace('A', a * 0.35));
    g.addColorStop(1, color.replace('A', 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function sky(c, top, mid, bot, hy) {
    const g = c.createLinearGradient(0, 0, 0, hy);
    g.addColorStop(0, top); g.addColorStop(0.7, mid); g.addColorStop(1, bot);
    c.fillStyle = g; c.fillRect(0, 0, W, hy);
  }
  function cone(c, x, y, ang, spread, len, color, a) {
    c.save(); c.translate(x, y); c.rotate(ang);
    const g = c.createLinearGradient(0, 0, len, 0);
    g.addColorStop(0, color.replace('A', a)); g.addColorStop(1, color.replace('A', 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 0);
    c.lineTo(len, -Math.tan(spread) * len); c.lineTo(len, Math.tan(spread) * len); c.closePath(); c.fill();
    c.restore();
  }
  // silhouette person; phase drives the walk cycle
  function person(c, x, foot, h, phase, walking, rim) {
    const u = h / 10, sw = walking ? Math.sin(TAU * phase) : 0;
    c.save(); c.fillStyle = '#04060b';
    c.lineCap = 'round';
    c.strokeStyle = '#04060b';
    c.lineWidth = u * 1.25;
    c.beginPath(); c.moveTo(x, foot - u * 4.6); c.lineTo(x + sw * u * 1.4, foot); c.stroke();
    c.beginPath(); c.moveTo(x, foot - u * 4.6); c.lineTo(x - sw * u * 1.4, foot); c.stroke();
    c.beginPath(); c.roundRect(x - u * 1.25, foot - u * 8.2, u * 2.5, u * 4, u * 0.9); c.fill();
    c.lineWidth = u * 0.8;
    c.beginPath(); c.moveTo(x - u * 0.9, foot - u * 7.6); c.lineTo(x - u * 1.1 - sw * u * 0.9, foot - u * 4.6); c.stroke();
    c.beginPath(); c.moveTo(x + u * 0.9, foot - u * 7.6); c.lineTo(x + u * 1.1 + sw * u * 0.9, foot - u * 4.6); c.stroke();
    c.beginPath(); c.arc(x, foot - u * 9.1, u * 0.85, 0, TAU); c.fill();
    if (rim) {
      c.globalCompositeOperation = 'lighter';
      c.strokeStyle = rim; c.lineWidth = Math.max(1, u * 0.18);
      c.beginPath(); c.arc(x, foot - u * 9.1, u * 0.85, -2.4, -0.6); c.stroke();
      c.beginPath(); c.moveTo(x + u * 1.25, foot - u * 7.6); c.lineTo(x + u * 1.25, foot - u * 4.8); c.stroke();
    }
    c.restore();
  }

  // Uniformed Viking Shield guard. Units: h/100, origin at the feet.
  // o: facing 'front'|'back', walk phase, aim (scene angle for a flashlight arm), radio 0..1,
  //    vest, turn -1..1, light 'front'|'back'|'left'|'right', glow 'r,g,b,a', breathe phase
  let GC = null;
  function guard(c, x, foot, h, o = {}) {
    const u = h / 100, Wd = Math.ceil(70 * u), Hd = Math.ceil(110 * u);
    if (!GC) GC = document.createElement('canvas');
    if (GC.width < Wd || GC.height < Hd) { GC.width = Math.max(GC.width, Wd); GC.height = Math.max(GC.height, Hd); }
    const g = GC.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, GC.width, GC.height);
    g.save(); g.translate(Wd / 2, Hd - 4 * u); g.scale(u, u);
    const front = o.facing !== 'back', sw = o.walk != null ? Math.sin(TAU * o.walk) : 0;
    const br = o.breathe != null ? Math.sin(TAU * o.breathe) * 0.35 : 0;
    const NAVY = '#1c2a4d', NAVY2 = '#121b33', PANT = '#0e1427', BOOT = '#05070c', SKIN = '#b9845e', SKIN2 = '#8e5f40', VEST = '#c8e62e', REF = '#e9eef6';
    const limb = (x1, y1, x2, y2, w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
    // legs
    const legA = sw * 0.38;
    for (const [side, a] of [[-1, legA], [1, -legA]]) {
      const hx = side * 4.6, hy = -44, kx = hx + Math.sin(a) * 20, ky = hy + Math.cos(a) * 20;
      const fx = kx + Math.sin(a * 0.6) * 19, fy = ky + Math.cos(a * 0.6) * 19;
      limb(hx, hy, kx, ky, 8.6, PANT); limb(kx, ky, fx, fy - 2, 7.4, PANT);
      g.fillStyle = BOOT; g.beginPath(); g.ellipse(fx, fy - 1.5, 4.6, 3.2, 0, 0, TAU); g.fill();
      g.fillRect(fx - 4, fy - 6, 8, 4.5);
    }
    const shY = -76 + br;
    const arm = (side, ex, ey, hx, hy) => { limb(side * 11.8, shY + 1, ex, ey, 7.2, NAVY); limb(ex, ey, hx, hy, 6.2, NAVY); g.fillStyle = SKIN; g.beginPath(); g.arc(hx, hy, 3.1, 0, TAU); g.fill(); };
    let hand = null;
    const armR = () => {
      if (o.aim != null) {
        const a = o.aim, ex = 11.8 + Math.cos(a) * 15, ey = shY + 1 + Math.sin(a) * 15, hx = ex + Math.cos(a) * 14, hy = ey + Math.sin(a) * 14;
        arm(1, ex, ey, hx, hy);
        g.save(); g.translate(hx, hy); g.rotate(a); g.fillStyle = '#20242c'; g.fillRect(-1, -2.2, 10, 4.4); g.fillStyle = '#fff6dc'; g.fillRect(8.4, -2.4, 1.8, 4.8); g.restore();
        hand = [hx + Math.cos(a) * 10, hy + Math.sin(a) * 10];
      } else if (o.radio > 0.05) {
        const k = o.radio, ex = 14 - k * 2, ey = shY + 18 - k * 8, hx = 12 - k * 13, hy = shY + 30 - k * 34;
        arm(1, ex, ey, hx, hy);
        g.fillStyle = '#0a0c10'; g.fillRect(hx - 2, hy - 7, 4, 8); g.fillStyle = '#ff4040'; g.fillRect(hx - .6, hy - 8.5, 1.2, 1.4);
      } else arm(1, 13.2 - sw * 4, shY + 16, 12.6 - sw * 7, shY + 31);
    };
    const armL = () => arm(-1, -13.2 + sw * 4, shY + 16, -12.6 + sw * 7, shY + 31);
    if (!front) { armL(); armR(); }
    // torso
    g.fillStyle = NAVY;
    g.beginPath(); g.moveTo(-12.6, shY); g.quadraticCurveTo(0, shY - 3.5, 12.6, shY);
    g.lineTo(10.6, -50); g.lineTo(-10.6, -50); g.closePath(); g.fill();
    // belt with buckle and radio pouch
    g.fillStyle = PANT; g.fillRect(-10.4, -50, 20.8, 8);
    g.fillStyle = '#07090e'; g.fillRect(-10.8, -51.5, 21.6, 4); g.fillStyle = '#8b93a3'; g.fillRect(-1.6, -51.2, 3.2, 3.4);
    g.fillStyle = '#07090e'; g.fillRect(front ? 7 : -10, -52, 3.4, 7);
    if (o.vest) {
      g.fillStyle = VEST;
      if (front) {
        g.beginPath(); g.moveTo(-11.8, shY + 2); g.lineTo(-5, shY - 1); g.lineTo(-4, -52); g.lineTo(-10.4, -52); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(11.8, shY + 2); g.lineTo(5, shY - 1); g.lineTo(4, -52); g.lineTo(10.4, -52); g.closePath(); g.fill();
      } else g.fillRect(-11, shY, 22, 24);
      g.fillStyle = REF; g.fillRect(-11, -61, 22, 2.2); g.fillRect(-11, -56, 22, 2.2);
    }
    // collar + epaulettes
    g.fillStyle = NAVY2; g.beginPath(); g.moveTo(-4.8, shY - 2.5); g.lineTo(0, shY + 3.4); g.lineTo(4.8, shY - 2.5); g.closePath(); g.fill();
    g.fillStyle = '#0c1326'; g.fillRect(-12.6, shY - .4, 6.5, 1.6); g.fillRect(6.1, shY - .4, 6.5, 1.6);
    // Viking Shield crest (patch / badge)
    const crest = (cx, cy, s) => {
      g.save(); g.translate(cx, cy); g.scale(s, s);
      g.fillStyle = '#c9d1de'; g.beginPath(); g.moveTo(0, -5); g.lineTo(4.4, -3.4); g.lineTo(4, 1.4); g.quadraticCurveTo(2.6, 4.2, 0, 5.4); g.quadraticCurveTo(-2.6, 4.2, -4, 1.4); g.lineTo(-4.4, -3.4); g.closePath(); g.fill();
      g.fillStyle = '#1f4fbf'; g.beginPath(); g.moveTo(0, -3.8); g.lineTo(3.3, -2.6); g.lineTo(3, 1.1); g.quadraticCurveTo(2, 3.2, 0, 4.1); g.quadraticCurveTo(-2, 3.2, -3, 1.1); g.lineTo(-3.3, -2.6); g.closePath(); g.fill();
      g.fillStyle = '#dfe5ee'; g.beginPath(); g.arc(0, -.4, 1.7, Math.PI, 0); g.lineTo(1.7, 1.6); g.lineTo(-1.7, 1.6); g.closePath(); g.fill();
      g.restore();
    };
    if (front) {
      if (!o.vest) {
        g.strokeStyle = NAVY2; g.lineWidth = .7; g.beginPath(); g.moveTo(0, shY + 3); g.lineTo(0, -51); g.stroke();
        g.fillStyle = NAVY2; g.fillRect(-9, -70, 6, 5.5); g.fillRect(3, -70, 6, 5.5);
        crest(-6, -71.5, .62);
        g.fillStyle = '#c9d1de'; g.font = '700 1.6px sans-serif'; g.textAlign = 'center'; g.fillText('SECURITY', 4.7, -71.4);
      } else { g.fillStyle = '#20242c'; g.font = '800 2.4px sans-serif'; g.textAlign = 'center'; g.fillText('SECURITY', -7.6, -64); }
      crest(-12.2, -69, .5); crest(12.2, -69, .5);
      armL(); armR();
    } else {
      g.fillStyle = o.vest ? '#1b1f12' : '#d9e0ec'; g.font = '800 4.4px sans-serif'; g.textAlign = 'center';
      g.fillText('SECURITY', 0, -64.5);
      crest(0, -57, .9);
      g.font = '700 2.2px sans-serif'; g.fillStyle = o.vest ? '#1b1f12' : '#aab6cc'; g.fillText('VIKING SHIELD', 0, -50.8);
    }
    // neck, head, face, cap
    const tn = (o.turn || 0) * 1.6;
    g.fillStyle = SKIN2; g.fillRect(-2.8, shY - 6, 5.6, 6.5);
    g.fillStyle = front ? SKIN : '#17110d';
    g.beginPath(); g.ellipse(tn * .3, shY - 12.5, 5.9, 7.2, 0, 0, TAU); g.fill();
    g.fillStyle = SKIN2; g.beginPath(); g.ellipse(-5.9 + tn * .2, shY - 12, 1.2, 2, 0, 0, TAU); g.ellipse(5.9 + tn * .2, shY - 12, 1.2, 2, 0, 0, TAU); g.fill();
    if (front) {
      g.fillStyle = '#1b130e'; g.beginPath(); g.ellipse(-2.2 + tn, shY - 12.8, .75, .55, 0, 0, TAU); g.ellipse(2.2 + tn, shY - 12.8, .75, .55, 0, 0, TAU); g.fill();
      g.strokeStyle = '#3a2618'; g.lineWidth = .55; g.beginPath(); g.moveTo(-3.3 + tn, shY - 14.3); g.lineTo(-1.2 + tn, shY - 14.1); g.moveTo(1.2 + tn, shY - 14.1); g.lineTo(3.3 + tn, shY - 14.3); g.stroke();
      g.strokeStyle = SKIN2; g.lineWidth = .6; g.beginPath(); g.moveTo(tn * 1.1, shY - 12.2); g.lineTo(tn * 1.25 + .5, shY - 9.8); g.stroke();
      g.strokeStyle = '#6e4430'; g.beginPath(); g.moveTo(-1.5 + tn, shY - 7.9); g.quadraticCurveTo(tn, shY - 7.5, 1.5 + tn, shY - 7.9); g.stroke();
    }
    g.fillStyle = '#0f1830'; g.beginPath(); g.ellipse(tn * .3, shY - 17.6, 6.4, 3.8, 0, Math.PI, 0); g.fill();
    g.fillRect(-6.4 + tn * .3, shY - 17.8, 12.8, 1.8);
    if (front) { g.fillStyle = '#0a1024'; g.beginPath(); g.ellipse(tn * .8, shY - 16, 6.6, 1.6, 0, 0, Math.PI); g.fill(); crest(tn * .5, shY - 19.6, .32); }
    g.restore();
    // lighting on the figure only
    g.save(); g.globalCompositeOperation = 'source-atop';
    const lt = o.light || 'front', gr = g.createLinearGradient(0, 0, Wd, 0);
    if (lt === 'back') { gr.addColorStop(0, 'rgba(150,190,255,.55)'); gr.addColorStop(.14, 'rgba(0,0,10,.5)'); gr.addColorStop(.86, 'rgba(0,0,10,.5)'); gr.addColorStop(1, 'rgba(150,190,255,.55)'); }
    else if (lt === 'left') { gr.addColorStop(.25, 'rgba(255,240,220,.16)'); gr.addColorStop(.6, 'rgba(0,0,10,.15)'); gr.addColorStop(.8, 'rgba(0,0,10,.55)'); }
    else if (lt === 'right') { gr.addColorStop(.2, 'rgba(0,0,10,.55)'); gr.addColorStop(.45, 'rgba(0,0,10,.15)'); gr.addColorStop(.8, 'rgba(255,240,220,.16)'); }
    else { gr.addColorStop(.2, 'rgba(0,0,10,.45)'); gr.addColorStop(.5, 'rgba(255,255,255,.04)'); gr.addColorStop(.8, 'rgba(0,0,10,.45)'); }
    g.fillStyle = gr; g.fillRect(0, 0, Wd, Hd);
    const vg = g.createLinearGradient(0, 0, 0, Hd); vg.addColorStop(.3, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.5)');
    g.fillStyle = vg; g.fillRect(0, 0, Wd, Hd);
    if (o.glow) { g.fillStyle = `rgba(${o.glow})`; g.fillRect(0, 0, Wd, Hd); }
    g.restore();
    c.drawImage(GC, 0, 0, Wd, Hd, x - Wd / 2, foot - Hd + 4 * u, Wd, Hd);
    return hand ? [x + hand[0] * u, foot + hand[1] * u] : null;
  }

  function grade(c, t, tint) {
    // vignette
    const v = c.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.72)');
    c.fillStyle = v; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = tint; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over';
    // film grain from a cached noise tile
    if (!NT) {
      NT = document.createElement('canvas'); NT.width = NT.height = 160;
      const x = NT.getContext('2d'), d = x.createImageData(160, 160);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() < .5 ? 255 : 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = Math.random() < .45 ? 16 : 0; }
      x.putImageData(d, 0, 0);
    }
    c.save(); c.translate(-Math.random() * 160, -Math.random() * 160);
    c.fillStyle = c.createPattern(NT, 'repeat'); c.fillRect(0, 0, W + 160, H + 160); c.restore();
  }
  function rain(c, t, n, alpha, seed) {
    const r = rng(seed);
    c.strokeStyle = `rgba(190,215,255,${alpha})`; c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const x0 = r() * (W + 200), y0 = r() * H, k = 1 + Math.floor(r() * 3), len = 14 + r() * 22;
      const y = frac(y0 / H + t * k * 2) * (H + 60) - 30, x = x0 - (y / H) * 120;
      c.moveTo(x, y); c.lineTo(x - len * 0.18, y + len);
    }
    c.stroke();
  }
  function skyline(c, seed, base, minH, maxH, col, winA, t, minW = 26, maxW = 90) {
    const r = rng(seed); let x = -20; const blds = [];
    while (x < W + 20) { const w = minW + r() * (maxW - minW), h = minH + r() * (maxH - minH); blds.push([x, w, h]); x += w + r() * 6; }
    for (const [bx, bw, bh] of blds) {
      c.fillStyle = col; c.fillRect(bx, base - bh, bw, bh + 2);
      if (r() < 0.25) { c.fillRect(bx + bw * 0.4, base - bh - 18 - r() * 30, 2, 40); }
      if (!winA) continue;
      const cols = Math.max(2, Math.floor(bw / 9)), rows = Math.floor(bh / 11);
      for (let i = 0; i < cols; i++) for (let j = 1; j < rows; j++) {
        const q = r(); if (q > 0.34) continue;
        const flick = q < 0.02 ? (wave(t, 2 + (j % 3), q * 50) > 0 ? 1 : 0.15) : 1;
        const warm = r() < 0.6;
        c.fillStyle = warm ? `rgba(255,206,140,${winA * flick})` : `rgba(160,200,255,${winA * flick})`;
        c.fillRect(bx + 4 + i * (bw - 6) / cols, base - bh + j * 11, 3, 4);
      }
    }
  }

  const SCENES = {
    city(c, t, I) {
      const hy = H * 0.66, px = (0.5 - I.x);
      sky(c, '#02040b', '#081633', '#16336b', hy);
      c.fillStyle = '#16336b'; c.fillRect(0, hy, W, H - hy);
      const sr = rng(3); c.fillStyle = 'rgba(220,230,255,0.5)';
      for (let i = 0; i < 70; i++) c.fillRect(sr() * W, sr() * hy * 0.5, 1.2, 1.2);
      // searchlights
      c.globalCompositeOperation = 'lighter';
      const aim = Math.max(-Math.PI + .25, Math.min(-.25, Math.atan2(I.y * H - hy, I.x * W - W * 0.22)));
      cone(c, W * 0.22, hy, aim, 0.04, H * 1.2, 'rgba(140,190,255,A)', 0.24);
      cone(c, W * 0.78, hy, -Math.PI / 2 + 0.3 * wave(t, 1, 0.4), 0.03, H, 'rgba(120,170,255,A)', 0.13);
      glow(c, W * 0.5, hy, W * 0.6, 'rgba(60,110,230,A)', 0.35);
      c.globalCompositeOperation = 'source-over';
      if (I.flash > 0) { c.fillStyle = `rgba(170,200,255,${I.flash * 0.55})`; c.fillRect(0, 0, W, hy); }
      c.save(); c.translate(px * 24, 0);
      skyline(c, 11, hy, 80, 250, '#0b1630', 0.35, t);
      // signature tower
      c.fillStyle = '#0a1429';
      c.fillRect(W * 0.63, hy - 380, 8, 380); c.beginPath(); c.ellipse(W * 0.63 + 4, hy - 300, 18, 9, 0, 0, TAU); c.fill();
      c.fillRect(W * 0.63 - 6, hy - 310, 20, 70);
      glow(c, W * 0.63 + 4, hy - 385, 14, 'rgba(255,60,60,A)', 0.5 + 0.5 * wave(t, 3));
      c.restore(); c.save(); c.translate(px * 60, 0);
      skyline(c, 29, hy + 10, 60, 190, '#070e20', 0.55, t, 40, 120);
      c.restore();
      // haze
      const hz = c.createLinearGradient(0, hy - 120, 0, hy + 30);
      hz.addColorStop(0, 'rgba(40,80,170,0)'); hz.addColorStop(1, 'rgba(40,80,170,0.28)');
      c.fillStyle = hz; c.fillRect(0, hy - 120, W, 150);
      // lake with shimmering reflections
      const wg = c.createLinearGradient(0, hy + 10, 0, H);
      wg.addColorStop(0, '#0a1630'); wg.addColorStop(1, '#03060e');
      c.fillStyle = wg; c.fillRect(0, hy + 10, W, H - hy - 10);
      c.globalCompositeOperation = 'lighter';
      const wr = rng(44);
      for (let i = 0; i < 220; i++) {
        const x = wr() * W, y = hy + 14 + Math.pow(wr(), 1.6) * (H * 0.86 - hy - 14), w = 6 + wr() * 30;
        const warm = wr() < 0.55, a = (0.12 + 0.1 * wave(t, 1 + (i % 3), wr())) * (1 - (y - hy) / (H * 0.3));
        c.fillStyle = warm ? `rgba(255,200,140,${Math.max(0, a)})` : `rgba(140,180,255,${Math.max(0, a)})`;
        c.fillRect(x + 4 * wave(t, 2, wr()), y, w, 1.6);
      }
      c.globalCompositeOperation = 'source-over';
      // elevated highway
      const ry = H * 0.88;
      c.fillStyle = '#03060d'; c.fillRect(0, ry - 6, W, H - ry + 6);
      for (let p = 0; p < 8; p++) c.fillRect(p * 190 + 30, ry, 26, H);
      c.fillStyle = '#0a1224'; c.fillRect(0, ry - 10, W, 6);
      // light trails
      c.globalCompositeOperation = 'lighter';
      const lr = rng(91);
      for (let i = 0; i < 26; i++) {
        const right = i % 2 === 0, k = 1 + Math.floor(lr() * 2), off = lr();
        const x = right ? frac(off + t * k) * (W + 600) - 300 : W + 300 - frac(off + t * k) * (W + 600);
        const y = right ? ry - 18 + lr() * 4 : ry - 28 + lr() * 4, len = 200 + lr() * 180;
        const g = c.createLinearGradient(x, 0, right ? x - len : x + len, 0);
        const col = right ? '255,236,200' : '255,50,40';
        g.addColorStop(0, `rgba(${col},0.95)`); g.addColorStop(1, `rgba(${col},0)`);
        c.fillStyle = g; c.fillRect(Math.min(x, right ? x - len : x + len), y, len, right ? 3 : 2.5);
        glow(c, x, y + 1, 26, right ? 'rgba(255,236,200,A)' : 'rgba(255,60,40,A)', 0.35);
      }
      // bokeh foreground
      const br = rng(55);
      for (let i = 0; i < 16; i++) {
        const bx = frac(br() + 0.05 * wave(t, 1, br())) * W, by = H * (0.82 + br() * 0.18), rr = 20 + br() * 60;
        glow(c, bx, by, rr, br() < 0.5 ? 'rgba(255,190,120,A)' : 'rgba(110,160,255,A)', 0.12 + 0.05 * wave(t, 1, br()));
      }
      c.globalCompositeOperation = 'source-over';
      guard(c, W * 0.535 + px * 90, H + 18, H * 0.6, { facing: 'back', light: 'back', breathe: t * 4, glow: I.flash > 0 ? `170,200,255,${(I.flash * .25).toFixed(3)}` : null });
      rain(c, t, 260, 0.13, 4);
      grade(c, t, 'rgba(40,90,220,0.25)');
    },

    concierge(c, t, I) {
      const vx = W * 0.5, vy = H * 0.44, L = I.on ? 1 : 0.25;
      c.fillStyle = '#060a14'; c.fillRect(0, 0, W, H);
      c.save(); c.translate((0.5 - I.x) * 40, (0.45 - I.y) * 20);
      // back glass wall with city bokeh
      const gx = W * 0.3, gw = W * 0.4, gy = H * 0.2, gh = H * 0.36;
      const gg = c.createLinearGradient(0, gy, 0, gy + gh);
      gg.addColorStop(0, '#0b1a3a'); gg.addColorStop(1, '#1b2f5e');
      c.fillStyle = gg; c.fillRect(gx, gy, gw, gh);
      c.save(); c.beginPath(); c.rect(gx, gy, gw, gh); c.clip();
      c.globalCompositeOperation = 'lighter';
      const br = rng(8);
      for (let i = 0; i < 40; i++) glow(c, gx + br() * gw, gy + gh * (0.45 + br() * 0.5), 6 + br() * 16, br() < 0.6 ? 'rgba(255,200,130,A)' : 'rgba(130,170,255,A)', 0.25 + 0.15 * wave(t, 1 + (i % 2), br()));
      // headlights passing outside
      const hx = gx + frac(t * 2) * (gw + 200) - 100;
      glow(c, hx, gy + gh * 0.85, 40, 'rgba(255,240,210,A)', 0.5);
      c.restore();
      c.fillStyle = '#04070e';
      for (let i = 0; i <= 4; i++) c.fillRect(gx + i * gw / 4 - 3, gy, 6, gh);
      c.fillRect(gx, gy - 4, gw, 8);
      // side walls in perspective
      c.fillStyle = '#081022';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(gx, gy); c.lineTo(gx, gy + gh); c.lineTo(0, H); c.fill();
      c.beginPath(); c.moveTo(W, 0); c.lineTo(gx + gw, gy); c.lineTo(gx + gw, gy + gh); c.lineTo(W, H); c.fill();
      // vertical wall slats
      c.strokeStyle = 'rgba(120,160,255,0.06)'; c.lineWidth = 2;
      for (let i = 1; i < 9; i++) { const f = i / 9; c.beginPath(); c.moveTo(gx * f, gy * f); c.lineTo(gx * f, H - (H - gy - gh) * f); c.stroke(); c.beginPath(); c.moveTo(W - (W - gx - gw) * f, gy * f); c.lineTo(W - (W - gx - gw) * f, H - (H - gy - gh) * f); c.stroke(); }
      // ceiling light strips converging
      c.globalCompositeOperation = 'lighter';
      for (const s of [-0.5, 0, 0.5]) {
        c.strokeStyle = `rgba(200,225,255,${0.85 * L})`; c.lineWidth = 3; c.shadowColor = 'rgba(140,190,255,1)'; c.shadowBlur = 18;
        c.beginPath(); c.moveTo(vx + s * W * 0.9, -10); c.lineTo(vx + s * gw * 0.7, gy - 10); c.stroke();
      }
      c.shadowBlur = 0;
      c.globalCompositeOperation = 'source-over';
      // floor with reflection
      const fy = gy + gh;
      const fg = c.createLinearGradient(0, fy, 0, H);
      fg.addColorStop(0, '#0d1730'); fg.addColorStop(1, '#03050b');
      c.fillStyle = fg; c.beginPath(); c.moveTo(gx, fy); c.lineTo(gx + gw, fy); c.lineTo(W, H); c.lineTo(0, H); c.fill();
      c.globalCompositeOperation = 'lighter';
      for (const s of [-0.5, 0, 0.5]) {
        const g = c.createLinearGradient(0, fy, 0, H);
        g.addColorStop(0, `rgba(150,190,255,${0.25 * L})`); g.addColorStop(1, 'rgba(150,190,255,0)');
        c.strokeStyle = g; c.lineWidth = 10;
        c.beginPath(); c.moveTo(vx + s * gw * 0.7, fy + 4); c.lineTo(vx + s * W * 0.9, H + 10); c.stroke();
      }
      glow(c, vx, fy + 20, gw * 0.6, 'rgba(70,120,240,A)', 0.18 * L);
      c.globalCompositeOperation = 'source-over';
      // walkers in the mid ground
      for (let i = 0; i < 3; i++) {
        const dir = i % 2 ? -1 : 1, p = frac(i * 0.37 + t);
        const x = dir > 0 ? gx - 60 + p * (gw + 120) : gx + gw + 60 - p * (gw + 120);
        person(c, x, fy + 18 + i * 10, 120 + i * 10, t * 4 + i * 0.3, true, 'rgba(150,190,255,0.35)');
      }
      c.restore();
      // reception desk
      const dy = H * 0.72;
      guard(c, W * 0.6, dy + 190, 330, { light: 'left', turn: (I.x - .5) * 1.6, radio: pulse(t * 2, .55, .9), breathe: t * 4, glow: I.on ? null : '120,170,255,.12' });
      c.fillStyle = '#05080f';
      c.beginPath(); c.moveTo(W * 0.18, dy); c.lineTo(W * 0.82, dy); c.lineTo(W * 0.86, H); c.lineTo(W * 0.14, H); c.fill();
      // guard behind the desk
      c.fillStyle = '#05080f'; c.fillRect(W * 0.18, dy, W * 0.64, 22);
      c.globalCompositeOperation = 'lighter';
      c.shadowColor = 'rgba(70,140,255,1)'; c.shadowBlur = 24;
      c.fillStyle = 'rgba(110,170,255,0.95)'; c.fillRect(W * 0.18, dy - 1, W * 0.64, 3);
      c.shadowBlur = 0;
      // monitor glow
      glow(c, W * 0.66, dy - 10, I.on ? 90 : 160, 'rgba(120,180,255,A)', I.on ? 0.28 + 0.04 * wave(t, 3) : 0.55);
      c.globalCompositeOperation = 'source-over';
      grade(c, t, 'rgba(40,90,220,0.22)');
    },

    patrol(c, t, I) {
      const vx = W * 0.5, hy = H * 0.5;
      sky(c, '#02040a', '#060d1f', '#0f1d3d', hy);
      skyline(c, 21, hy + 4, 40, 170, '#060b17', 0.3, t, 50, 140);
      // road
      const rg = c.createLinearGradient(0, hy, 0, H);
      rg.addColorStop(0, '#0b1326'); rg.addColorStop(1, '#020409');
      c.fillStyle = rg; c.beginPath(); c.moveTo(vx - 20, hy); c.lineTo(vx + 20, hy); c.lineTo(W * 1.3, H); c.lineTo(-W * 0.3, H); c.fill();
      c.fillStyle = '#04070e';
      c.beginPath(); c.moveTo(0, hy); c.lineTo(vx - 20, hy); c.lineTo(-W * 0.3, H); c.lineTo(0, H); c.fill();
      c.beginPath(); c.moveTo(W, hy); c.lineTo(vx + 20, hy); c.lineTo(W * 1.3, H); c.lineTo(W, H); c.fill();
      // lane dashes moving towards camera
      c.fillStyle = 'rgba(230,220,180,0.5)';
      for (let i = 0; i < 10; i++) {
        const z = frac(i / 10 - t * 2), s = z * z;
        const y = hy + s * (H - hy), w = 1 + s * 10, l = 2 + s * 70;
        c.fillRect(vx - w / 2, y, w, l);
      }
      // street lamps on both sides
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 7; i++) {
        const z = frac(i / 7 - t), s = 0.06 + z * z * 1.4;
        for (const side of [-1, 1]) {
          const x = vx + side * (30 + s * 620), top = hy - s * 260;
          c.fillStyle = `rgba(20,30,50,${0.9})`;
          c.globalCompositeOperation = 'source-over';
          c.fillRect(x - s * 3, top, s * 6, hy + s * (H - hy) * 0.6 - top);
          c.globalCompositeOperation = 'lighter';
          glow(c, x - side * s * 30, top, 30 + s * 90, 'rgba(255,170,80,A)', 0.55);
          glow(c, x - side * s * 30, hy + s * (H - hy) * 0.7, 40 + s * 160, 'rgba(255,150,60,A)', 0.12);
        }
      }
      // patrol car (rear view)
      const cx = vx + 30 + (I.x - 0.5) * 320, cy = H * 0.78, cw = 330, ch = 150;
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#03050a';
      c.beginPath(); c.roundRect(cx - cw / 2, cy - ch * 0.55, cw, ch * 0.55, 18); c.fill();
      c.beginPath(); c.moveTo(cx - cw * 0.36, cy - ch * 0.55); c.lineTo(cx - cw * 0.27, cy - ch); c.lineTo(cx + cw * 0.27, cy - ch); c.lineTo(cx + cw * 0.36, cy - ch * 0.55); c.fill();
      c.fillStyle = '#0c1528'; c.beginPath(); c.moveTo(cx - cw * 0.31, cy - ch * 0.6); c.lineTo(cx - cw * 0.25, cy - ch * 0.93); c.lineTo(cx + cw * 0.25, cy - ch * 0.93); c.lineTo(cx + cw * 0.31, cy - ch * 0.6); c.fill();
      c.fillStyle = '#020306'; c.fillRect(cx - cw * 0.47, cy, 46, 26); c.fillRect(cx + cw * 0.47 - 46, cy, 46, 26);
      // light bar: amber alternating with white strobe
      const phase = frac(t * 6), left = phase < 0.5;
      const lx = cx - cw * 0.22, rx = cx + cw * 0.22, ly = cy - ch - 8;
      c.fillStyle = '#05070c'; c.fillRect(lx - 30, ly - 6, rx - lx + 60, 14);
      guard(c, cx - cw * 0.78, H * 0.97, 300, { light: 'right', turn: .5, radio: pulse(t * 2, .1, .45), breathe: t * 4, glow: I.on ? `255,150,20,${left ? .14 : .06}` : null });
      c.globalCompositeOperation = 'lighter';
      const on = I.on ? 1 : 0, amberL = (left ? 1 : 0.15) * on, amberR = (left ? 0.15 : 1) * on, strobe = frac(t * 12) < 0.12 ? on : 0;
      glow(c, lx, ly, 160, 'rgba(255,150,20,A)', 0.9 * amberL);
      glow(c, rx, ly, 160, 'rgba(255,150,20,A)', 0.9 * amberR);
      glow(c, cx, ly, 120, 'rgba(230,240,255,A)', 0.8 * strobe);
      glow(c, cx, H * 0.62, 600, 'rgba(255,140,20,A)', 0.12 * (amberL + amberR));
      // tail lights + reflection on wet road
      for (const x of [cx - cw * 0.42, cx + cw * 0.42]) {
        c.fillStyle = 'rgba(255,40,40,0.95)'; c.fillRect(x - 22, cy - ch * 0.42, 44, 10);
        glow(c, x, cy - ch * 0.38, 60, 'rgba(255,40,40,A)', 0.5);
        const g = c.createLinearGradient(0, cy + 26, 0, H);
        g.addColorStop(0, 'rgba(255,40,40,0.16)'); g.addColorStop(1, 'rgba(255,40,40,0)');
        c.fillStyle = g;
        for (let k = 0; k < 9; k++) c.fillRect(x - 10 + 6 * wave(t, 2, k * 0.11), cy + 30 + k * 12, 20, 6);
      }
      const ag = c.createLinearGradient(0, cy + 20, 0, H);
      ag.addColorStop(0, `rgba(255,150,20,${0.08 * Math.max(amberL, amberR)})`); ag.addColorStop(1, 'rgba(255,150,20,0)');
      c.fillStyle = ag; c.fillRect(lx - 40, cy + 20, rx - lx + 80, H - cy);
      c.globalCompositeOperation = 'source-over';
      rain(c, t, 200, 0.12, 9);
      grade(c, t, 'rgba(40,80,200,0.2)');
    },

    site(c, t, I) {
      const hy = H * 0.74;
      sky(c, '#03050c', '#0b1734', '#1d3466', hy);
      // clouds drifting
      c.globalCompositeOperation = 'lighter';
      const cr = rng(17);
      for (let i = 0; i < 9; i++) glow(c, frac(cr() + t) * (W + 600) - 300, H * (0.08 + cr() * 0.25), 160 + cr() * 140, 'rgba(70,100,170,A)', 0.09);
      c.globalCompositeOperation = 'source-over';
      // building skeleton
      const bx = W * 0.32, bw = W * 0.42, bt = H * 0.3;
      c.strokeStyle = '#0a1222'; c.lineWidth = 7;
      for (let f = 0; f <= 7; f++) { const y = hy - f * (hy - bt) / 7; c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + bw, y); c.stroke(); }
      for (let k = 0; k <= 6; k++) { const x = bx + k * bw / 6; c.beginPath(); c.moveTo(x, hy); c.lineTo(x, bt); c.stroke(); }
      // crane
      c.strokeStyle = '#08101e'; c.lineWidth = 3;
      const mx = W * 0.82, mt = H * 0.1;
      for (const o of [-9, 9]) { c.beginPath(); c.moveTo(mx + o, hy); c.lineTo(mx + o, mt); c.stroke(); }
      for (let y = hy; y > mt; y -= 22) { c.beginPath(); c.moveTo(mx - 9, y); c.lineTo(mx + 9, y - 22); c.stroke(); }
      c.beginPath(); c.moveTo(W * 0.38, mt); c.lineTo(W, mt); c.moveTo(W * 0.38, mt + 16); c.lineTo(W, mt + 16); c.stroke();
      for (let x = W * 0.38; x < W; x += 20) { c.beginPath(); c.moveTo(x, mt + 16); c.lineTo(x + 20, mt); c.stroke(); }
      c.beginPath(); c.moveTo(mx, mt - 50); c.lineTo(W * 0.4, mt); c.moveTo(mx, mt - 50); c.lineTo(W, mt + 4); c.stroke();
      const hookX = W * 0.55 + 30 * wave(t, 1);
      c.lineWidth = 1.2; c.beginPath(); c.moveTo(hookX, mt + 16); c.lineTo(hookX, H * 0.42); c.stroke();
      c.fillStyle = '#08101e'; c.fillRect(hookX - 30, H * 0.42, 60, 10);
      c.globalCompositeOperation = 'lighter';
      glow(c, mx, mt - 52, 16, 'rgba(255,50,50,A)', wave(t, 2) > 0 ? 0.9 : 0.15);
      glow(c, W * 0.38, mt, 12, 'rgba(255,50,50,A)', wave(t, 2, 0.5) > 0 ? 0.9 : 0.15);
      // flood light towers with volumetric cones
      for (const [fx, ang] of (I.on ? [[W * 0.12, 0.55], [W * 0.93, Math.PI - 0.6]] : [])) {
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = '#05090f'; c.fillRect(fx - 3, H * 0.28, 6, hy - H * 0.28);
        c.globalCompositeOperation = 'lighter';
        cone(c, fx, H * 0.28, ang, 0.22, W * 0.75, 'rgba(200,220,255,A)', 0.22);
        glow(c, fx, H * 0.28, 50, 'rgba(230,240,255,A)', 0.9);
      }
      // dust in the light
      const dr = rng(33); c.fillStyle = 'rgba(220,230,255,0.5)';
      for (let i = 0; i < 160; i++) { const x = frac(dr() + t * (dr() < 0.5 ? 1 : -1) * 0.2) * W, y = frac(dr() + t) * hy; c.fillRect(x, y, 1.6, 1.6); }
      c.globalCompositeOperation = 'source-over';
      // ground
      c.fillStyle = I.on ? '#03060c' : '#010208'; c.fillRect(0, hy, W, H - hy);
      if (!I.on) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(0, 0, W, hy); }
      // guard with flashlight sweeping
      person(c, W * 0.66, hy + 2, 95, t * 4, true, 'rgba(220,230,255,0.35)');
      // chain-link fence in the foreground
      c.strokeStyle = 'rgba(150,170,210,0.16)'; c.lineWidth = 1.4;
      c.beginPath();
      for (let x = -H; x < W + H; x += 26) { c.moveTo(x, H * 0.52); c.lineTo(x + (H * 0.48), H); c.moveTo(x, H); c.lineTo(x + H * 0.48, H * 0.52); }
      c.stroke();
      c.fillStyle = '#02040a';
      for (let x = 60; x < W; x += 300) c.fillRect(x, H * 0.48, 10, H * 0.52);
      c.fillRect(0, H * 0.5, W, 6);
      { const gxp = W * 0.26, gfy = H + 14, gh = 380, sx = gxp + 11.8 * gh / 100, sy = gfy - 75 * gh / 100;
        let a = Math.atan2(I.y * H - sy, I.x * W - sx); a = Math.max(-1.3, Math.min(1.1, a));
        const hp = guard(c, gxp, gfy, gh, { vest: true, aim: a, light: 'right', turn: Math.cos(a) * .6, breathe: t * 4 });
        c.globalCompositeOperation = 'lighter';
        cone(c, hp[0], hp[1], a, 0.14, 900, 'rgba(255,240,210,A)', I.on ? 0.34 : 0.55);
        glow(c, hp[0], hp[1], 34, 'rgba(255,245,220,A)', 0.95);
        c.globalCompositeOperation = 'source-over'; }
      grade(c, t, 'rgba(40,90,220,0.22)');
    },

    retail(c, t, I) {
      const seen = [];
      const vx = W * 0.5, vy = H * 0.42;
      c.fillStyle = '#070a12'; c.fillRect(0, 0, W, H);
      // skylight ceiling
      const cg = c.createLinearGradient(0, 0, 0, vy);
      cg.addColorStop(0, '#132447'); cg.addColorStop(1, '#0a1226');
      c.fillStyle = cg; c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(vx + 90, vy - 40); c.lineTo(vx - 90, vy - 40); c.fill();
      c.strokeStyle = 'rgba(140,180,255,0.12)'; c.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const f = i / 12; c.beginPath(); c.moveTo(f * W, 0); c.lineTo(vx - 90 + f * 180, vy - 40); c.stroke(); }
      // storefronts in perspective (two levels per side)
      c.globalCompositeOperation = 'lighter';
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
        const f0 = i / 6, f1 = (i + 0.8) / 6;
        const x0 = side < 0 ? (vx - 90) * (1 - f0) + 0 : vx + 90 + (W - vx - 90) * f0;
        const x1 = side < 0 ? (vx - 90) * (1 - f1) : vx + 90 + (W - vx - 90) * f1;
        const k0 = side < 0 ? 1 - f0 : f0, k1 = side < 0 ? 1 - f1 : f1;
        for (const lvl of [0, 1]) {
          const top0 = vy - 30 + (lvl ? -170 : 10) * k0 - (lvl ? 0 : 0), bot0 = vy + (lvl ? -60 : 230) * k0;
          const top1 = vy - 30 + (lvl ? -170 : 10) * k1, bot1 = vy + (lvl ? -60 : 230) * k1;
          const warm = (i + lvl) % 3 !== 0, a = 0.35 + 0.06 * wave(t, 1, i * 0.13 + lvl);
          c.fillStyle = warm ? `rgba(255,190,120,${a})` : `rgba(140,190,255,${a})`;
          c.beginPath(); c.moveTo(x0, top0); c.lineTo(x1, top1); c.lineTo(x1, bot1); c.lineTo(x0, bot0); c.fill();
        }
      }
      c.globalCompositeOperation = 'source-over';
      // upper walkway railings
      c.fillStyle = '#05080f';
      c.beginPath(); c.moveTo(0, H * 0.34); c.lineTo(vx - 90, vy - 20); c.lineTo(vx - 90, vy - 12); c.lineTo(0, H * 0.4); c.fill();
      c.beginPath(); c.moveTo(W, H * 0.34); c.lineTo(vx + 90, vy - 20); c.lineTo(vx + 90, vy - 12); c.lineTo(W, H * 0.4); c.fill();
      // floor
      const fg = c.createLinearGradient(0, vy + 40, 0, H);
      fg.addColorStop(0, '#1a2440'); fg.addColorStop(1, '#04060c');
      c.fillStyle = fg; c.beginPath(); c.moveTo(vx - 90, vy + 40); c.lineTo(vx + 90, vy + 40); c.lineTo(W, H); c.lineTo(0, H); c.fill();
      c.globalCompositeOperation = 'lighter';
      glow(c, vx, vy + 120, 420, 'rgba(255,180,110,A)', 0.12);
      c.globalCompositeOperation = 'source-over';
      // shoppers at different depths
      const sr = rng(12);
      for (let i = 0; i < 9; i++) {
        const depth = 0.25 + sr() * 0.75, dir = sr() < 0.5 ? -1 : 1, k = 1;
        const p = frac(sr() + t * k);
        const x = dir > 0 ? -80 + p * (W + 160) : W + 80 - p * (W + 160);
        const foot = vy + 40 + depth * (H - vy - 60);
        person(c, x, foot, 70 + depth * 220, t * 5 + i * 0.21, true, 'rgba(255,200,150,0.3)');
        seen.push([x, foot, 70 + depth * 220]);
      }
      // guard posted near the entrance
      guard(c, W * 0.22, H + 20, 430, { light: 'right', turn: (I.x - .3) * 1.4, radio: pulse(t * 2, .6, .92), breathe: t * 4, glow: '255,190,130,.05' });
      // warm bokeh
      c.globalCompositeOperation = 'lighter';
      const br = rng(66);
      for (let i = 0; i < 14; i++) glow(c, br() * W, br() * H * 0.5, 20 + br() * 50, 'rgba(255,200,140,A)', 0.1 + 0.05 * wave(t, 1, br()));
      c.globalCompositeOperation = 'source-over';
      grade(c, t, 'rgba(40,90,220,0.2)');
      if (I.on && I.live) {
        const rx = I.x * W, ry = I.y * H, R = 150;
        c.strokeStyle = 'rgba(100,220,255,0.9)'; c.lineWidth = 2;
        c.beginPath(); c.arc(rx, ry, R, 0, TAU); c.globalAlpha = .35; c.stroke(); c.globalAlpha = 1;
        c.beginPath(); c.moveTo(rx - 14, ry); c.lineTo(rx + 14, ry); c.moveTo(rx, ry - 14); c.lineTo(rx, ry + 14); c.stroke();
        c.font = '600 15px monospace'; c.fillStyle = 'rgba(100,220,255,0.95)';
        let n = 0;
        for (const [x, foot, h] of seen) {
          const cy = foot - h / 2;
          if (Math.hypot(x - rx, cy - ry) > R + h * .3) continue;
          n++;
          const bw = h * 0.34, bh = h * 1.02, l = 12, x0 = x - bw / 2, y0 = foot - bh;
          c.beginPath();
          for (const [ax, ay, dx, dy] of [[x0, y0, 1, 1], [x0 + bw, y0, -1, 1], [x0, y0 + bh, 1, -1], [x0 + bw, y0 + bh, -1, -1]]) { c.moveTo(ax + dx * l, ay); c.lineTo(ax, ay); c.lineTo(ax, ay + dy * l); }
          c.stroke();
          c.fillText('ID-' + String(Math.abs(Math.round(x * 7 + h)) % 900 + 100), x0, y0 - 8);
        }
        c.fillText(`TRACKING ${n} · CAM 04`, rx + R * .72, ry - R * .72);
      }
    }
  };
  window.renderScene = function (ctx, name, t, inp) { ctx.save(); ctx.clearRect(0, 0, W, H); SCENES[name](ctx, t, Object.assign({}, DEF, inp || {})); ctx.restore(); };
})();
