/* cards.js: flashcards with spaced repetition (Leitner boxes). Ported from trainer/flashcards.py.
   Box 1 comes back every session, box 5 every 16 days. Right = up one box. Wrong = back to box 1.
   Two ways to play the same cards and the same boxes: "visual" (cardvis.js: a picture and tap the answer)
   and "classic" (below: say it, flip it, mark yourself). The choice is kept in settings.cards. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame, shuffle = A.shuffle, pct = A.pct;
  var INTERVAL = { 1: 0, 2: 2, 3: 4, 4: 8, 5: 16 };

  A.boxCounts = function () { var c = [0, 0, 0, 0, 0, 0]; A.D.flashcards.forEach(function (k) { var e = A.ST.cards.cards[k.id]; c[e ? e.b : 0]++; }); return c; };
  A.dueCards = function () { var t = A.today(); return A.D.flashcards.filter(function (k) { var e = A.ST.cards.cards[k.id]; return e && e.d <= t; }); };
  function choose(size) {
    var st = A.ST.cards.cards, due = shuffle(A.dueCards()).sort(function (a, b) { return st[a.id].b - st[b.id].b; }), fresh = shuffle(A.D.flashcards.filter(function (k) { return !st[k.id]; }));
    var quota = Math.max(size - due.length, Math.floor(size / 4));     /* always leave room for some new cards */
    return shuffle(due.slice(0, size - Math.min(quota, fresh.length)).concat(fresh.slice(0, quota)).slice(0, size));
  }
  A.gradeCard = function (card, knew) {
    var e = A.ST.cards.cards[card.id], box = e ? e.b : 0, nb = knew ? Math.min(5, Math.max(box, 1) + 1) : 1;
    A.ST.cards.cards[card.id] = { b: nb, d: A.today(INTERVAL[nb]), s: (e ? e.s : 0) + 1, c: (e ? e.c : 0) + (knew ? 1 : 0) }; A.touch("cards");
  };
  A.catDomain = function (cat) {               /* the exam domain most of a topic's cards belong to */
    var n = {}, best = 0; A.D.flashcards.forEach(function (k) { if (k.category === cat) { n[k.domain] = (n[k.domain] || 0) + 1; if (!best || n[k.domain] > n[best]) best = k.domain; } });
    return best;
  };
  A.cardMode = function () { return A.settings.cards === "classic" ? "classic" : "visual"; };
  A.playCards = function (set, label, backTo) { if (A.cardMode() === "classic") run(set, label, backTo); else A.runVisualCards(set, label, backTo); };
  A.weakCards = function () { return A.D.flashcards.filter(function (k) { var e = A.ST.cards.cards[k.id]; return e && e.b === 1; }); };
  A.cardsToday = function (backTo) { var set = choose(20); if (set.length) A.playCards(set, "Today's session", backTo); else A.toast("Nothing is due today."); };

  A.cardsMenu = function () {
    var cards = A.D.flashcards, st = A.ST.cards.cards, counts = A.boxCounts(), due = A.dueCards().length, weak = A.weakCards(), visual = A.cardMode() === "visual",
        cats = Array.from(new Set(cards.map(function (c) { return c.category; }))).sort(function (a, b) { return A.catDomain(a) - A.catDomain(b) || (a < b ? -1 : 1); });   /* grouped by exam domain, so the colours sit together */
    var labels = ["New (never seen)", "Box 1 (every session)", "Box 2 (every 2 days)", "Box 3 (every 4 days)", "Box 4 (every 8 days)", "Box 5 (every 16 days)"];
    function setMode(m) { A.settings.cards = m; A.LS.set("settings", A.settings); A.cardsMenu(); }
    frame({ title: "Flashcards", tab: "cards" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Flashcards" }), h("p", { class: "muted", text: cards.length + " cards with spaced repetition. A card you know moves up a box and comes back later. A card you miss goes back to box 1." })]),
      h("div", { class: "stack tight" }, [h("div", { class: "row", role: "group", "aria-label": "Card style" }, [
        h("button", { class: "btn" + (visual ? "" : " quiet"), type: "button", id: "mode-visual", "aria-pressed": String(visual), text: "Visual", onclick: function () { setMode("visual"); } }),
        h("button", { class: "btn" + (visual ? " quiet" : ""), type: "button", id: "mode-classic", "aria-pressed": String(!visual), text: "Classic", onclick: function () { setMode("classic"); } })]),
        h("p", { class: "small muted", text: visual ? "Visual: a picture with the answer hidden. Tap the right answer, then see the full card." : "Classic: say the answer out loud, flip the card and mark yourself." })]),
      h("button", { class: "btn", type: "button", id: "cards-today", text: "Today's session (" + due + " due, plus new cards)", onclick: function () { A.cardsToday(); } }),
      weak.length ? h("button", { class: "btn ghost", type: "button", id: "cards-weak", text: "Fix my weak spots (" + weak.length + " in box 1)", onclick: function () { A.playCards(shuffle(weak).slice(0, 20), "Weak spots"); } }) : null,
      h("div", { class: "panel bars" }, labels.map(function (l, b) { return h("div", { class: "stack tight" }, [h("div", { class: "bar-head" }, [h("span", { text: l }), h("span", { text: String(counts[b]) })]),
        h("div", { class: "track" }, [h("div", { class: "fill" + (b >= 4 ? " ok" : ""), style: "width:" + pct(counts[b], cards.length) + "%" })])]); })),
      h("h2", { text: "Pick a topic" }),
      h("p", { class: "small muted", text: "Each topic opens a picture board: every card in it on one page, then a button to test yourself. The colour shows which part of the exam it belongs to." }),
      A.toneKey(),
      A.modeList(cats.map(function (c) { var set = cards.filter(function (k) { return k.category === c; }), known = set.filter(function (k) { return st[k.id] && st[k.id].b >= 3; }).length;
        return { name: c, sub: set.length + " cards", tone: A.catDomain(c), badge: known ? known + "/" + set.length : null, done: known === set.length, go: function () { A.cardsTopic(c); } }; })),
      h("p", { class: "small muted", text: "The badge counts cards in box 3 or higher. Cards marked \"background\" cover useful knowledge that is not an explicit v2.0 exam objective." })
    ]);
  };

  function run(set, label, backTo) {
    var i = 0, right = 0, started = Date.now(), exit = backTo || A.cardsMenu;
    function done() {
      if (!i) return exit();
      A.addHistory({ kind: "flashcards", label: label, total: i, correct: right, duration_s: Math.round((Date.now() - started) / 1000) });
      frame({ title: "Results", tab: "cards" }, [h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: label }), h("div", { class: "score", text: right + " / " + i }),
        h("p", { class: "muted", text: "Cards you missed went back to box 1 and will come up again next session." })]), h("button", { class: "btn", text: "Done", onclick: exit })]);
    }
    function step() {
      if (i >= set.length) return done();
      var card = set[i], e = A.ST.cards.cards[card.id], box = e ? e.b : 0, shown = false;
      var back = h("div", { class: "backtxt", text: card.back, hidden: true }), actions = h("div", { class: "stack" }), hint = h("div", { class: "swipe-hint", hidden: true }, [h("span", { text: "← swipe: missed" }), h("span", { text: "got it: swipe →" })]);
      var el = h("div", { class: "card" + A.tone(card.domain), id: "flashcard", role: "button", tabindex: "0", "aria-label": "Flashcard. Tap to show the answer." }, [h("div", { class: "front", text: card.front }), back]);
      function grade(knew) {
        var nb = knew ? Math.min(5, Math.max(box, 1) + 1) : 1;
        A.ST.cards.cards[card.id] = { b: nb, d: A.today(INTERVAL[nb]), s: (e ? e.s : 0) + 1, c: (e ? e.c : 0) + (knew ? 1 : 0) }; A.touch("cards");
        if (knew) right++; i++; step();
      }
      function reveal() {
        if (shown) return; shown = true; back.hidden = false; hint.hidden = false;
        A.setKids(actions, [h("p", { class: "small muted", text: "Did you get it fully right? Be strict with yourself." }), h("div", { class: "row" }, [
          h("button", { class: "btn quiet", type: "button", text: "Missed it", onclick: function () { grade(false); } }), h("button", { class: "btn", type: "button", text: "Got it", onclick: function () { grade(true); } })])]);
      }
      A.setKids(actions, [h("button", { class: "btn", type: "button", text: "Show the answer", onclick: reveal })]);

      /* tap to flip; once the answer is showing, swipe right = got it, swipe left = missed */
      var sx = null, sy = 0, dx = 0;
      el.addEventListener("pointerdown", function (ev) { sx = ev.clientX; sy = ev.clientY; dx = 0; });
      el.addEventListener("pointermove", function (ev) {
        if (sx === null || !shown) return; dx = ev.clientX - sx;
        if (Math.abs(dx) < Math.abs(ev.clientY - sy)) return;
        el.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 30) + "deg)";
        el.classList.toggle("go-right", dx > 60); el.classList.toggle("go-left", dx < -60);
      });
      function end(ev) {
        if (sx === null) return; var moved = Math.abs(dx), far = Math.abs(ev.clientY - sy) < 60; sx = null;
        el.style.transform = ""; el.classList.remove("go-right", "go-left");
        if (!shown) { if (moved < 10) reveal(); return; }
        if (moved > 90 && far) grade(dx > 0);
      }
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", function () { sx = null; el.style.transform = ""; el.classList.remove("go-right", "go-left"); });
      el.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); reveal(); } });

      frame({ title: label, back: done, backLabel: "Finish" }, [
        A.plate("Card " + (i + 1) + " of " + set.length, box ? "box " + box : "new card", set.length, function (k) { return k < i ? "done" : k === i ? "now" : ""; }),
        h("span", { class: "eyebrow pill" + A.tone(card.domain), text: card.category + (card.background ? " · background" : "") }),
        el, hint,
        h("p", { class: "small muted", text: "Say the answer out loud before you look." }), actions]);
    }
    step();
  }
})(window.CCNA);
