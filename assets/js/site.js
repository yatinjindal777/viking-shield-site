/* Viking Shield Security: site behaviour
   - mobile navigation
   - live Toronto timestamp
   - camera feeds: real .mp4 when present, generated night-camera effect when not
   - operations console channel switching
   - form helpers */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
      nav.classList.toggle("is-open", !open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "Open menu");
        toggle.focus();
      }
    });
  }

  /* ---------- scroll motion: fires once per element ---------- */
  // below-the-fold feeds power on like the console,
  // rows rise with a short non-uniform stagger, the coverage log types in.
  if ("IntersectionObserver" in window) {
    var mark = function (sel, kind) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
        if (!el.closest(".console")) el.setAttribute("data-reveal", kind);
      });
    };
    mark(".service__feed, .wide-feed, .split > .feed", "feed");
    var groups = [".channels > li", ".steps > li", ".duties > li", ".procedure__list > div", ".report__log > li", ".index__item p", ".index__item .tags"];
    groups.forEach(function (sel) {
      var parents = new Map();
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) {
        var key = el.parentElement.closest("ul, ol, .index") || el.parentElement;
        var n = parents.get(key) || 0; parents.set(key, n + 1);
        el.setAttribute("data-reveal", "rise");
        // 0, 50, 90, 120, 145 ... ms: quick at first, then tightening, capped
        el.style.transitionDelay = Math.min(260, Math.round(50 * Math.pow(n, 0.8))) + "ms";
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".log__list li"), function (el, n) {
      el.setAttribute("data-reveal", "type");
      el.style.transitionDelay = Math.min(1400, n * 14) + "ms";
    });

    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.setAttribute("data-visible", "");
        // the coverage log reveals as one unit: its rows type in on their delays
        if (e.target.matches(".log__list")) Array.prototype.forEach.call(e.target.children, function (li) { li.setAttribute("data-visible", ""); });
        revealIO.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });
    var targets = document.querySelectorAll("[data-reveal]");
    // anything already on screen (or scrolled past) at load shows immediately
    Array.prototype.forEach.call(targets, function (el) {
      if (el.matches(".log__list li")) return; // driven by its list below
      if (el.getBoundingClientRect().top < innerHeight * 0.88) el.setAttribute("data-visible", "");
      else revealIO.observe(el);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".log__list"), function (ul) { revealIO.observe(ul); });
    document.documentElement.classList.add("motion");
  }

  /* ---------- live timestamp (Toronto) ---------- */
  var clocks = document.querySelectorAll("[data-clock]");
  if (clocks.length) {
    var fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    });
    var tz = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", timeZoneName: "short" });
    var tick = function () {
      var now = new Date();
      var p = {};
      fmt.formatToParts(now).forEach(function (x) { p[x.type] = x.value; });
      var zone = (tz.formatToParts(now).filter(function (x) { return x.type === "timeZoneName"; })[0] || {}).value || "ET";
      var text = p.year + "-" + p.month + "-" + p.day + " " + p.hour + ":" + p.minute + ":" + p.second + " " + zone;
      for (var i = 0; i < clocks.length; i++) clocks[i].textContent = text;
    };
    tick();
    setInterval(tick, 1000);
  }

  var year = document.querySelectorAll("[data-year]");
  for (var y = 0; y < year.length; y++) year[y].textContent = String(new Date().getFullYear());

  /* ---------- generated night-camera scenes ---------- */
  // Each scene is drawn once into a low-resolution buffer; every frame adds
  // movement, sensor grain and a rolling bar, then CSS scales it up.
  function shade(v, a) {
    v = Math.max(0, Math.min(255, v));
    return "rgba(" + Math.round(v * 0.74) + "," + Math.round(v * 0.86) + "," + Math.round(Math.min(255, v * 1.02 + 10)) + "," + (a == null ? 1 : a) + ")";
  }
  function glow(ctx, x, y, r, v, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, shade(v, a));
    g.addColorStop(1, shade(v, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function vgrad(ctx, y0, y1, v0, v1, w) {
    var g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, shade(v0));
    g.addColorStop(1, shade(v1));
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, w, y1 - y0);
  }
  function rand(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  }

  var SCENES = {
    concierge: function (c, W, H) {
      var hz = H * 0.58;
      vgrad(c, 0, hz, 34, 52, W);
      // tall lobby windows
      for (var i = 0; i < 6; i++) {
        var x = W * 0.06 + i * W * 0.1;
        c.fillStyle = shade(70 + (i % 2) * 8);
        c.fillRect(x, H * 0.1, W * 0.085, hz - H * 0.12);
        c.fillStyle = shade(40);
        c.fillRect(x + W * 0.04, H * 0.1, 1, hz - H * 0.12);
      }
      // elevator bank
      c.fillStyle = shade(26); c.fillRect(W * 0.7, H * 0.18, W * 0.22, hz - H * 0.18);
      c.fillStyle = shade(58); c.fillRect(W * 0.72, H * 0.24, W * 0.08, hz - H * 0.24); c.fillRect(W * 0.82, H * 0.24, W * 0.08, hz - H * 0.24);
      // polished floor
      vgrad(c, hz, H, 46, 18, W);
      c.fillStyle = shade(70, 0.25); c.fillRect(W * 0.06, hz + 2, W * 0.6, H * 0.08);
      // reception desk
      c.fillStyle = shade(14);
      c.beginPath(); c.moveTo(W * 0.28, hz - H * 0.02); c.lineTo(W * 0.66, hz - H * 0.02); c.lineTo(W * 0.7, H * 0.86); c.lineTo(W * 0.24, H * 0.86); c.closePath(); c.fill();
      c.fillStyle = shade(120); c.fillRect(W * 0.28, hz - H * 0.03, W * 0.38, 2);
      // ceiling downlights
      for (var j = 0; j < 5; j++) glow(c, W * (0.14 + j * 0.18), H * 0.06, W * 0.07, 200, 0.55);
      glow(c, W * 0.47, hz + H * 0.2, W * 0.16, 90, 0.25);
    },
    patrol: function (c, W, H) {
      var vx = W * 0.52, vy = H * 0.42;
      vgrad(c, 0, H, 20, 30, W);
      // ceiling and floor planes
      c.fillStyle = shade(16);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(vx + 20, vy); c.lineTo(vx - 20, vy); c.closePath(); c.fill();
      c.fillStyle = shade(30);
      c.beginPath(); c.moveTo(0, H); c.lineTo(W, H); c.lineTo(vx + 20, vy); c.lineTo(vx - 20, vy); c.closePath(); c.fill();
      // pillars receding
      for (var i = 0; i < 6; i++) {
        var t = Math.pow(0.62, i);
        var ph = H * 0.9 * t, pw = W * 0.06 * t;
        var lx = vx - (vx - W * 0.04) * t, rx = vx + (W * 0.96 - vx) * t;
        var top = vy - (vy - H * 0.02) * t;
        c.fillStyle = shade(48 - i * 4); c.fillRect(lx - pw, top, pw, ph);
        c.fillStyle = shade(44 - i * 4); c.fillRect(rx, top, pw, ph);
        glow(c, vx, vy - (vy - H * 0.04) * t, W * 0.08 * t + 2, 210, 0.7);
      }
      // lane markings
      c.strokeStyle = shade(120, 0.55); c.lineWidth = 1.2;
      for (var k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(vx, vy); c.lineTo(vx + k * W * 0.32, H); c.stroke(); }
      // parked car shapes
      c.fillStyle = shade(12);
      c.fillRect(W * 0.02, H * 0.7, W * 0.2, H * 0.16);
      c.fillRect(W * 0.8, H * 0.66, W * 0.18, H * 0.18);
    },
    site: function (c, W, H) {
      var hz = H * 0.7;
      vgrad(c, 0, hz, 12, 34, W);
      // building frame under construction
      c.strokeStyle = shade(70); c.lineWidth = 1;
      for (var f = 0; f < 7; f++) { c.beginPath(); c.moveTo(W * 0.38, hz - f * H * 0.08); c.lineTo(W * 0.74, hz - f * H * 0.08); c.stroke(); }
      for (var g = 0; g < 7; g++) { c.beginPath(); c.moveTo(W * 0.38 + g * W * 0.06, hz); c.lineTo(W * 0.38 + g * W * 0.06, hz - H * 0.48); c.stroke(); }
      // crane
      c.strokeStyle = shade(90); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(W * 0.24, hz); c.lineTo(W * 0.24, H * 0.08); c.lineTo(W * 0.9, H * 0.08); c.moveTo(W * 0.24, H * 0.08); c.lineTo(W * 0.12, H * 0.08); c.moveTo(W * 0.24, H * 0.02); c.lineTo(W * 0.62, H * 0.08); c.moveTo(W * 0.24, H * 0.02); c.lineTo(W * 0.14, H * 0.08); c.stroke();
      c.beginPath(); c.moveTo(W * 0.7, H * 0.08); c.lineTo(W * 0.7, H * 0.3); c.stroke();
      // ground and floodlight
      vgrad(c, hz, H, 38, 22, W);
      glow(c, W * 0.86, H * 0.36, W * 0.2, 230, 0.6);
      c.fillStyle = shade(240); c.fillRect(W * 0.85, H * 0.35, 4, 2);
      // hoarding fence
      c.fillStyle = shade(16); c.fillRect(0, H * 0.78, W, H * 0.22);
      c.strokeStyle = shade(52, 0.8); c.lineWidth = 1;
      for (var x = 0; x < W; x += 14) { c.beginPath(); c.moveTo(x, H * 0.78); c.lineTo(x, H); c.stroke(); }
      c.fillStyle = shade(130); c.fillRect(0, H * 0.78, W, 1);
    },
    retail: function (c, W, H) {
      var vx = W * 0.5, vy = H * 0.4;
      vgrad(c, 0, H, 60, 34, W);
      // ceiling light strips
      for (var s = 0; s < 4; s++) {
        var t = Math.pow(0.6, s);
        c.fillStyle = shade(235, 0.9);
        c.fillRect(vx - W * 0.2 * t, vy - (vy - H * 0.04) * t, W * 0.4 * t, Math.max(1, 3 * t));
      }
      // shelving units on both sides, receding
      for (var i = 0; i < 6; i++) {
        var a = Math.pow(0.66, i), b = Math.pow(0.66, i + 1);
        var top = vy - (vy - H * 0.14) * a, bot = vy + (H * 0.96 - vy) * a;
        var top2 = vy - (vy - H * 0.14) * b, bot2 = vy + (H * 0.96 - vy) * b;
        var lx = vx - vx * a, lx2 = vx - vx * b;
        var rx = vx + (W - vx) * a, rx2 = vx + (W - vx) * b;
        c.fillStyle = shade(30 + i * 3);
        c.beginPath(); c.moveTo(lx, top); c.lineTo(lx2, top2); c.lineTo(lx2, bot2); c.lineTo(lx, bot); c.closePath(); c.fill();
        c.beginPath(); c.moveTo(rx, top); c.lineTo(rx2, top2); c.lineTo(rx2, bot2); c.lineTo(rx, bot); c.closePath(); c.fill();
        // product rows
        c.strokeStyle = shade(96, 0.7); c.lineWidth = 1;
        for (var r = 1; r < 5; r++) {
          var f = r / 5;
          c.beginPath(); c.moveTo(lx, top + (bot - top) * f); c.lineTo(lx2, top2 + (bot2 - top2) * f); c.stroke();
          c.beginPath(); c.moveTo(rx, top + (bot - top) * f); c.lineTo(rx2, top2 + (bot2 - top2) * f); c.stroke();
        }
      }
      // glossy aisle floor
      c.fillStyle = shade(80, 0.35);
      c.beginPath(); c.moveTo(vx - 6, vy + 6); c.lineTo(vx + 6, vy + 6); c.lineTo(W * 0.66, H); c.lineTo(W * 0.34, H); c.closePath(); c.fill();
    },
    city: function (c, W, H) {
      var hz = H * 0.66;
      vgrad(c, 0, hz, 10, 26, W);
      var rnd = rand(7);
      // tower blocks with lit windows
      var x = 0;
      while (x < W) {
        var bw = W * (0.08 + rnd() * 0.1), bh = H * (0.25 + rnd() * 0.45);
        c.fillStyle = shade(14 + rnd() * 10); c.fillRect(x, hz - bh, bw - 2, bh);
        for (var wy = hz - bh + 4; wy < hz - 4; wy += 5) {
          for (var wx = x + 3; wx < x + bw - 5; wx += 5) {
            if (rnd() > 0.72) { c.fillStyle = shade(120 + rnd() * 90, 0.85); c.fillRect(wx, wy, 2, 2); }
          }
        }
        x += bw;
      }
      // street
      vgrad(c, hz, H, 30, 14, W);
      c.strokeStyle = shade(140, 0.6); c.lineWidth = 1;
      c.setLineDash([6, 6]); c.beginPath(); c.moveTo(0, H * 0.84); c.lineTo(W, H * 0.84); c.stroke(); c.setLineDash([]);
      for (var l = 0; l < 4; l++) { var lx = W * (0.12 + l * 0.27); c.fillStyle = shade(40); c.fillRect(lx, hz - H * 0.18, 1.5, H * 0.18 + 4); glow(c, lx, hz - H * 0.18, W * 0.06, 220, 0.55); }
    },
    nosignal: function (c, W, H) {
      vgrad(c, 0, H, 12, 22, W);
    }
  };

  function figure(c, x, y, s, v, phase) {
    // a walking guard silhouette
    c.fillStyle = shade(v);
    c.beginPath(); c.arc(x, y - s * 0.86, s * 0.11, 0, Math.PI * 2); c.fill();
    c.fillRect(x - s * 0.13, y - s * 0.74, s * 0.26, s * 0.4);
    var swing = Math.sin(phase) * s * 0.09;
    c.fillRect(x - s * 0.11 + swing, y - s * 0.36, s * 0.09, s * 0.36);
    c.fillRect(x + s * 0.02 - swing, y - s * 0.36, s * 0.09, s * 0.36);
  }

  var MOTION = {
    concierge: function (c, W, H, t) {
      figure(c, W * 0.47, H * 0.6, H * 0.3, 8, 0);
      var x = W * (1.1 - ((t * 0.018) % 1.4));
      figure(c, x, H * 0.92, H * 0.5, 10, t * 2.2);
    },
    patrol: function (c, W, H, t) {
      var p = (t * 0.05) % 1;
      var s = H * (0.18 + p * 0.6);
      var x = W * 0.52 + (W * 0.1) * p;
      figure(c, x, H * 0.42 + (H * 0.56) * p, s, 6, t * 3);
      // torch beam
      c.fillStyle = shade(200, 0.12);
      c.beginPath(); c.moveTo(x + s * 0.1, H * 0.42 + (H * 0.56) * p - s * 0.5); c.lineTo(x - W * 0.3, H); c.lineTo(x + W * 0.05, H); c.closePath(); c.fill();
    },
    site: function (c, W, H, t) {
      glow(c, W * 0.86, H * 0.36, W * 0.12, 255, 0.08 + 0.05 * Math.sin(t * 7));
      var x = W * (0.05 + ((t * 0.022) % 1) * 0.9);
      figure(c, x, H * 0.77, H * 0.26, 8, t * 2.4);
      c.fillStyle = shade(230, 0.9); c.fillRect(x - 2, H * 0.77 - H * 0.26 * 0.62, 4, 1.5); // reflective vest stripe
    },
    retail: function (c, W, H, t) {
      var p = (Math.sin(t * 0.25) + 1) / 2;
      var s = H * (0.3 + p * 0.25);
      figure(c, W * 0.5 + (p - 0.5) * W * 0.08, H * 0.62 + p * H * 0.24, s, 12, t * 2.6);
    },
    city: function (c, W, H, t) {
      var x = ((t * 40) % (W + 80)) - 40;
      glow(c, x, H * 0.8, 10, 255, 0.8);
      glow(c, x + 12, H * 0.8, 10, 255, 0.8);
      var x2 = W - (((t * 26) + 120) % (W + 80)) + 40;
      glow(c, x2, H * 0.88, 8, 255, 0.35);
    },
    nosignal: function () {}
  };

  var NOISE = [];
  function noiseTile(i) {
    if (NOISE[i]) return NOISE[i];
    var n = document.createElement("canvas"); n.width = 128; n.height = 128;
    var nc = n.getContext("2d"), img = nc.createImageData(128, 128), r = rand(97 + i * 31);
    for (var k = 0; k < img.data.length; k += 4) {
      var v = r() * 255;
      img.data[k] = v * 0.8; img.data[k + 1] = v * 0.9; img.data[k + 2] = v; img.data[k + 3] = 255;
    }
    nc.putImageData(img, 0, 0);
    return (NOISE[i] = n);
  }

  function Feed(el) {
    this.el = el;
    this.scene = el.getAttribute("data-scene") || "city";
    this.canvas = el.querySelector("canvas");
    this.ctx = this.canvas.getContext("2d", { alpha: false });
    this.visible = false;
    this.seed = Math.random() * 100;
    this.base = null;
    this.size();
  }
  Feed.prototype.size = function () {
    var r = this.el.getBoundingClientRect();
    var w = 256, h = Math.max(96, Math.round(256 * (r.height || 9) / (r.width || 16)));
    if (h > 256) { h = 256; w = Math.round(256 * (r.width || 16) / (r.height || 9)); }
    if (this.canvas.width === w && this.canvas.height === h && this.base) return;
    this.canvas.width = w; this.canvas.height = h;
    this.base = document.createElement("canvas"); this.base.width = w; this.base.height = h;
    var bc = this.base.getContext("2d");
    (SCENES[this.scene] || SCENES.city)(bc, w, h);
    // vignette baked into the base
    var vg = bc.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.75)");
    bc.fillStyle = vg; bc.fillRect(0, 0, w, h);
    this.draw(this.seed);
  };
  Feed.prototype.draw = function (t) {
    var c = this.ctx, W = this.canvas.width, H = this.canvas.height;
    c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    c.drawImage(this.base, 0, 0);
    (MOTION[this.scene] || MOTION.city)(c, W, H, t + this.seed);
    // sensor grain
    var tile = noiseTile(Math.floor(Math.random() * 3));
    c.globalAlpha = this.scene === "nosignal" ? 0.55 : 0.11;
    c.globalCompositeOperation = "overlay";
    var ox = -Math.random() * 64, oy = -Math.random() * 64;
    for (var x = ox; x < W; x += 128) for (var y = oy; y < H; y += 128) c.drawImage(tile, x, y);
    c.globalCompositeOperation = "source-over";
    // rolling bar
    var bar = ((t * 0.08) % 1.3) * H - H * 0.15;
    var g = c.createLinearGradient(0, bar, 0, bar + H * 0.16);
    g.addColorStop(0, "rgba(160,190,255,0)"); g.addColorStop(0.5, "rgba(160,190,255,0.07)"); g.addColorStop(1, "rgba(160,190,255,0)");
    c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, bar, W, H * 0.16);
  };

  var feeds = [];
  var camEls = document.querySelectorAll(".cam[data-scene]");
  for (var i = 0; i < camEls.length; i++) {
    if (camEls[i].querySelector("canvas")) feeds.push(new Feed(camEls[i]));
  }

  // real footage: try the clip once when the feed first becomes visible
  function tryVideo(f) {
    var v = f.el.querySelector("video[data-src]");
    if (!v || f.triedVideo) return;
    f.triedVideo = true;
    v.addEventListener("loadeddata", function () {
      f.el.classList.add("has-video");
      var host = f.el.closest(".feed, .subfeed");
      if (host) host.classList.add("has-video");
      if (!reduceMotion) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    }, { once: true });
    v.addEventListener("error", function () { /* keep the generated feed */ }, { once: true });
    v.src = v.getAttribute("data-src");
    v.load();
  }

  if (feeds.length) {
    var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var f = e.target.__feed; if (!f) return;
        f.visible = e.isIntersecting;
        if (f.visible) tryVideo(f);
        var v = f.el.querySelector("video");
        if (v && f.el.classList.contains("has-video") && !reduceMotion) { if (f.visible) v.play().catch(function () {}); else v.pause(); }
      });
    }, { rootMargin: "120px" }) : null;
    feeds.forEach(function (f) { f.el.__feed = f; if (io) io.observe(f.el); else { f.visible = true; tryVideo(f); } });

    var last = 0, start = performance.now();
    var loop = function (now) {
      requestAnimationFrame(loop);
      if (document.hidden || now - last < 83) return; // ~12 fps, like a DVR
      last = now;
      var t = (now - start) / 1000;
      for (var k = 0; k < feeds.length; k++) {
        var f = feeds[k];
        if (f.visible && !f.el.classList.contains("has-video")) f.draw(t);
      }
    };
    if (!reduceMotion) requestAnimationFrame(loop);

    var rs;
    window.addEventListener("resize", function () {
      clearTimeout(rs);
      rs = setTimeout(function () { feeds.forEach(function (f) { f.size(); }); }, 150);
    });
  }

  /* ---------- operations console: switch channels ---------- */
  var mainFeed = document.querySelector("[data-main-feed]");
  if (mainFeed) {
    var mainSlot = mainFeed.querySelector("[data-slot]");
    var osdName = document.querySelector("[data-osd-name]");
    var channelText = document.querySelector("[data-channel-text]");
    var channelLink = document.querySelector("[data-channel-link]");
    var live = document.querySelector("[data-channel-live]");

    var fill = function (btn, cam) {
      btn.querySelector("[data-sub-name]").textContent = cam.getAttribute("data-name");
      btn.querySelector("[data-sub-id]").textContent = "CAM " + cam.getAttribute("data-id");
      btn.setAttribute("aria-label", "Show CAM " + cam.getAttribute("data-id") + " " + cam.getAttribute("data-name") + " on the main screen");
    };

    var subs = document.querySelectorAll("[data-sub]");
    Array.prototype.forEach.call(subs, function (btn) {
      btn.addEventListener("click", function () {
        var slot = btn.querySelector("[data-slot]");
        var incoming = slot.querySelector(".cam");
        var outgoing = mainSlot.querySelector(".cam");
        if (!incoming || !outgoing) return;
        mainSlot.appendChild(incoming);
        slot.appendChild(outgoing);
        fill(btn, outgoing);

        var id = incoming.getAttribute("data-id"), name = incoming.getAttribute("data-name");
        if (osdName) {
          osdName.textContent = "CAM " + id + " / ";
          var lg = document.createElement("span"); lg.className = "osd-long"; lg.textContent = incoming.getAttribute("data-title");
          var sh = document.createElement("span"); sh.className = "osd-short"; sh.textContent = name;
          osdName.appendChild(lg); osdName.appendChild(sh);
        }
        if (channelText) channelText.innerHTML = "<b>" + incoming.getAttribute("data-title") + ".</b> " + incoming.getAttribute("data-line");
        if (channelLink) channelLink.setAttribute("href", incoming.getAttribute("data-href"));
        if (live) live.textContent = "Main screen now showing CAM " + id + ", " + name + ".";
        mainFeed.classList.toggle("has-video", incoming.classList.contains("has-video"));
        btn.classList.toggle("has-video", outgoing.classList.contains("has-video"));

        [incoming, outgoing].forEach(function (el) { if (el.__feed) { el.__feed.size(); el.__feed.visible = true; } });
        if (!reduceMotion) {
          mainFeed.classList.remove("is-cutting"); void mainFeed.offsetWidth; mainFeed.classList.add("is-cutting");
          setTimeout(function () { mainFeed.classList.remove("is-cutting"); }, 300);
        }
      });
    });
  }

  /* ---------- forms ---------- */
  // preselect a service from ?service= (links from the Services page)
  var params = new URLSearchParams(location.search);
  var svc = params.get("service");
  if (svc) {
    var sel = document.querySelector("select[name='service']");
    if (sel) for (var o = 0; o < sel.options.length; o++) if (sel.options[o].value === svc) sel.selectedIndex = o;
    var role = document.querySelector("select[name='position']");
    if (role) for (var q = 0; q < role.options.length; q++) if (role.options[q].value === svc) role.selectedIndex = q;
  }

  // resume size check (Netlify Forms accepts up to 8 MB per submission)
  var resume = document.querySelector("input[type='file'][name='resume']");
  if (resume) {
    resume.addEventListener("change", function () {
      var f = resume.files && resume.files[0];
      resume.setCustomValidity(f && f.size > 8 * 1024 * 1024 ? "This file is larger than 8 MB. Please upload a smaller PDF or Word file." : "");
      resume.reportValidity();
    });
  }

  // loading state on submit
  Array.prototype.forEach.call(document.querySelectorAll("form[data-netlify]"), function (form) {
    form.addEventListener("submit", function () {
      var b = form.querySelector("button[type='submit']");
      if (b) { b.classList.add("is-loading"); b.setAttribute("aria-busy", "true"); b.querySelector("[data-label]") && (b.querySelector("[data-label]").textContent = "Sending…"); }
    });
  });
})();
