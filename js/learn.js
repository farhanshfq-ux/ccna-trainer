/* learn.js: the Learn tab. Each exam objective becomes a short guided lesson:
   the idea, a visual guide, the facts, the commands, how to check, the traps, then explain it back. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame;

  function numbered(text) {
    var items = [];
    String(text).split("\n").forEach(function (l) { var m = l.match(/^\d+\.\s+(.*)/); if (m) items.push(m[1]); else if (items.length && l.trim() && !/^</.test(l.trim())) items[items.length - 1] += " " + l.trim(); });
    return items;
  }
  function parseNote(d) {
    var parts = d.md.split(/\n## /), secs = {}, test = "", qs, ans;
    parts.slice(1).forEach(function (p) { var nl = p.indexOf("\n"); secs[p.slice(0, nl).trim()] = p.slice(nl + 1).trim(); });
    test = secs["Self-test"] || "";
    qs = numbered(test.split("<details>")[0]);
    ans = numbered((test.split("</summary>")[1] || "").split("</details>")[0]);
    return { secs: secs, quote: (parts[0].match(/^> .*$/m) || [""])[0].replace(/^> /, ""), qs: qs, ans: ans };
  }
  A.lessons = function () { return A.D.notes.filter(function (d) { return d.group === "notes"; }); };
  A.lessonDone = function (obj) { return !!(A.ST.learn.done || {})[obj]; };
  A.lessonOrder = function () {                 /* the order the study plan teaches them in */
    var seen = {}, order = [];
    (A.D.plan.weeks || []).forEach(function (w) { w.objectives.forEach(function (o) { if (!seen[o]) { seen[o] = 1; order.push(o); } }); });
    A.lessons().forEach(function (d) { if (!seen[d.objective]) order.push(d.objective); });
    return order;
  };
  A.nextLesson = function () {
    var wk = A.currentWeek(), byObj = {}, pick = null;
    A.lessons().forEach(function (d) { byObj[d.objective] = d; });
    if (wk) wk.objectives.forEach(function (o) { if (!pick && byObj[o] && !A.lessonDone(o)) pick = byObj[o]; });
    if (!pick) A.lessonOrder().forEach(function (o) { if (!pick && byObj[o] && !A.lessonDone(o)) pick = byObj[o]; });
    return pick;
  };

  A.runLesson = function (d, startAt, backTo) {
    var note = parseNote(d), exit = backTo || A.learnMenu, vis = A.visualsFor(d.objective), cards = [], i = startAt || 0, started = Date.now();
    function doc(md) { return h("div", { class: "doc" }, A.md(md || "")); }
    cards.push({ name: "The idea", make: function () { return h("div", { class: "stack" }, [h("div", { class: "lesson-lead" }, A.md(note.secs.Summary || "")), note.quote ? h("p", { class: "small muted", text: note.quote.replace(/\*\*/g, "") }) : null,
      d.objective === "1.3" && A.courseDone("subnet") < A.COURSES[0].chapters.length ? h("div", { class: "notice info stack" }, [h("span", { text: "This lesson is a summary for revision. If subnetting is not clear yet, do the from-scratch course first." }), h("button", { class: "btn", type: "button", text: "Open Subnetting from zero", onclick: function () { A.runCourse("subnet", null, function () { A.runLesson(d, 0, backTo); }); } })]) : null]); } });
    if (vis.length) cards.push({ name: "See it", make: function () { return h("div", { class: "stack" }, [h("p", { text: "Before the detail, see it working. Open " + (vis.length > 1 ? "each guide" : "the guide") + ", step through it, then come back here." }),
      A.modeList(vis.map(function (v) { return { name: v.title, sub: v.sub, go: function () { v.open(function () { A.runLesson(d, i, backTo); }); } }; }))]); } });
    [["Know these", "Key facts and defaults"], ["The commands", "IOS commands"], ["Check your work", "Verification"], ["Exam traps", "Exam traps"], ["On your sites", "On real sites"]].forEach(function (c) {
      if (note.secs[c[1]]) cards.push({ name: c[0], make: function () { return doc(note.secs[c[1]]); } }); });
    if (note.qs.length) cards.push({ name: "Explain it back", make: recall });

    var got = 0, asked = 0;
    function recall() {
      var box = h("div", { class: "stack" });
      function ask(k) {
        if (k >= note.qs.length) { A.setKids(box, [h("div", { class: "notice " + (got === note.qs.length ? "ok" : "info"), text: "You had " + got + " of " + note.qs.length + ". " + (got === note.qs.length ? "Solid." : "The ones you missed are exactly what to re-read before moving on.") })]); return; }
        var answer = h("div", { class: "why-box", hidden: true }, A.md(note.ans[k] || "")), actions = h("div", { class: "stack" });
        A.setKids(actions, [h("button", { class: "btn", type: "button", text: "Show the answer", onclick: function () { answer.hidden = false;
          A.setKids(actions, [h("div", { class: "row" }, [h("button", { class: "btn quiet", type: "button", text: "Not yet", onclick: function () { asked++; ask(k + 1); } }), h("button", { class: "btn", type: "button", text: "I had it", onclick: function () { asked++; got++; ask(k + 1); } })])]); } })]);
        A.setKids(box, [h("span", { class: "eyebrow", text: "Question " + (k + 1) + " of " + note.qs.length }), h("div", { class: "qtext" }, A.md(note.qs[k])), h("p", { class: "small muted", text: "Answer out loud, in your own words, before you look." }), answer, actions]);
      }
      ask(0); return box;
    }
    function finish() {
      var first = !A.lessonDone(d.objective);
      A.ST.learn.done[d.objective] = { d: A.today(), got: got, of: note.qs.length }; A.touch("learn");
      A.addHistory({ kind: "lesson", label: d.objective + " " + d.title.replace(/^[\d.]+\s*/, ""), total: note.qs.length, correct: got, duration_s: Math.round((Date.now() - started) / 1000) });
      var pool = A.D.questions.filter(function (q) { return q.objective === d.objective; }), nxt = A.nextLesson();
      frame({ title: "Lesson complete", tab: "learn" }, [
        h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Objective " + d.objective + (first ? " · first time through" : "") }), h("h1", { text: "Lesson complete" }),
          h("p", { class: "muted", text: "Reading is the easy part. Now prove it: answer some exam-style questions on this topic while it is fresh." })]),
        h("button", { class: "btn", type: "button", text: "5 questions on this topic", onclick: function () { A.runQuiz("Objective " + d.objective, A.pickQ(pool, 5), exit); } }),
        nxt ? h("button", { class: "btn ghost", type: "button", text: "Next lesson: " + nxt.title, onclick: function () { A.runLesson(nxt, 0, backTo); } }) : null,
        h("button", { class: "btn quiet", type: "button", text: "Back to Learn", onclick: exit }),
        h("p", { class: "small muted", text: "Then tell Claude what you learned, in your own words. Explaining it to someone is what makes it stick, and Claude will correct anything you have slightly wrong." })]);
    }
    function paint() {
      var c = cards[i], last = i === cards.length - 1;
      frame({ title: "Objective " + d.objective, back: exit, backLabel: "Leave" }, [
        A.plate((i + 1) + ". " + c.name, (i + 1) + " of " + cards.length, cards.length, function (k) { return k < i ? "done" : k === i ? "now" : ""; }),
        i === 0 ? h("h1", { text: d.title.replace(/^[\d.]+\s*/, "") }) : h("h2", { text: c.name }),
        c.make(),
        h("div", { class: "row" }, [i > 0 ? h("button", { class: "btn quiet", type: "button", text: "Back", onclick: function () { i--; paint(); } }) : null,
          h("button", { class: "btn", type: "button", id: "lesson-next", text: last ? "Finish lesson" : "Next: " + cards[i + 1].name, onclick: function () { if (last) finish(); else { i++; paint(); } } })])]);
    }
    paint();
  };

  A.learnMenu = function () {
    var lessons = A.lessons(), nxt = A.nextLesson(), done = lessons.filter(function (d) { return A.lessonDone(d.objective); }).length, kids = [];
    kids.push(h("div", { class: "stack tight" }, [h("h1", { text: "Learn" }), h("p", { class: "muted", text: "Short lessons that teach before they test: the idea, a picture, the commands, then you explain it back. " + done + " of " + lessons.length + " done." })]));
    var crs = A.COURSES[0], cd = A.courseDone(crs.id), cn = crs.chapters.length;
    if (cd < cn) kids.push(h("button", { class: "hero", type: "button", id: "course-hero", onclick: function () { A.runCourse(crs.id); } }, [h("span", { class: "eyebrow", text: cd ? "Carry on · chapter " + (cd + 1) + " of " + cn : "Start here · no knowledge needed" }), h("span", { class: "hero-title", text: crs.title }),
      h("span", { class: "hero-sub", text: crs.sub + ". " + cn + " short chapters, about 5 minutes each." }), h("span", { class: "hero-go", text: (cd ? "Carry on" : "Start") + " \u203a" })]));
    if (nxt) kids.push(h("button", { class: cd < cn ? "hero alt" : "hero", type: "button", onclick: function () { A.runLesson(nxt); } }, [h("span", { class: "eyebrow", text: "Up next · objective " + nxt.objective }), h("span", { class: "hero-title", text: nxt.title.replace(/^[\d.]+\s*/, "") }),
      h("span", { class: "hero-sub", text: "About 10 minutes. " + (A.visualsFor(nxt.objective).length ? "Includes a visual guide." : "Ends with questions you answer out loud.") }), h("span", { class: "hero-go", text: "Start lesson ›" })]));
    if (cd >= cn) kids.push(A.modeList([{ name: crs.title, sub: "The from-scratch course. Tap to go through it again", badge: "done", done: true, go: function () { A.runCourse(crs.id, 0); } }]));
    kids.push(h("h2", { text: "Visual guides" }));
    kids.push(h("div", { class: "tiles" }, A.VISUALS.map(function (v) { return h("button", { class: "tile", type: "button", onclick: function () { v.open(A.learnMenu); } }, [h("span", { class: "tile-obj mono", text: v.obj.join(" · ") }), h("span", { class: "tile-title", text: v.title }), h("span", { class: "tile-sub", text: v.sub })]); })));
    Object.keys(A.DOMAINS).forEach(function (dom) {
      var set = lessons.filter(function (d) { return String(d.domain) === dom; }), n = set.filter(function (d) { return A.lessonDone(d.objective); }).length; if (!set.length) return;
      kids.push(h("div", { class: "stack tight" }, [h("div", { class: "bar-head" }, [h("h2", { text: dom + ". " + A.DOMAINS[dom][0] }), h("span", { text: n + "/" + set.length })]), h("div", { class: "track" }, [h("div", { class: "fill ok", style: "width:" + A.pct(n, set.length) + "%" })])]));
      kids.push(A.modeList(set.map(function (d) { var v = A.visualsFor(d.objective).length; return { name: d.title, sub: v ? "Lesson with " + (v > 1 ? v + " visual guides" : "a visual guide") : "Lesson", badge: A.lessonDone(d.objective) ? "done" : null, done: true, go: function () { A.runLesson(d); } }; })));
    });
    frame({ title: "Learn", tab: "learn" }, kids);
  };
})(window.CCNA);
