/* core.js: shared helpers, on-phone storage, data loading and the page frame.
   Everything hangs off one global, window.CCNA, so the other files can share it. */
(function () {
  "use strict";
  var A = window.CCNA = {};
  A.DOMAINS = { 1: ["Network Infrastructure and Connectivity", 25], 2: ["Switching and Network Access", 25], 3: ["IP Routing", 20],
                4: ["Network Services and Security", 20], 5: ["AI, and Network Operations and Management", 10] };
  A.GOAL = 20; A.GOAL_ACC = 95; A.TARGET = 90;

  var view = document.getElementById("view"), barBack = document.getElementById("bar-back"), barTitle = document.getElementById("bar-title"),
      tabs = document.getElementById("tabs"), ticker = null, backHandler = null;

  /* ---------- DOM helpers ---------- */
  A.h = function (tag, attrs, kids) {
    var el = document.createElement(tag), k; attrs = attrs || {};
    for (k in attrs) {
      if (k === "class") el.className = attrs[k];
      else if (k === "text") el.textContent = attrs[k];
      else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) el.setAttribute(k, "");
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) el.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return el;
  };
  var h = A.h;
  /* replaceChildren would print a null as the word "null", so always filter first */
  A.setKids = function (el, kids) { el.replaceChildren.apply(el, kids.filter(Boolean)); };
  A.tick = function (fn, ms) { A.stopTick(); ticker = setInterval(fn, ms); };
  A.stopTick = function () { if (ticker) { clearInterval(ticker); ticker = null; } };

  /* Draw a screen. opts.tab = which bottom tab is lit (menus). No tab = a focused activity: the tab bar hides
     so a stray thumb cannot throw away a quiz, and opts.back offers the way out. */
  A.frame = function (opts, nodes) {
    A.stopTick();
    barTitle.textContent = opts.title || "";
    backHandler = opts.back || null;
    barBack.hidden = !backHandler;
    barBack.textContent = "‹ " + (opts.backLabel || "Back");
    document.body.classList.toggle("focus", !opts.tab);
    Array.prototype.forEach.call(tabs.children, function (b) { if (b.dataset.tab === opts.tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    A.setKids(view, nodes);
    window.scrollTo(0, 0);
  };
  barBack.addEventListener("click", function () { if (backHandler) backHandler(); });

  A.rnd = function (n) { return Math.floor(Math.random() * n); };
  A.pick1 = function (a) { return a[A.rnd(a.length)]; };
  A.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = A.rnd(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
  A.range = function (n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; };
  A.same = function (a, b) { return a.length === b.length && a.every(function (v, i) { return v === b[i]; }); };
  A.pct = function (c, t) { return t ? 100 * c / t : 0; };
  A.fmtClock = function (s) { s = Math.max(0, Math.floor(s)); var hh = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (hh ? hh + ":" + (m < 10 ? "0" : "") : "") + m + ":" + (ss < 10 ? "0" : "") + ss; };
  A.ymd = function (d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); };
  A.today = function (offset) { return A.ymd(new Date(Date.now() + (offset || 0) * 86400000)); };

  A.plate = function (label, right, total, stateOf, cols) {
    var ports = h("div", { class: "ports", style: "grid-template-columns:repeat(" + (cols || Math.min(total, 25)) + ",1fr)" }, A.range(total).map(function (i) { return h("span", { class: "port " + stateOf(i) }); }));
    return h("div", { class: "faceplate", role: "img", "aria-label": label + ", " + right }, [h("div", { class: "faceplate-top" }, [h("strong", { text: label }), h("span", { text: right })]), ports]);
  };
  A.exhibit = function (text, title, tall) {
    return h("div", { class: "stack tight" }, [title ? h("span", { class: "exhibit-title", text: title }) : null,
      h("div", { class: "exhibit" + (tall ? " tall" : ""), tabindex: "0" }, [h("pre", { text: text })]), h("span", { class: "small muted", text: "Swipe sideways to read long lines." })]);
  };
  A.modeList = function (items) {
    return h("div", { class: "modes" }, items.filter(Boolean).map(function (it) {
      return h("button", { class: "mode", type: "button", onclick: it.go }, [h("span", { class: "txt" }, [h("span", { class: "name", text: it.name }), it.sub ? h("span", { class: "sub", text: it.sub }) : null]),
        it.badge ? h("span", { class: "badge" + (it.done ? " done" : ""), text: it.badge }) : null, h("span", { class: "chev", text: "›" })]);
    }));
  };
  A.domainBars = function (byD) {
    return h("div", { class: "panel bars" }, Object.keys(A.DOMAINS).map(function (d) { var b = byD[d] || [0, 0];
      return h("div", { class: "stack tight" }, [h("div", { class: "bar-head" }, [h("span", { text: d + ". " + A.DOMAINS[d][0] }), h("span", { text: b[1] ? b[0] + "/" + b[1] : "-" })]),
        h("div", { class: "track" }, [h("div", { class: "fill", style: "width:" + A.pct(b[0], b[1]) + "%" })])]); }));
  };
  A.toast = function (text) {
    var t = h("div", { class: "toast", role: "status", text: text }); document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  };
  A.copy = function (text, area, status) {
    var fb = function () { if (area) { area.focus(); area.select(); } if (status) status.textContent = "Text selected. Tap Copy in the menu that appears."; };
    try { navigator.clipboard.writeText(text).then(function () { if (status) status.textContent = "Copied."; A.toast("Copied"); }, fb); } catch (e) { fb(); }
  };

  /* ---------- storage: everything is kept on this phone ---------- */
  var PREFIX = "ccna:";
  A.storageOK = true;
  A.LS = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(PREFIX + k) || "null"); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); return true; } catch (e) { A.storageOK = false; return false; } },
    del: function (k) { try { localStorage.removeItem(PREFIX + k); } catch (e) { /* ignore */ } }
  };
  var DOCS = ["qstats", "cards", "scen", "learn"];
  var BLANK = { qstats: '{"stats":{}}', cards: '{"cards":{}}', scen: '{"stats":{}}', learn: '{"done":{}}' };
  A.STATE_KEYS = DOCS.concat(["history", "settings", "placement"]);
  A.ST = {}; A.H = []; A.settings = { theme: "auto" };
  A.loadState = function () {
    DOCS.forEach(function (n) { A.ST[n] = A.LS.get(n) || JSON.parse(BLANK[n]); });
    A.H = A.LS.get("history") || [];
    A.settings = A.LS.get("settings") || { theme: "auto" };
    A.storageOK = A.LS.set("probe", 1); A.LS.del("probe");
    A.applyTheme();
  };
  A.touch = function (name) {
    A.ST[name].updated = Date.now(); A.LS.set(name, A.ST[name]);
    if (A.cloud) { dirty[name] = true; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 1200); }
  };
  A.addHistory = function (rec) {
    rec.ts = new Date().toISOString(); A.H.push(rec);
    if (A.H.length > 900) A.H = A.H.slice(-900);
    A.LS.set("history", A.H);
    if (A.cloud) { PEND.push(rec); pushPending(); }
    return rec;
  };
  A.hist = function (kind) { return A.H.filter(function (r) { return r.kind === kind; }); };
  A.applyTheme = function () {
    if (A.hosted) return;                       /* inside Claude the viewer's own light/dark setting applies */
    var t = A.settings.theme;
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
  };
  A.localDay = function (ts) { return A.ymd(new Date(ts)); };
  /* Your exam date and study start date are personal, so they are typed in on the phone and stay there. */
  function daysFrom(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000); }
  A.daysToExam = function () { return A.settings.exam ? daysFrom(A.today(), A.settings.exam) : null; };
  A.weekNumber = function () { if (!A.settings.start) return null; var d = daysFrom(A.settings.start, A.today()); return d < 0 ? 0 : Math.floor(d / 7) + 1; };
  A.currentWeek = function () { var n = A.weekNumber(); return n ? ((A.D.plan.weeks || []).filter(function (w) { return w.n === n; })[0] || null) : null; };
  A.niceDate = function (ymd) { return new Date(ymd + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); };
  A.doneToday = function (kind) { var t = A.today(); return A.H.some(function (r) { return r.kind === kind && A.localDay(r.ts) === t; }); };
  A.streak = function () {
    var days = {}; A.H.forEach(function (r) { days[A.localDay(r.ts)] = 1; });
    var n = 0, off = days[A.today()] ? 0 : -1;
    while (days[A.today(off - n)]) n++;
    return n;
  };

  /* ---------- optional mirror to the Claude account ----------
     Only when the app is opened inside Claude (claude.ai). The phone copy stays the working copy; the
     account copy is a mirror, so scores survive cleared browser data and the coach can read them. */
  A.hosted = !!(window.claude && typeof window.claude.use === "function");
  A.cloud = null;
  var dirty = {}, saving = false, saveTimer = null, pushing = false, PEND = [];
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function flush() {
    if (saving || !A.cloud) return;
    var names = Object.keys(dirty); if (!names.length) return;
    var name = names[0]; delete dirty[name]; saving = true;
    A.cloud.doc("state/" + name).set(clone(A.ST[name])).then(function () { saving = false; flush(); },
      function () { saving = false; dirty[name] = true; clearTimeout(saveTimer); saveTimer = setTimeout(flush, 20000); });
  }
  function pushPending() {
    if (pushing || !A.cloud || !PEND.length) return;
    pushing = true; var rec = PEND[0];
    A.cloud.collection("history").add(clone(rec)).then(function () { PEND = PEND.filter(function (x) { return x !== rec; }); pushing = false; pushPending(); }, function () { pushing = false; });
  }
  A.cloudPut = function (name, obj) { if (A.cloud) A.cloud.doc("state/" + name).set(clone(obj)).catch(function () { /* stays on the phone */ }); };
  A.connectCloud = function () {
    if (!A.hosted) return Promise.resolve();
    var work = window.claude.use("db").then(function (db) {
      if (!db) return;
      return Promise.all(DOCS.map(function (n) { return db.doc("state/" + n).get(); }).concat([db.collection("history").limit(1000).get(), db.doc("state/placement").get()])).then(function (r) {
        A.cloud = db;
        DOCS.forEach(function (n, i) {
          var remote = r[i].exists ? clone(r[i].data()) : null, local = A.ST[n];
          if (remote && (remote.updated || 0) > (local.updated || 0)) { A.ST[n] = remote; A.LS.set(n, remote); }
          else if ((local.updated || 0) > ((remote && remote.updated) || 0)) dirty[n] = true;
        });
        var remoteH = r[DOCS.length].docs.map(function (d) { return clone(d.data()); }), there = {}, here = {};
        remoteH.forEach(function (x) { there[x.ts] = 1; }); A.H.forEach(function (x) { here[x.ts] = 1; });
        PEND = A.H.filter(function (x) { return !there[x.ts]; });
        A.H = A.H.concat(remoteH.filter(function (x) { return !here[x.ts]; })).sort(function (a, b) { return a.ts < b.ts ? -1 : 1; });
        A.LS.set("history", A.H);
        var rp = r[DOCS.length + 1].exists ? clone(r[DOCS.length + 1].data()) : null, lp = A.LS.get("placement");
        if (rp && rp.complete && !(lp && lp.complete && (lp.finished || 0) > (rp.finished || 0))) A.LS.set("placement", rp);
        else if (lp && lp.complete) A.cloudPut("placement", lp);
        flush(); pushPending();
      });
    });
    return Promise.race([work, new Promise(function (res) { setTimeout(res, 10000); })]).catch(function () { /* not reachable: the phone copy carries on */ });
  };

  /* ---------- data files (all shipped with the app, cached for offline use) ---------- */
  A.D = null;
  A.loadData = function () {
    var files = ["questions", "scenarios", "flashcards", "diagnostic", "notes", "plan", "coach"];
    return Promise.all(files.map(function (f) { return fetch("data/" + f + ".json").then(function (r) { if (!r.ok) throw new Error(f); return r.json(); }); }))
      .then(function (r) { A.D = {}; files.forEach(function (f, i) { A.D[f] = r[i]; }); A.D.byId = {}; A.D.questions.forEach(function (q) { A.D.byId[q.id] = q; }); return A.D; });
  };
})();
