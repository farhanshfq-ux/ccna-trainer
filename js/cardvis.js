/* cardvis.js: visual flashcards. A card in data/flashcards.json can carry, on top of its front and back:
     v     a picture: { t: "port" | "kv" | "bars" | "flow" | "cmp" | "cli" | "lad" | "chan" | "pic" | "nl", ... }
     a, x  the right answer and three wrong ones, for tap-to-answer
     q     the question to tap an answer to, when the front is too broad
     m     "order": the learner puts the steps of a "flow" picture in order instead
     hook  one line to remember it by
   Before the answer the picture is drawn with its values hidden. Grading feeds the same Leitner boxes as cards.js. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame, NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, kids) { var el = document.createElementNS(NS, tag), k; for (k in attrs) { if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); } (kids || []).forEach(function (c) { el.appendChild(c); }); return el; }
  function num(n) { return Number(n).toLocaleString("en-GB"); }
  /* h lists the rows to hide before the answer. No h = hide every value. */
  function hid(v, k, shown) { return !shown && (!v.h || v.h.indexOf(k) >= 0); }

  /* Administrative distance, most trusted first. The "lad" picture highlights rungs by name. */
  var AD = [["Connected", 0], ["Static", 1], ["eBGP", 20], ["EIGRP", 90], ["OSPF", 110], ["IS-IS", 115], ["RIP", 120], ["EIGRP external", 170], ["iBGP", 200], ["Unusable", 255]];

  /* ---------- pictures ---------- */
  function vPort(v, shown) {
    return h("div", { class: "cv-ports" + (v.i.length === 1 ? " one" : "") }, v.i.map(function (it, k) { var hide = hid(v, k, shown);
      return h("div", { class: "cv-plate" + (hide ? "" : " p-" + it[1].toLowerCase()) }, [h("span", { class: "cv-proto", text: hide ? "TCP or UDP?" : it[1] === "IP" ? "IP protocol" : it[1] }),
        h("strong", { class: "cv-num" + (hide ? " mask" : ""), text: hide ? "?" : it[0] }), h("span", { class: "cv-lbl", text: it[2] })]); }));
  }
  function vKv(v, shown) {
    return h("div", { class: "cv-kv" }, v.i.map(function (it, k) { var hide = hid(v, k, shown);
      return h("div", { class: "cv-row" }, [h("span", { class: "cv-k", text: it[0] }), h("span", { class: "cv-v" + (hide ? " mask" : ""), text: hide ? "?" : it[1] })]); }));
  }
  function vBars(v, shown) {
    var max = Math.max.apply(null, v.i.map(function (it) { return it[1]; }));
    return h("div", { class: "cv-bars" }, v.i.map(function (it, k) { var hide = hid(v, k, shown);
      return h("div", { class: "cv-bar" }, [h("span", { class: "cv-bl", text: it[0] }), h("span", { class: "cv-track" }, [h("span", { class: "cv-fill", style: "width:" + (hide ? 0 : Math.max(3, 100 * it[1] / max)) + "%" })]),
        h("span", { class: "cv-bv" + (hide ? " mask" : ""), text: hide ? "?" : num(it[1]) + (v.u ? " " + v.u : "") })]); }));
  }
  function vFlow(v) {
    var kids = [], tall = v.i.length > 5 || v.i.some(function (t) { return t.length > 13; });
    v.i.forEach(function (t, k) {
      if (k && !tall) kids.push(h("span", { class: "cv-arrow", "aria-hidden": "true", text: "›" }));
      kids.push(h("span", { class: "cv-step" + (v.hi && v.hi.indexOf(k) >= 0 ? " hi" : "") }, [h("span", { class: "cv-n", text: String(k + (v.z ? 0 : 1)) }), h("span", { text: t })])); });
    return h("div", { class: "cv-flow" + (tall ? " col" : "") }, kids);
  }
  function vCmp(v) {
    return h("div", { class: "cv-cmp", style: "grid-template-columns:repeat(" + v.c.length + ",1fr)" }, v.c.map(function (col, k) {
      return h("div", { class: "cv-col c" + k }, [h("strong", { text: col[0] }), h("ul", {}, col.slice(1).map(function (t) { return h("li", { text: t }); }))]); }));
  }
  function vCli(v) {
    var wide = v.l.split("\n").some(function (l) { return l.length > 38; });
    return h("div", { class: "stack tight" }, [h("div", { class: "exhibit", tabindex: wide ? "0" : null }, [h("pre", { text: v.l })]), wide ? h("span", { class: "small muted", text: "Swipe sideways to read long lines." }) : null]);
  }
  function vLad(v, shown) {
    var rows = AD.map(function (r) { var hi = v.hi.indexOf(r[0]) >= 0, hide = hi && !shown;
      return h("div", { class: "cv-rung" + (hi ? " hi" : "") }, [h("span", { class: "cv-ad" + (hide ? " mask" : ""), text: hide ? "?" : String(r[1]) }), h("span", { text: r[0] })]); });
    return h("div", { class: "cv-lad", role: "img", "aria-label": "Administrative distance ladder, most trusted at the top" }, [h("span", { class: "cv-cap", text: "Most trusted ↑" })].concat(rows, [h("span", { class: "cv-cap", text: "Never used ↓" })]));
  }
  /* The 2.4 GHz band: eleven channels, each 22 MHz wide and only 5 MHz apart, so they overlap. */
  function vChan(v, shown) {
    var k = [], clean = { 1: "var(--c-net)", 6: "var(--c-host)", 11: "var(--c-sub)" }, c, cx;
    for (c = 1; c <= 11; c++) { cx = 62 + (c - 1) * 21.6;
      k.push(S("path", { d: "M" + (cx - 47.5) + " 92Q" + cx + " 4 " + (cx + 47.5) + " 92", fill: shown && clean[c] ? clean[c] : "none", "fill-opacity": 0.3, stroke: shown && clean[c] ? clean[c] : "var(--muted)", "stroke-width": shown && clean[c] ? 2.5 : 1, "stroke-opacity": shown && !clean[c] ? 0.35 : 1 }));
      k.push(S("text", { x: cx, y: 110, "text-anchor": "middle", "font-size": 12, "font-weight": shown && clean[c] ? 700 : 400, fill: shown && clean[c] ? clean[c] : "var(--muted)", text: String(c) })); }
    k.push(S("line", { x1: 8, y1: 92, x2: 332, y2: 92, stroke: "var(--line)", "stroke-width": 1.5 }));
    return h("div", { class: "stack tight" }, [S("svg", { viewBox: "0 0 340 116", class: "vis-svg", role: "img", "aria-label": shown ? "The 2.4 GHz band. Channels 1, 6 and 11 do not overlap." : "The 2.4 GHz band with eleven overlapping channels" }, k),
      h("span", { class: "small muted", text: shown ? "Each channel is 22 MHz wide but they are only 5 MHz apart. Only 1, 6 and 11 clear each other." : "Each hump is one channel. Which three do not touch each other?" })]);
  }
  function box(x, y, w, ht, label, opts) { opts = opts || {};
    return [S("rect", { x: x, y: y, width: w, height: ht, rx: 8, fill: opts.fill || "var(--surface)", stroke: opts.stroke || "var(--ink)", "stroke-width": 2, "stroke-dasharray": opts.dash || "none" }),
      S("text", { x: x + w / 2, y: y + ht / 2 + (opts.sub ? -2 : 4), "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "var(--ink)", text: label })]
      .concat(opts.sub ? [S("text", { x: x + w / 2, y: y + ht / 2 + 12, "text-anchor": "middle", "font-size": 10, fill: opts.subFill || "var(--muted)", text: opts.sub })] : []);
  }
  var PICS = {
    hsrp: function () {
      var k = [S("line", { x1: 110, y1: 82, x2: 170, y2: 118, stroke: "var(--ok)", "stroke-width": 3 }), S("line", { x1: 230, y1: 82, x2: 170, y2: 118, stroke: "var(--muted)", "stroke-width": 2, "stroke-dasharray": "5 4" }),
        S("line", { x1: 170, y1: 148, x2: 170, y2: 162, stroke: "var(--muted)", "stroke-width": 2 }),
        S("rect", { x: 60, y: 6, width: 220, height: 24, rx: 12, fill: "var(--accent-soft)", stroke: "var(--accent)", "stroke-width": 1.5 }),
        S("text", { x: 170, y: 22, "text-anchor": "middle", "font-size": 11.5, "font-weight": 700, fill: "var(--ink)", text: "Virtual gateway 10.1.1.1 (shared)" }),
        S("line", { x1: 110, y1: 30, x2: 110, y2: 42, stroke: "var(--accent)", "stroke-width": 1.5 }), S("line", { x1: 230, y1: 30, x2: 230, y2: 42, stroke: "var(--accent)", "stroke-width": 1.5 })];
      k = k.concat(box(64, 42, 92, 40, "R1", { stroke: "var(--ok)", sub: "Active: forwards", subFill: "var(--ok)" }), box(184, 42, 92, 40, "R2", { dash: "5 4", stroke: "var(--muted)", sub: "Standby: waits" }),
        box(130, 118, 80, 30, "Switch"), box(110, 162, 120, 34, "PC", { sub: "gateway = 10.1.1.1" }));
      return h("div", { class: "stack tight" }, [S("svg", { viewBox: "0 0 340 200", class: "vis-svg", role: "img", "aria-label": "Two routers share one virtual gateway address. R1 is active and R2 is on standby." }, k),
        h("span", { class: "small muted", text: "If R1 fails, R2 starts answering for the same virtual IP and MAC. The PC changes nothing." })]);
    },
    bundle: function () {
      var k = [S("text", { x: 170, y: 13, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--ok)", text: "With EtherChannel: one logical link" }),
        S("line", { x1: 92, y1: 34, x2: 248, y2: 34, stroke: "var(--ok)", "stroke-width": 3 }), S("line", { x1: 92, y1: 46, x2: 248, y2: 46, stroke: "var(--ok)", "stroke-width": 3 }),
        S("ellipse", { cx: 170, cy: 40, rx: 30, ry: 15, fill: "none", stroke: "var(--accent)", "stroke-width": 2 }),
        S("text", { x: 170, y: 73, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)", text: "Po1: both cables carry traffic" }),
        S("text", { x: 170, y: 101, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--bad)", text: "Without it: spanning tree blocks one" }),
        S("line", { x1: 92, y1: 122, x2: 248, y2: 122, stroke: "var(--ok)", "stroke-width": 3 }), S("line", { x1: 92, y1: 134, x2: 248, y2: 134, stroke: "var(--bad)", "stroke-width": 2, "stroke-dasharray": "5 4" }),
        S("text", { x: 170, y: 139, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: "var(--bad)", text: "✕" }),
        S("text", { x: 170, y: 160, "text-anchor": "middle", "font-size": 10.5, fill: "var(--muted)", text: "one cable works, the other only waits" })];
      k = k.concat(box(22, 22, 70, 36, "SW1"), box(248, 22, 70, 36, "SW2"), box(22, 110, 70, 36, "SW1"), box(248, 110, 70, 36, "SW2"));
      return S("svg", { viewBox: "0 0 340 166", class: "vis-svg", role: "img", "aria-label": "Two cables between two switches. With EtherChannel both carry traffic as one link. Without it, spanning tree blocks one." }, k);
    }
  };
  function vNl(v, shown) {                      /* four blocks of the last octet, the one holding the pin lit once answered */
    var at = Math.floor(v.pin / v.b), from = Math.max(0, Math.min(at - 2, 256 / v.b - 4));
    return h("div", { class: "stack tight" }, [h("div", { class: "numline" }, A.range(4).map(function (j) { var n = from + j, cur = shown && n === at;
      return h("span", { class: "blk" + (cur ? " cur" : "") }, [h("span", { class: "rng", text: (n * v.b) + "–" + (n * v.b + v.b - 1) }), cur ? h("span", { class: "pin", text: "▲ " + v.pin }) : null]); })),
      h("span", { class: "small muted", text: shown ? v.pin + " sits in the block that starts at " + (at * v.b) + "." : "The last number, cut into blocks of " + v.b + ". Where does " + v.pin + " land?" })]);
  }
  var DRAW = { port: vPort, kv: vKv, bars: vBars, flow: vFlow, cmp: vCmp, cli: vCli, lad: vLad, chan: vChan, nl: vNl, pic: function (v) { return PICS[v.n] ? PICS[v.n]() : null; } };
  var MASKED = { port: 1, kv: 1, bars: 1, lad: 1, chan: 1, nl: 1 };     /* these can be drawn with the answer hidden */

  /* The card's picture. shown = false is the view before the answer: null if the picture would give it away. */
  A.cardVisual = function (card, shown) {
    var v = card.v;
    if (!v || !DRAW[v.t]) return null;
    if (!shown && (card.m === "order" || v.post || !(MASKED[v.t] || v.pre))) return null;
    return h("div", { class: "cv-vis" }, [DRAW[v.t](v, shown)]);
  };
  function backText(card) { return h("div", { class: "cv-back", text: card.back }); }
  function hook(card) { return card.hook ? h("div", { class: "notice info cv-hook" }, [h("strong", { text: "Remember it: " }), card.hook]) : null; }

  /* ---------- a session ---------- */
  A.runVisualCards = function (set, label, backTo) {
    var queue = set.map(function (c) { return { card: c, again: false }; }), i = 0, right = 0, total = 0, started = Date.now(), exit = backTo || A.cardsMenu, missed = [];
    function miss(card) { if (missed.indexOf(card) < 0) missed.push(card); queue.push({ card: card, again: true }); }
    function done() {
      if (!total) return exit();
      A.addHistory({ kind: "flashcards", label: label, total: total, correct: right, duration_s: Math.round((Date.now() - started) / 1000) });
      frame({ title: "Results", tab: "cards" }, [h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: label }), h("div", { class: "score", text: right + " / " + total }),
        h("p", { class: "muted", text: missed.length ? "The cards below went back to box 1. They come up again next session." : "Every card right first time. They have all moved up a box." })]),
        missed.length ? h("div", { class: "stack tight" }, missed.map(function (c) { return h("div", { class: "rv bad" }, [h("span", { class: "small", text: c.q || c.front }), h("strong", { text: c.a || (c.v && c.v.i ? c.v.i.join(", ") : c.back) })]); })) : null,
        missed.length ? h("button", { class: "btn", type: "button", id: "cards-again", text: "Go again on the " + (missed.length === 1 ? "one I missed" : missed.length + " I missed"), onclick: function () { A.runVisualCards(missed.slice(), label, backTo); } }) : null,
        h("button", { class: missed.length ? "btn quiet" : "btn", type: "button", id: "cards-done", text: "Done", onclick: exit })]);
    }
    function step() {
      if (i >= queue.length) return done();
      var it = queue[i], card = it.card, e = A.ST.cards.cards[card.id], box = e ? e.b : 0, answered = false;
      var vis = h("div"), task = h("div", { class: "stack" }), after = h("div", { class: "stack" });
      function next() { i++; step(); }
      function finish(knew) {
        if (answered) return; answered = true;
        var before = e ? JSON.parse(JSON.stringify(e)) : null;
        if (!it.again) { A.gradeCard(card, knew); total++; if (knew) right++; else miss(card); }
        A.setKids(vis, [A.cardVisual(card, true)]);
        A.setKids(after, [
          h("div", { class: "notice " + (knew ? "ok" : ""), id: "cv-verdict", role: "status" }, [h("strong", { text: knew ? "Correct. " : "Not quite. " }),
            it.again ? (knew ? "That is the one you missed earlier. It stays in box 1 for next time." : "Have another look at the card below.") : knew ? "Up to box " + A.ST.cards.cards[card.id].b + "." : "Back to box 1. It comes round again before you finish."]),
          hook(card), h("span", { class: "eyebrow", text: "The full card" }), card.q ? h("p", { class: "small muted", text: card.front }) : null, backText(card),
          h("button", { class: "btn", type: "button", id: "cv-next", text: i + 1 < queue.length ? "Next card" : "Finish", onclick: next }),
          knew && !it.again ? h("button", { class: "linkbtn", type: "button", id: "cv-guess", text: "I guessed. Bring it back.", onclick: function () {
            if (before) A.ST.cards.cards[card.id] = before; else delete A.ST.cards.cards[card.id];
            A.gradeCard(card, false); right--; miss(card); next(); } }) : null]);
        var n = document.getElementById("cv-verdict"); if (n && n.scrollIntoView) n.scrollIntoView({ block: "nearest" });
      }

      if (card.m === "order" && card.v && card.v.i) orderTask(card, task, finish);
      else if (card.a && card.x) {
        A.setKids(task, A.shuffle([card.a].concat(card.x)).map(function (o, n) {
          return h("button", { class: "opt", type: "button", "data-right": o === card.a ? "1" : null, onclick: function (ev) {
            if (answered) return;
            var ok = o === card.a; ev.currentTarget.classList.add(ok ? "right" : "wrong");
            Array.prototype.forEach.call(task.children, function (b) { b.disabled = true; if (b.getAttribute("data-right")) { b.classList.add("right"); b.querySelector(".mark").textContent = "✓"; } });
            if (!ok) ev.currentTarget.querySelector(".mark").textContent = "✕";
            finish(ok);
          } }, [h("span", { class: "mark", text: "ABCD".charAt(n) }), h("span", { class: "txt", text: o })]); }));
      } else {                                   /* a card with no tap answer: say it, look, mark yourself */
        A.setKids(task, [h("p", { class: "small muted", text: "Say the answer out loud before you look." }), h("button", { class: "btn", type: "button", text: "Show the answer", onclick: function () {
          A.setKids(vis, [A.cardVisual(card, true)]);
          A.setKids(task, [backText(card), h("div", { class: "row" }, [h("button", { class: "btn quiet", type: "button", text: "Missed it", onclick: function () { finish(false); } }), h("button", { class: "btn", type: "button", text: "Got it", onclick: function () { finish(true); } })])]); } })]);
      }
      A.setKids(vis, [A.cardVisual(card, false)]);
      frame({ title: label, back: done, backLabel: "Finish" }, [
        A.plate("Card " + (i + 1) + " of " + queue.length, it.again ? "second look" : box ? "box " + box : "new card", queue.length, function (k) { return k < i ? "done" : k === i ? "now" : ""; }),
        h("span", { class: "eyebrow", text: card.category + (card.background ? " · background" : "") }),
        h("div", { class: "cv-card", id: "flashcard" }, [h("div", { class: "front", text: card.q || card.front }), vis]),
        card.m === "order" ? null : card.a ? h("p", { class: "small muted", text: "Tap the right answer." }) : null,
        task, after]);
    }
    step();
  };

  /* Put the steps in order: tap them one at a time; tap the last one you placed to take it back. */
  function orderTask(card, task, finish) {
    var items = card.v.i, zero = card.v.z ? 0 : 1, picked = [], pool = A.shuffle(A.range(items.length)), locked = false;
    if (A.same(pool, A.range(items.length))) pool.reverse();          /* never hand it over already sorted */
    function paint() {
      var full = picked.length === items.length;
      A.setKids(task, [h("p", { class: "small muted", text: "Tap them in the right order. Tap a placed one to take it back." }),
        h("div", { class: "cv-slots" }, A.range(items.length).map(function (k) { var has = k < picked.length, ok = locked && picked[k] === k;
          return h("button", { class: "cv-slot" + (has ? " full" : "") + (locked ? (ok ? " ok" : " no") : ""), type: "button", disabled: locked || !has, "aria-label": "Position " + (k + zero) + (has ? ": " + items[picked[k]] : ", empty"),
            onclick: function () { if (!locked && has) { picked = picked.slice(0, k); paint(); } } }, [h("span", { class: "cv-n", text: String(k + zero) }), h("span", { text: has ? items[picked[k]] : "" })]); })),
        locked ? null : h("div", { class: "cv-pool" }, pool.map(function (idx) { return h("button", { class: "cv-chip", type: "button", disabled: picked.indexOf(idx) >= 0, text: items[idx], onclick: function () { picked.push(idx); paint(); } }); })),
        locked ? null : h("button", { class: "btn", type: "button", id: "cv-check", disabled: !full, text: "Check the order", onclick: function () { locked = true; paint(); finish(A.same(picked, A.range(items.length))); } })]);
    }
    paint();
  }

  /* ---------- a topic: test button, then the picture board ---------- */
  A.cardsTopic = function (cat) {
    var set = A.D.flashcards.filter(function (c) { return c.category === cat; }), st = A.ST.cards.cards,
        known = set.filter(function (c) { return st[c.id] && st[c.id].b >= 3; }).length, back = function () { A.cardsTopic(cat); };
    frame({ title: "Flashcards", tab: "cards", back: A.cardsMenu, backLabel: "All topics" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: cat }), h("p", { class: "muted", text: set.length + " cards. " + known + " in box 3 or higher." })]),
      h("button", { class: "btn", type: "button", id: "topic-test", text: "Test me on these " + set.length, onclick: function () { A.playCards(A.shuffle(set), cat, back); } }),
      h("h2", { text: "Picture board" }),
      h("p", { class: "small muted", text: "Everything in this topic on one page. Read it through, then test yourself." })
    ].concat(set.map(function (c) { return h("div", { class: "cv-card cv-entry" }, [h("h3", { text: c.front + (c.background ? " (background)" : "") }), A.cardVisual(c, true), backText(c), hook(c)]); })));
  };
})(window.CCNA);
