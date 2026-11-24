(function () {
  "use strict";
  var d = document, w = window;

  /* menu mobilne */
  var burger = d.querySelector(".burger"), panel = d.getElementById("menu");
  if (burger && panel) {
    burger.addEventListener("click", function () {
      var open = burger.getAttribute("aria-expanded") === "true";
      burger.setAttribute("aria-expanded", String(!open));
      d.body.classList.toggle("menu-open", !open);
    });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) { burger.setAttribute("aria-expanded", "false"); d.body.classList.remove("menu-open"); }
    });
  }

  /* dolny pasek po przewinięciu za hero */
  var bar = d.querySelector(".mbar"), hero = d.querySelector("[data-hero]");
  if (bar && hero && "IntersectionObserver" in w) {
    new IntersectionObserver(function (en) {
      bar.classList.toggle("on", !en[0].isIntersecting);
    }, { rootMargin: "-40% 0px 0px 0px" }).observe(hero);
  }

  /* przeciąganie myszą + strzałki w pasach */
  function dragScroll(el, onMoved) {
    var down = false, sx = 0, sl = 0, moved = false;
    el.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sl = el.scrollLeft;
    });
    w.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; el.classList.add("dragging"); }
      if (moved) { el.scrollLeft = sl - dx; e.preventDefault(); }
    });
    w.addEventListener("pointerup", function () {
      if (!down) return; down = false;
      if (moved) {
        el.classList.remove("dragging");
        var kids = el.children, best = 0, bd = 1e9, base = el.getBoundingClientRect().left;
        for (var i = 0; i < kids.length; i++) {
          var dd = Math.abs(kids[i].getBoundingClientRect().left - base);
          if (dd < bd) { bd = dd; best = i; }
        }
        el.scrollTo({ left: kids[best].offsetLeft - kids[0].offsetLeft, behavior: "smooth" });
        if (onMoved) onMoved();
      }
    });
    el.addEventListener("click", function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    el.addEventListener("dragstart", function (e) { e.preventDefault(); });
  }

  d.querySelectorAll("[data-strip]").forEach(function (box) {
    var s = box.querySelector(".strip"), hd = box.previousElementSibling, prev = box.querySelector(".arr.prev") || (hd && hd.querySelector(".arr.prev")), next = box.querySelector(".arr.next") || (hd && hd.querySelector(".arr.next"));
    if (!s) return;
    dragScroll(s);
    function step() { var c = s.children[0]; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(s).columnGap || 0) : s.clientWidth; }
    function upd() {
      if (!prev) return;
      var max = s.scrollWidth - s.clientWidth - 2;
      prev.disabled = s.scrollLeft <= 2;
      next.disabled = s.scrollLeft >= max;
      box.classList.toggle("fits", max <= 0); if (hd) hd.classList.toggle("fits", max <= 0);
    }
    if (prev) {
      prev.addEventListener("click", function () { s.scrollBy({ left: -step(), behavior: "smooth" }); });
      next.addEventListener("click", function () { s.scrollBy({ left: step(), behavior: "smooth" }); });
    }
    s.addEventListener("scroll", function () { w.requestAnimationFrame(upd); }, { passive: true });
    w.addEventListener("resize", function () { w.requestAnimationFrame(upd); }); w.requestAnimationFrame(upd);
  });

  /* karuzele zdjęć w kartach */
  d.querySelectorAll("[data-cg]").forEach(function (g) {
    var t = g.querySelector(".cm-track"), c = g.querySelector(".cm-count"), n = t.children.length;
    dragScroll(t);
    function idx() { return Math.round(t.scrollLeft / t.clientWidth); }
    function upd() { if (c) c.textContent = (idx() + 1) + " / " + n; }
    t.addEventListener("scroll", function () { w.requestAnimationFrame(upd); }, { passive: true });
    var p = g.querySelector(".cm-prev"), nx = g.querySelector(".cm-next");
    if (p) p.addEventListener("click", function (e) { e.stopPropagation(); t.scrollTo({ left: Math.max(0, idx() - 1) * t.clientWidth, behavior: "smooth" }); });
    if (nx) nx.addEventListener("click", function (e) { e.stopPropagation(); t.scrollTo({ left: Math.min(n - 1, idx() + 1) * t.clientWidth, behavior: "smooth" }); });
  });

  /* galeria oferty: miniatury -> główne zdjęcie */
  d.querySelectorAll("[data-gal]").forEach(function (g) {
    var t = g.querySelector(".gal-track"), thumbs = g.querySelectorAll(".thumb"), cnt = g.querySelector(".gal-count");
    if (!t) return;
    dragScroll(t);
    function idx() { return Math.round(t.scrollLeft / t.clientWidth); }
    function upd() {
      var i = idx();
      thumbs.forEach(function (b, j) { b.setAttribute("aria-current", j === i ? "true" : "false"); }); var tb = thumbs[i], st = tb && tb.parentNode; if (st && st.scrollWidth > st.clientWidth) { var x = tb.offsetLeft - st.offsetLeft; if (x < st.scrollLeft || x + tb.offsetWidth > st.scrollLeft + st.clientWidth) st.scrollTo({ left: x - 8, behavior: "smooth" }); }
      if (cnt) cnt.textContent = (i + 1) + " / " + t.children.length;
    }
    thumbs.forEach(function (b, j) { b.addEventListener("click", function () { t.scrollTo({ left: j * t.clientWidth, behavior: "smooth" }); }); });
    t.addEventListener("scroll", function () { w.requestAnimationFrame(upd); }, { passive: true });
    var p = g.querySelector(".cm-prev"), nx = g.querySelector(".cm-next");
    if (p) p.addEventListener("click", function () { t.scrollTo({ left: Math.max(0, idx() - 1) * t.clientWidth, behavior: "smooth" }); });
    if (nx) nx.addEventListener("click", function () { t.scrollTo({ left: Math.min(t.children.length - 1, idx() + 1) * t.clientWidth, behavior: "smooth" }); });
    w.requestAnimationFrame(upd);
  });

  /* lightbox */
  var lb = d.querySelector(".lb");
  if (lb) {
    var img = lb.querySelector("img"), cap = lb.querySelector(".lb-count"), group = [], cur = 0, timer, last;
    function show(i) {
      cur = (i + group.length) % group.length;
      var el = group[cur], th = el.querySelector("img"), full = el.getAttribute("data-full");
      img.src = th && th.currentSrc ? th.currentSrc : full;
      img.alt = th ? th.alt : "";
      clearTimeout(timer);
      timer = setTimeout(function () {
        var pre = new Image(); pre.onload = function () { if (group[cur] === el) img.src = full; }; pre.src = full;
      }, 180);
      cap.textContent = (cur + 1) + " / " + group.length;
      lb.classList.toggle("single", group.length < 2);
      var nx = group[(cur + 1) % group.length];
      (w.requestIdleCallback || setTimeout)(function () { var p = new Image(); p.src = nx.getAttribute("data-full"); });
    }
    function open(el) {
      var name = el.getAttribute("data-lb");
      group = Array.prototype.slice.call(d.querySelectorAll('[data-lb="' + name + '"]'));
      last = el; lb.hidden = false; d.body.classList.add("lb-on");
      show(group.indexOf(el)); lb.querySelector(".lb-close").focus();
    }
    function close() { lb.hidden = true; d.body.classList.remove("lb-on"); img.removeAttribute("src"); if (last) last.focus(); }
    d.addEventListener("click", function (e) {
      var el = e.target.closest("[data-lb]");
      if (el) { e.preventDefault(); open(el); }
    });
    lb.querySelector(".lb-close").addEventListener("click", close);
    lb.querySelector(".lb-prev").addEventListener("click", function () { show(cur - 1); });
    lb.querySelector(".lb-next").addEventListener("click", function () { show(cur + 1); });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lb-stage")) close(); });
    d.addEventListener("keydown", function (e) {
      if (lb.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") show(cur - 1);
      if (e.key === "ArrowRight") show(cur + 1);
    });
    var sx = null;
    lb.addEventListener("pointerdown", function (e) { sx = e.clientX; });
    lb.addEventListener("pointerup", function (e) {
      if (sx === null) return; var dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 45 && group.length > 1) show(cur + (dx < 0 ? 1 : -1));
    });
  }

  /* zgoda na cookies: "all" = mapa Google, "need" = tylko niezbędne */
  var ck = d.getElementById("cookies");
  function zgoda() { return d.documentElement.getAttribute("data-ck") || ""; }
  function ustaw(v) {
    try { localStorage.setItem("dh-ck", v); localStorage.setItem("dh-ck-t", String(Date.now())); } catch (e) {}
    d.documentElement.setAttribute("data-ck", v);
    if (ck) ck.hidden = true;
    mapa();
  }
  if (ck) {
    ck.addEventListener("click", function (e) {
      var b = e.target.closest("[data-c]"); if (!b) return;
      var c = b.getAttribute("data-c");
      if (c === "all") ustaw("all");
      else if (c === "need") ustaw("need");
      else if (c === "set") {
        ck.querySelector(".ck-set").hidden = false; b.hidden = true;
        ck.querySelector(".ck-save").hidden = false;
        d.getElementById("ck-map").checked = zgoda() === "all";
      } else if (c === "save") ustaw(d.getElementById("ck-map").checked ? "all" : "need");
    });
  }
  d.querySelectorAll(".ck-open").forEach(function (b) {
    b.addEventListener("click", function () { if (!ck) return; ck.hidden = false; var s = ck.querySelector(".ck-s"); if (s) s.click(); });
  });

  /* mapa Google: po przewinięciu, jeśli nie wybrano "tylko niezbędne" */
  var map = d.querySelector("[data-map]"), mapWidac = false;
  function wstawMape() {
    if (!map || map.querySelector("iframe")) return;
    var f = d.createElement("iframe");
    f.src = map.getAttribute("data-map"); f.title = map.getAttribute("data-title") || "Map";
    f.loading = "lazy"; f.referrerPolicy = "no-referrer-when-downgrade";
    map.appendChild(f); map.classList.add("on");
  }
  function mapa() {
    if (!map) return;
    var off = zgoda() === "need";
    map.querySelector(".map-why").hidden = !off;
    map.querySelector(".map-show").hidden = !off;
    if (!off && mapWidac) wstawMape();
  }
  if (map) {
    map.querySelector(".map-show").addEventListener("click", wstawMape);
    if ("IntersectionObserver" in w) {
      var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { mapWidac = true; mapa(); io.disconnect(); } }, { rootMargin: "400px" });
      io.observe(map);
    } else { mapWidac = true; }
    mapa();
  }

  /* formularz kontaktowy: wysyłka bez przeładowania strony */
  d.querySelectorAll("form.kform").forEach(function (f) {
    var msg = f.querySelector(".form-msg[data-err]"), btn = f.querySelector("button[type=submit]"), txt = btn.textContent;
    function pokaz(t, ok) { msg.textContent = t; msg.hidden = false; msg.className = "form-msg " + (ok ? "ok" : "err"); }
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      if (f.hasAttribute("data-podglad")) { pokaz(msg.getAttribute("data-prev"), true); return; }
      var n = f.elements.n.value.trim(), m = f.elements.m.value.trim(), p = f.elements.p.value.trim(), em = f.elements.e.value.trim();
      if (!n) { f.elements.n.focus(); f.elements.n.reportValidity && f.elements.n.reportValidity(); return; }
      if (!p && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { pokaz(msg.getAttribute("data-need"), false); f.elements.p.focus(); return; }
      if (!m) { f.elements.m.focus(); f.elements.m.reportValidity && f.elements.m.reportValidity(); return; }
      btn.disabled = true; btn.textContent = btn.getAttribute("data-wait");
      fetch(f.getAttribute("action"), { method: "POST", body: new FormData(f), headers: { Accept: "application/json" }, credentials: "same-origin" })
        .then(function (r) { return r.json(); })
        .then(function (j) { pokaz(j.msg || msg.getAttribute("data-err"), !!j.ok); if (j.ok) { f.reset(); } })
        .catch(function () { pokaz(msg.getAttribute("data-err"), false); })
        .then(function () { btn.disabled = false; btn.textContent = txt; });
    });
  });
})();
