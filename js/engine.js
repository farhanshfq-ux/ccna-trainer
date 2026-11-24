/* engine.js: the question engine (four question types), the quiz, the mock exam and the placement test.
   Ported from trainer/bank.py, quiz.py, mock.py and placement.py. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame, shuffle = A.shuffle, range = A.range, same = A.same, pct = A.pct, DOMAINS = A.DOMAINS, TARGET = A.TARGET;

  /* ---------- one question ---------- */
  A.newLayout = function (q) {
    if (q.type === "match") return shuffle(q.pairs.map(function (p) { return p[1]; }).concat(q.distractors || []));
    var n = q.type === "order" ? q.items.length : q.options.length, o = shuffle(range(n));
    if (q.type === "order") for (var g = 0; g < 8 && same(o, range(n)); g++) o = shuffle(range(n));
    return o;
  };
  A.isCorrect = function (q, given) {
    if (!given) return false;
    if (q.type === "match") return same(given, q.pairs.map(function (p) { return p[1]; }));
    if (q.type === "order") return same(given, range(q.items.length));
    return same(given.slice().sort(), q.answer.slice().sort());
  };
  A.questionUI = function (q, layout, onChange) {
    var picked = [], box = h("div", { class: "stack" }), selects = [];
    var need = q.type === "order" ? q.items.length : q.type === "match" ? q.pairs.length : q.answer.length;
    function value() {
      if (q.type === "match") { var v = selects.map(function (s) { return s.value; }); return v.every(Boolean) && new Set(v).size === v.length ? v : null; }
      if (picked.length !== need) return null;
      return q.type === "order" ? picked.slice() : picked.slice().sort();
    }
    if (q.type === "match") {
      q.pairs.forEach(function (p, i) {
        var sel = h("select", { id: "m-" + q.id + "-" + i, "aria-label": "Match for: " + p[0], onchange: function () { onChange(); } },
          [h("option", { value: "", text: "Choose the match..." })].concat(layout.map(function (t) { return h("option", { value: t, text: t }); })));
        selects.push(sel); box.appendChild(h("div", { class: "pair" }, [h("strong", { text: p[0] }), sel]));
      });
    } else {
      layout.forEach(function (idx) {
        box.appendChild(h("button", { class: "opt" + (q.type === "single" ? "" : " multi"), type: "button", "aria-pressed": "false", onclick: function () {
          var at = picked.indexOf(idx);
          if (q.type === "single") picked = [idx]; else if (at >= 0) picked.splice(at, 1); else if (picked.length < need) picked.push(idx);
          Array.prototype.forEach.call(box.children, function (btn, pos) { var a = picked.indexOf(layout[pos]); btn.setAttribute("aria-pressed", a >= 0 ? "true" : "false");
            btn.querySelector(".mark").textContent = q.type === "order" ? (a >= 0 ? String(a + 1) : "") : (a >= 0 ? "✓" : ""); });
          onChange();
        } }, [h("span", { class: "mark" }), h("span", { class: "txt", text: q.type === "order" ? q.items[idx] : q.options[idx] })]));
      });
    }
    var how = { single: "Choose one answer.", multi: "Choose " + need + " answers.", match: "Drag and drop: choose the match for each item. Each match is used once at most.",
                order: "Drag and drop: tap the items in the correct order, first to last. Tap again to remove one." }[q.type];
    var el = h("div", { class: "stack" }, [h("p", { class: "qtext", text: q.question }), q.exhibit ? A.exhibit(q.exhibit) : null, h("p", { class: "small muted", text: how }), box]);
    return { el: el, value: value };
  };
  A.reviewUI = function (q, given, layout) {
    var kids = [];
    if (q.type === "match") {
      q.pairs.forEach(function (p, i) { var mine = given ? given[i] : null, ok = mine === p[1];
        kids.push(h("div", { class: "rv " + (ok ? "ok" : "bad") }, [h("strong", { text: p[0] }), h("span", { text: "→ " + p[1] }), !ok && mine ? h("span", { class: "why", text: "You chose: " + mine }) : null])); });
    } else if (q.type === "order") {
      q.items.forEach(function (t, i) { var ok = given && given[i] === i; kids.push(h("div", { class: "rv " + (ok ? "ok" : "bad") }, [h("span", { text: (i + 1) + ". " + t })])); });
      if (given && !A.isCorrect(q, given)) kids.push(h("p", { class: "small muted", text: "Your order: " + given.map(function (i) { return q.items[i]; }).join("  >  ") }));
    } else {
      layout.forEach(function (idx) { var right = q.answer.indexOf(idx) >= 0, chosen = given && given.indexOf(idx) >= 0, tags = [];
        if (right) tags.push("Correct answer"); if (chosen) tags.push("Your choice");
        kids.push(h("div", { class: "rv " + (right ? "ok" : chosen ? "bad" : "") }, [tags.length ? h("span", { class: "tagline " + (right ? "t-ok" : "t-bad"), text: tags.join(" · ") }) : null,
          h("span", { text: q.options[idx] }), q.rationales && q.rationales[idx] ? h("span", { class: "why", text: q.rationales[idx] }) : null])); });
    }
    kids.push(h("div", { class: "why-box" }, [h("span", { class: "eyebrow", text: "Remember" }), h("p", { text: q.explanation })]));
    return h("div", { class: "stack" }, kids);
  };
  A.recordAnswer = function (q, ok) {
    var e = A.ST.qstats.stats[q.id] || (A.ST.qstats.stats[q.id] = { s: 0, c: 0, k: 0, l: 1 });
    e.s += 1; e.c += ok ? 1 : 0; e.k = ok ? (e.k || 0) + 1 : 0; e.l = ok ? 1 : 0; e.t = Date.now(); A.touch("qstats");
  };
  /* favour questions never seen (weight 3) and ones got wrong last time (weight 5) */
  A.pickQ = function (pool, count) {
    function w(q) { var e = A.ST.qstats.stats[q.id]; if (!e) return 3; if (!e.l) return 5; return Math.max(0.2, 1 / (1 + (e.k || 0))); }
    return shuffle(pool.map(function (q) { return [Math.pow(Math.random(), 1 / w(q)), q]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, count).map(function (x) { return x[1]; }));
  };
  A.splitByWeight = function (total) {
    var exact = {}, res = {}, left = total, d;
    for (d in DOMAINS) { exact[d] = total * DOMAINS[d][1] / 100; res[d] = Math.floor(exact[d]); left -= res[d]; }
    Object.keys(exact).sort(function (a, b) { return (exact[b] - res[b]) - (exact[a] - res[a]); }).slice(0, left).forEach(function (k) { res[k] += 1; });
    return res;
  };
  A.pickByWeight = function (all, count) {
    var quotas = A.splitByWeight(count), out = [], d;
    for (d in quotas) out = out.concat(A.pickQ(all.filter(function (q) { return String(q.domain) === d; }), quotas[d]));
    return shuffle(out);
  };
  A.summarise = function (sheet) {
    var byD = {}, byO = {}, wrong = [], correct = 0;
    sheet.forEach(function (x) {
      [[byD, String(x.q.domain)], [byO, x.q.objective]].forEach(function (b) { var e = b[0][b[1]] || (b[0][b[1]] = [0, 0]); e[1]++; if (x.correct) e[0]++; });
      if (x.correct) correct++; else wrong.push(x.q.id);
    });
    return { total: sheet.length, correct: correct, by_domain: byD, by_objective: byO, wrong_ids: wrong };
  };

  /* ---------- quiz ---------- */
  A.quizMenu = function () {
    var all = A.D.questions, wrong = all.filter(function (q) { var e = A.ST.qstats.stats[q.id]; return e && !e.l; });
    var objs = Array.from(new Set(all.map(function (q) { return q.objective; }))).sort();
    var sel = h("select", { id: "obj-pick", "aria-label": "Objective" }, [h("option", { value: "", text: "Choose an objective..." })].concat(
      objs.map(function (o) { return h("option", { value: o, text: o + "  " + A.objName(o) }); })));
    frame({ title: "Quiz", tab: "quiz" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Exam questions" }), h("p", { class: "muted", text: all.length + " original questions. After each answer you see why the right answer is right and why each wrong one is wrong." })]),
      A.modeList([
        { name: "Mixed quiz", sub: "10 questions, weighted like the real exam", go: function () { A.runQuiz("Mixed quiz (10)", A.pickByWeight(all, 10)); } },
        { name: "Longer mixed quiz", sub: "25 questions", go: function () { A.runQuiz("Mixed quiz (25)", A.pickByWeight(all, 25)); } },
        { name: "Past mistakes", sub: "Questions you got wrong last time", badge: String(wrong.length), go: function () { if (wrong.length) A.runQuiz("Past mistakes", A.pickQ(wrong, 10)); else A.toast("Nothing waiting. Good."); } }]),
      h("h2", { text: "One domain" }),
      A.modeList(Object.keys(DOMAINS).map(function (d) { return { name: d + ". " + DOMAINS[d][0], sub: DOMAINS[d][1] + "% of the exam", go: function () { A.runQuiz("Domain " + d, A.pickQ(all.filter(function (q) { return String(q.domain) === d; }), 10)); } }; })),
      h("h2", { text: "One objective" }), sel,
      h("button", { class: "btn ghost", type: "button", text: "Start 10 questions on this objective", onclick: function () { if (sel.value) A.runQuiz("Objective " + sel.value, A.pickQ(all.filter(function (q) { return q.objective === sel.value; }), 10)); } })
    ]);
  };
  A.objName = function (o) { var b = A.D.plan.objectives || {}; return b[o] || ""; };
  A.runQuiz = function (label, qs, backTo) {
    var i = 0, sheet = [], started = Date.now(), exit = backTo || A.quizMenu;
    function done() {
      if (!sheet.length) return exit();
      var s = A.summarise(sheet); s.kind = "quiz"; s.label = label; s.duration_s = Math.round((Date.now() - started) / 1000); A.addHistory(s);
      var missed = {}, weakObj = {}; sheet.forEach(function (x) { if (!x.correct) { missed[x.q.topic] = 1; weakObj[x.q.objective] = 1; } });
      var relearn = A.lessons().filter(function (d) { return weakObj[d.objective]; }).slice(0, 4);
      frame({ title: "Results", tab: "quiz" }, [
        h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: label }), h("div", { class: "score", text: s.correct + " / " + s.total }), h("p", { class: "muted", text: Math.round(pct(s.correct, s.total)) + "%" })]),
        A.domainBars(s.by_domain),
        Object.keys(missed).length ? h("div", { class: "panel stack tight" }, [h("h2", { text: "Topics where you dropped marks" }), h("ul", { class: "plain" }, Object.keys(missed).map(function (t) { return h("li", { text: t }); })),
          h("p", { class: "small muted", text: "These come up more often from now on, and they are waiting under Past mistakes." })]) : null,
        relearn.length ? h("h2", { text: "Go back and learn it" }) : null,
        relearn.length ? A.modeList(relearn.map(function (d) { return { name: d.title, sub: "Lesson, about 10 minutes", go: function () { A.runLesson(d, 0, exit); } }; })) : null,
        h("button", { class: "btn", text: "Done", onclick: exit })]);
    }
    function step() {
      if (i >= qs.length) return done();
      var q = qs[i], layout = A.newLayout(q), first = null, tries = 0, out = h("div", { class: "stack" });
      var checkBtn = h("button", { class: "btn", type: "button", text: "Check answer", disabled: true, onclick: check });
      var ui = A.questionUI(q, layout, function () { checkBtn.disabled = ui.value() === null; });
      function reveal(given) {
        ui.el.hidden = true; checkBtn.hidden = true;
        A.setKids(out, [h("p", { class: "qtext", text: q.question }), q.exhibit ? A.exhibit(q.exhibit) : null,
          h("p", { class: "verdict " + (first.correct ? "ok" : "bad"), text: first.correct ? "Correct." : (A.isCorrect(q, given) ? "Right on the second attempt. Scored as wrong." : "Incorrect.") }),
          A.reviewUI(q, given, layout),
          h("button", { class: "btn", type: "button", text: i + 1 < qs.length ? "Next question" : "See results", onclick: function () { sheet.push({ q: q, correct: first.correct }); i++; step(); } })]);
        window.scrollTo(0, 0);
      }
      function check() {
        var given = ui.value(); if (given === null) return; tries++;
        var ok = A.isCorrect(q, given);
        if (tries === 1) { first = { correct: ok }; A.recordAnswer(q, ok); }
        if (!ok && tries === 1) {
          checkBtn.textContent = "Check again (not scored)";
          A.setKids(out, [h("p", { class: "verdict bad", text: "That is not right. Think about why, then have another go." }),
            h("button", { class: "linkbtn", type: "button", text: "Show me the answer", onclick: function () { reveal(given); } })]);
          return;
        }
        reveal(given);
      }
      frame({ title: label, back: done, backLabel: "Finish" }, [
        A.plate("Question " + (i + 1) + " of " + qs.length, "Objective " + q.objective, qs.length, function (k) { return k < sheet.length ? (sheet[k].correct ? "done" : "bad") : k === i ? "now" : ""; }),
        ui.el, checkBtn, out]);
    }
    if (!qs.length) return exit();
    step();
  };

  /* ---------- mock exam ---------- */
  A.mockMenu = function () {
    var all = A.D.questions, draft = A.LS.get("mock"), full = A.hist("mock").filter(function (m) { return m.full; });
    if (draft && draft.deadline <= Date.now()) return finishMock(draft, true);
    frame({ title: "Mock exam", tab: "more", back: A.moreMenu, backLabel: "More" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Mock exam" }), h("p", { class: "muted", text: "Exam conditions. No feedback until the end and no going back." })]),
      full.length ? h("p", { class: "mono small", text: "Full mocks so far: " + full.slice(-6).map(function (m) { return Math.round(m.percent) + "%"; }).join(", ") }) : null,
      draft ? h("div", { class: "notice info", text: "You have a mock in progress with " + A.fmtClock((draft.deadline - Date.now()) / 1000) + " left. The clock kept running while you were away." }) : null,
      draft ? h("button", { class: "btn", text: "Resume the mock", onclick: function () { runMock(draft); } }) : null,
      h("div", { class: "panel stack" }, [h("ul", { class: "plain" }, [
        h("li", { text: "Questions are weighted by the official domain percentages." }),
        h("li", { text: "The countdown starts when you tap Start and keeps running if you lock the phone." }),
        h("li", { text: "A skipped or unanswered question is marked wrong, as in the real exam." }),
        h("li", { text: "Closed book. Paper for subnetting only." }),
        h("li", { text: "Target: " + TARGET + "% or better. Cisco does not publish the real pass mark or the number of questions." })])]),
      A.modeList([
        { name: "Full mock exam", sub: "100 questions, 120 minutes. Counts towards readiness", go: function () { startMock(100, 120); } },
        { name: "Half mock", sub: "50 questions, 60 minutes. Practice only", go: function () { startMock(50, 60); } }])
    ]);
  };
  function startMock(size, minutes) {
    var paper = A.pickByWeight(A.D.questions, size);
    var draft = { size: size, minutes: minutes, ids: paper.map(function (q) { return q.id; }), layouts: paper.map(A.newLayout), answers: [], started: Date.now(), deadline: Date.now() + minutes * 60000 };
    A.LS.set("mock", draft); runMock(draft);
  }
  function runMock(draft) {
    function step() {
      var i = draft.answers.length;
      if (i >= draft.ids.length || Date.now() >= draft.deadline) return finishMock(draft, Date.now() >= draft.deadline);
      var q = A.D.byId[draft.ids[i]], layout = draft.layouts[i], clock = h("span", { class: "clock", text: "" }), confirmBox = h("div");
      var submit = h("button", { class: "btn", type: "button", text: "Submit answer", disabled: true, onclick: function () { var v = ui.value(); if (v !== null) answer(v); } });
      var ui = A.questionUI(q, layout, function () { submit.disabled = ui.value() === null; });
      function answer(given) { if (Date.now() < draft.deadline) { draft.answers.push({ given: given }); A.LS.set("mock", draft); } step(); }
      frame({ title: "Mock exam" }, [
        h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Time left" }), clock]),
        A.plate("Question " + (i + 1) + " of " + draft.ids.length, i + " answered", draft.ids.length, function (k) { return k < i ? (draft.answers[k].given ? "done" : "skip") : k === i ? "now" : ""; }, 25),
        ui.el, submit,
        h("button", { class: "linkbtn", type: "button", text: "Skip this question (marked wrong)", onclick: function () { answer(null); } }),
        h("button", { class: "linkbtn", type: "button", text: "Finish the exam now", onclick: function () {
          A.setKids(confirmBox, [h("div", { class: "panel stack" }, [h("p", { text: "Finish now? The " + (draft.ids.length - i) + " questions you have not answered will be marked wrong." }),
            h("div", { class: "row" }, [h("button", { class: "btn quiet", text: "Keep going", onclick: function () { A.setKids(confirmBox, []); } }), h("button", { class: "btn", text: "Finish and mark it", onclick: function () { finishMock(draft, false); } })])])]);
          confirmBox.scrollIntoView({ block: "nearest" }); } }),
        confirmBox]);
      function paint() { var left = (draft.deadline - Date.now()) / 1000; clock.textContent = A.fmtClock(left); clock.className = "clock" + (left < 600 ? " over" : ""); if (left <= 0) finishMock(draft, true); }
      paint(); A.tick(paint, 1000);
    }
    step();
  }
  function finishMock(draft, timedOut) {
    A.stopTick(); A.LS.del("mock");
    var sheet = draft.ids.map(function (id, i) { var q = A.D.byId[id], a = draft.answers[i], given = a ? a.given : null, ok = A.isCorrect(q, given);
      if (a) A.recordAnswer(q, ok); return { q: q, correct: ok, given: given, layout: draft.layouts[i] }; });
    var s = A.summarise(sheet), used = Math.min((Date.now() - draft.started) / 1000, draft.minutes * 60);
    s.kind = "mock"; s.size = draft.size; s.minutes = draft.minutes; s.percent = Math.round(pct(s.correct, s.total) * 10) / 10; s.full = draft.size === 100 && draft.minutes === 120;
    s.unanswered = sheet.filter(function (x) { return !x.given; }).length; s.timed_out = !!timedOut; s.duration_s = Math.round(used); A.addHistory(s);
    var weak = Object.keys(s.by_objective).filter(function (o) { return s.by_objective[o][0] < s.by_objective[o][1]; }).sort(function (a, b) { return s.by_objective[a][0] / s.by_objective[a][1] - s.by_objective[b][0] / s.by_objective[b][1]; }).slice(0, 8);
    var wrong = sheet.filter(function (x) { return !x.correct; });
    frame({ title: "Mock results", tab: "more" }, [
      h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: (s.full ? "Full mock" : "Half mock") + (timedOut ? " · time ran out" : "") }),
        h("div", { class: "score", text: s.percent + "%" }), h("p", { class: "muted", text: s.correct + " of " + s.total + " correct. Time used " + A.fmtClock(used) + ". Unanswered " + s.unanswered + "." })]),
      h("div", { class: "notice " + (s.percent >= TARGET ? "ok" : ""), text: s.percent >= TARGET ? "At or above the " + TARGET + "% target. You need three full mocks in a row at this level." : "Below the " + TARGET + "% target. That is information, not a verdict: the breakdown shows what to fix." }),
      h("h2", { text: "Breakdown per domain" }), A.domainBars(s.by_domain),
      weak.length ? h("div", { class: "panel stack tight" }, [h("h2", { text: "Weakest objectives in this mock" }), h("div", { class: "tbl" }, [h("table", {}, weak.map(function (o) {
        return h("tr", {}, [h("td", { class: "mono", text: o }), h("td", { text: A.objName(o) }), h("td", { class: "n", text: s.by_objective[o][0] + "/" + s.by_objective[o][1] })]); }))])]) : null,
      wrong.length ? h("h2", { text: "Review your " + wrong.length + " wrong answers" }) : null
    ].concat(wrong.map(function (x) {
      var d = h("details", { class: "rev" }, [h("summary", { text: x.q.objective + " · " + x.q.topic + (x.given ? "" : " (not answered)") })]), filled = false;
      d.addEventListener("toggle", function () { if (filled || !d.open) return; filled = true;
        d.appendChild(h("div", { class: "body" }, [h("p", { text: x.q.question }), x.q.exhibit ? A.exhibit(x.q.exhibit) : null, A.reviewUI(x.q, x.given, x.layout)])); });
      return d;
    })).concat([h("button", { class: "btn", text: "Done", onclick: A.moreMenu })]));
  }

  /* ---------- placement test (Phase 1 diagnostic) ---------- */
  A.placementDone = function () { var p = A.LS.get("placement"); return !!(p && p.complete); };
  A.placementMenu = function () {
    var Q = A.D.diagnostic, p = A.LS.get("placement"), inProgress = p && !p.complete && p.answers && p.answers.length;
    if (p && p.complete) return placementResults(p);
    frame({ title: "Placement test", tab: "home", back: A.home, backLabel: "Home" }, [
      h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Phase 1 diagnostic" }), h("h1", { text: "Placement test" }), h("p", { class: "muted", text: "This decides where your study time goes. It cannot be failed." })]),
      h("div", { class: "panel stack" }, [h("ul", { class: "plain" }, [
        h("li", { text: "Part 1: " + Q.length + " questions across all five exam domains. No feedback until the end." }),
        h("li", { text: "Part 2: 10 subnetting questions, each one timed." }),
        h("li", { text: "Allow 45 to 60 minutes. You can stop and carry on later." }),
        h("li", { text: "Closed book. If you do not know, tap \"I don't know\". A lucky guess hides a gap we need to find." }),
        h("li", { text: "You submit each answer by saying how sure you are. Be honest: it makes your plan better." })])]),
      h("button", { class: "btn", text: inProgress ? "Carry on from question " + (p.answers.length + 1) : "Start part 1", onclick: function () {
        if (!inProgress) { p = { complete: false, started: Date.now(), layouts: Q.map(A.newLayout), answers: [] }; A.LS.set("placement", p); }
        runPlacement(p); } })
    ]);
  };
  function runPlacement(p) {
    var Q = A.D.diagnostic;
    function step() {
      var i = p.answers.length;
      if (i >= Q.length) return part2();
      var q = Q[i], layout = p.layouts[i], conf = [];
      var ui = A.questionUI(q, layout, function () { conf.forEach(function (b) { b.disabled = ui.value() === null; }); });
      function submit(c, skipped) {
        var given = skipped ? null : ui.value();
        p.answers.push({ id: q.id, objective: q.objective, domain: q.domain, given: given, skipped: !!skipped, conf: skipped ? 0 : c, correct: A.isCorrect(q, given) });
        A.LS.set("placement", p); step();
      }
      [["Guess", 1], ["Fairly sure", 2], ["Certain", 3]].forEach(function (c) { conf.push(h("button", { class: "btn", type: "button", disabled: true, text: c[0], onclick: function () { if (ui.value() !== null) submit(c[1], false); } })); });
      frame({ title: "Placement test", back: A.home, backLabel: "Pause" }, [
        A.plate("Part 1 · Question " + (i + 1) + " of " + Q.length, i + " answered", Q.length, function (k) { return k < i ? (p.answers[k].skipped ? "skip" : "done") : k === i ? "now" : ""; }, 20),
        ui.el,
        h("p", { class: "small muted", text: "How sure are you? Tapping one submits your answer." }), h("div", { class: "row" }, conf),
        h("button", { class: "linkbtn", type: "button", text: "I don't know (skip)", onclick: function () { submit(0, true); } })]);
    }
    function part2() {
      frame({ title: "Placement test", back: A.home, backLabel: "Pause" }, [
        h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Part 2 of 2" }), h("h1", { text: "Subnetting speed test" }), h("p", { class: "muted", text: "Your part 1 answers are saved. One short section to go." })]),
        h("div", { class: "panel stack" }, [h("ul", { class: "plain" }, [
          h("li", { text: "10 IPv4 questions. The clock starts as each question appears." }),
          h("li", { text: "The exam target is under " + A.GOAL + " seconds each. Do not worry if you are nowhere near it yet." }),
          h("li", { text: "Work in your head or on paper. No calculator, and no hints this time." })])]),
        h("button", { class: "btn", text: "Start the clock", onclick: function () {
          A.runDrill("Placement speed test", A.genV4, 10, { noHints: true, noExit: true, onDone: function (rec) {
            p.subnet = rec ? { total: rec.total, correct: rec.correct, avg_time: rec.avg_time, by_type: rec.by_type } : null;
            finish(); } }); } })]);
    }
    function finish() {
      var by = {}, correct = 0;
      p.answers.forEach(function (a) { var b = by[a.domain] || (by[a.domain] = [0, 0]); b[1]++; if (a.correct) { b[0]++; correct++; } });
      p.complete = true; p.finished = Date.now(); p.total = p.answers.length; p.correct = correct; p.by_domain = by; A.LS.set("placement", p);
      A.cloudPut("placement", p);
      A.addHistory({ kind: "placement", total: p.total, correct: correct, by_domain: by, duration_s: Math.round((p.finished - p.started) / 1000) });
      placementResults(p);
    }
    step();
  }
  A.placementReport = function (p) {
    var tag = function (a) { return a.id + "(obj " + a.objective + ")"; }, L = [];
    L.push("PLACEMENT TEST " + A.localDay(p.finished) + ": " + p.correct + "/" + p.total + " (" + Math.round(pct(p.correct, p.total)) + "%)");
    L.push("By domain: " + Object.keys(DOMAINS).map(function (d) { var b = p.by_domain[d] || [0, 0]; return "D" + d + " " + b[0] + "/" + b[1]; }).join(", "));
    L.push("Wrong: " + (p.answers.filter(function (a) { return !a.correct && !a.skipped; }).map(function (a) { return tag(a) + (a.conf === 3 ? " SURE" : a.conf === 1 ? " guess" : ""); }).join(", ") || "none"));
    L.push("Skipped: " + (p.answers.filter(function (a) { return a.skipped; }).map(tag).join(", ") || "none"));
    L.push("Right by guessing: " + (p.answers.filter(function (a) { return a.correct && a.conf === 1; }).map(tag).join(", ") || "none"));
    L.push("Right, fairly sure: " + (p.answers.filter(function (a) { return a.correct && a.conf === 2; }).map(function (a) { return a.id; }).join(", ") || "none"));
    L.push(p.subnet ? "Subnetting: " + p.subnet.correct + "/" + p.subnet.total + ", avg " + p.subnet.avg_time + "s (" + Object.keys(p.subnet.by_type).map(function (k) { var e = p.subnet.by_type[k]; return k + " " + e.correct + "/" + e.n + " " + (e.time / e.n).toFixed(0) + "s"; }).join(", ") + ")" : "Subnetting: not taken");
    return L.join("\n");
  };
  function placementResults(p) {
    var Q = A.D.diagnostic, sureWrong = p.answers.filter(function (a) { return !a.correct && a.conf === 3; }).length, lucky = p.answers.filter(function (a) { return a.correct && a.conf === 1; }).length;
    var area = h("textarea", { class: "report", id: "placement-report", readonly: true, "aria-label": "Placement results" }), status = h("span", { class: "small muted", role: "status" });
    area.value = A.placementReport(p);
    var wrong = p.answers.map(function (a, i) { return { a: a, q: Q[i], layout: p.layouts[i] }; }).filter(function (x) { return !x.a.correct; });
    frame({ title: "Placement results", tab: "home", back: A.home, backLabel: "Home" }, [
      h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Placement test complete" }), h("div", { class: "score", text: p.correct + " / " + p.total }),
        h("p", { class: "muted", text: Math.round(pct(p.correct, p.total)) + "% across the five domains. This is a starting line, not a verdict." })]),
      A.domainBars(p.by_domain),
      h("div", { class: "panel" }, [h("dl", { class: "facts" }, [
        h("dt", { text: "Certain but wrong (the dangerous ones)" }), h("dd", { text: String(sureWrong) }),
        h("dt", { text: "Right by guessing (treated as gaps)" }), h("dd", { text: String(lucky) }),
        h("dt", { text: "Skipped" }), h("dd", { text: String(p.answers.filter(function (a) { return a.skipped; }).length) }),
        h("dt", { text: "Subnetting correct" }), h("dd", { text: p.subnet ? p.subnet.correct + "/" + p.subnet.total : "-" }),
        h("dt", { text: "Subnetting average (target " + A.GOAL + "s)" }), h("dd", { text: p.subnet ? p.subnet.avg_time.toFixed(1) + "s" : "-" })])]),
      h("h2", { text: "Send the results to your coach" }),
      h("p", { class: "small muted", text: "Copy this and paste it into your chat with Claude. Your study plan is re-weighted from it." }),
      area, h("button", { class: "btn", type: "button", text: "Copy results", onclick: function () { A.copy(area.value, area, status); } }), status,
      wrong.length ? h("h2", { text: "Questions to learn from (" + wrong.length + ")" }) : null
    ].concat(wrong.map(function (x) {
      var d = h("details", { class: "rev" }, [h("summary", { text: x.q.objective + " · " + x.q.topic + (x.a.skipped ? " (skipped)" : x.a.conf === 3 ? " (you were certain)" : "") })]), filled = false;
      d.addEventListener("toggle", function () { if (filled || !d.open) return; filled = true;
        d.appendChild(h("div", { class: "body" }, [h("p", { text: x.q.question }), x.q.exhibit ? A.exhibit(x.q.exhibit) : null, A.reviewUI(x.q, x.a.given, x.layout)])); });
      return d;
    })));
  }
})(window.CCNA);
