/* progress.js: readiness score, Progress screen, Home screen, the More menu, settings and backup.
   Ported from trainer/dashboard.py. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame, pct = A.pct, DOMAINS = A.DOMAINS, GOAL = A.GOAL, GOAL_ACC = A.GOAL_ACC, TARGET = A.TARGET;

  /* ---------- the numbers ---------- */
  function fullMocks() { return A.hist("mock").filter(function (m) { return m.full; }); }
  function domRows() {
    return Object.keys(DOMAINS).map(function (d) {
      var inD = A.D.questions.filter(function (q) { return String(q.domain) === d; }), st = A.ST.qstats.stats, seen = inD.filter(function (q) { return st[q.id]; }), att = 0, right = 0;
      seen.forEach(function (q) { att += st[q.id].s; right += st[q.id].c; }); var m = seen.filter(function (q) { return st[q.id].l; }).length;
      return { d: d, seen: seen.length, total: inD.length, mastered: m, acc: att ? Math.round(pct(right, att)) + "%" : "-", score: inD.length ? Math.round(100 * m / inD.length) / 10 : 0 };
    });
  }
  A.readiness = function () {
    var parts = [], mocks = fullMocks().slice(-3), bank = 0, sub = A.subnetRecent(), c = A.boxCounts(), n = A.D.flashcards.length;
    parts.push(["Mock exams (last 3 full mocks vs " + TARGET + "%)", mocks.reduce(function (a, m) { return a + Math.min(1, m.percent / TARGET); }, 0) / 3 * 40, 40]);
    domRows().forEach(function (r) { bank += DOMAINS[r.d][1] * (r.total ? r.mastered / r.total : 0); });
    parts.push(["Question bank mastered, weighted by domain", bank / 100 * 25, 25]);
    /* speed only earns credit in proportion to accuracy: fast and wrong is worth nothing */
    parts.push(["Subnetting speed and accuracy", sub.n ? Math.min(1, sub.n / 50) * Math.min(1, sub.accuracy / GOAL_ACC) * (7.5 + Math.min(1, GOAL / Math.max(sub.avg, 0.1)) * 7.5) : 0, 15]);
    parts.push(["Troubleshooting (last 10 scenarios)", Math.min(1, A.scenRecent().solved / 9) * 10, 10]);
    parts.push(["Flashcards in boxes 4 and 5", n ? (c[4] + c[5]) / n * 10 : 0, 10]);
    return { score: parts.reduce(function (a, p) { return a + p[1]; }, 0), parts: parts };
  };
  function checklist() {
    var mocks = fullMocks().slice(-3), sub = A.subnetRecent(), sc = A.scenRecent(), co = A.D.coach || {};
    return [
      [mocks.length === 3 && mocks.every(function (m) { return m.percent >= TARGET; }), "Three full mock exams in a row at " + TARGET + "% or above", mocks.length ? mocks.map(function (m) { return Math.round(m.percent) + "%"; }).join(", ") : "no full mocks yet"],
      [!!(co.total && co.exam_ready === co.total), "Every blueprint objective marked Exam-ready", co.total ? co.exam_ready + " of " + co.total + " lines Exam-ready (your coach updates this)" : "updated by your coach"],
      [sub.n >= 50 && sub.avg < GOAL && sub.accuracy >= GOAL_ACC, "Subnetting under " + GOAL + "s average with " + GOAL_ACC + "%+ accuracy", sub.n ? "last " + sub.n + " answers: " + Math.round(sub.accuracy) + "% correct, " + sub.avg.toFixed(1) + "s average" + (sub.n < 50 ? " (50 answers needed)" : "") : "no drills yet"],
      [co.capstones_done >= 3, "Every capstone lab completed without the solution", (co.capstones_done || 0) + " of 3 done (your coach updates this)"],
      [sc.n >= 10 && sc.solved >= 9, "9 out of 10 troubleshooting scenarios solved", sc.n ? sc.solved + " solved of the last " + sc.n : "none attempted yet"]];
  }
  function weakTopics() {
    var topics = {}, st = A.ST.qstats.stats, k;
    for (k in st) { var q = A.D.byId[k]; if (!q) continue; var key = q.objective + "|" + q.topic, e = topics[key] || (topics[key] = [0, 0]); e[0] += st[k].c; e[1] += st[k].s; }
    return Object.keys(topics).filter(function (t) { return topics[t][1] >= 2 && topics[t][0] < topics[t][1]; })
      .sort(function (a, b) { return topics[a][0] / topics[a][1] - topics[b][0] / topics[b][1] || topics[b][1] - topics[a][1]; }).slice(0, 10).map(function (t) { return { obj: t.split("|")[0], topic: t.split("|")[1], right: topics[t][0], seen: topics[t][1] }; });
  }
  A.report = function () {
    var rd = A.readiness(), sub = A.subnetRecent(), sc = A.scenRecent(), L = [], p = A.LS.get("placement"), kinds = {};
    L.push("CCNA POCKET TRAINER REPORT " + A.today() + " (day streak " + A.streak() + ")");
    L.push("Readiness " + Math.round(rd.score) + "/100 (" + rd.parts.map(function (x) { return x[1].toFixed(1) + "/" + x[2]; }).join(", ") + ")");
    L.push("Domains (seen/total, accuracy, /10): " + domRows().map(function (x) { return "D" + x.d + " " + x.seen + "/" + x.total + " " + x.acc + " " + x.score; }).join("; "));
    L.push("Subnetting last " + sub.n + ": " + (sub.n ? Math.round(sub.accuracy) + "% correct, " + sub.avg.toFixed(1) + "s avg" : "none"));
    A.hist("subnet").slice(-5).forEach(function (r) { Object.keys(r.by_type || {}).forEach(function (k) { var e = kinds[k] || (kinds[k] = [0, 0, 0]); e[0] += r.by_type[k].correct; e[1] += r.by_type[k].n; e[2] += r.by_type[k].time; }); });
    if (Object.keys(kinds).length) L.push("  by type (last 5 drills): " + Object.keys(kinds).sort().map(function (k) { return k + " " + kinds[k][0] + "/" + kinds[k][1] + " " + (kinds[k][2] / kinds[k][1]).toFixed(0) + "s"; }).join(", "));
    L.push("Full mocks: " + (fullMocks().slice(-5).map(function (m) { return Math.round(m.percent) + "%"; }).join(", ") || "none"));
    L.push("Troubleshooting: " + sc.solved + " solved of last " + sc.n);
    var failed = []; A.hist("troubleshoot").slice(-3).forEach(function (r) { (r.results || []).forEach(function (x) { if (!x.solved) failed.push(x.id + "(" + x.topic + ")"); }); });
    if (failed.length) L.push("  recent unsolved: " + failed.slice(-8).join(", "));
    L.push("Flashcard boxes (new,1-5): " + A.boxCounts().join(","));
    var ld = A.ST.learn.done || {}; L.push("Lessons done (self-test score): " + (Object.keys(ld).sort().map(function (o) { return o + " " + ld[o].got + "/" + ld[o].of; }).join(", ") || "none"));
    var weak = weakTopics(); L.push("Weakest topics: " + (weak.map(function (t) { return t.obj + " " + t.topic + " " + t.right + "/" + t.seen; }).join("; ") || "n/a"));
    var wrong = []; A.H.filter(function (r) { return r.kind === "quiz" || r.kind === "mock"; }).slice(-6).forEach(function (r) { wrong = wrong.concat(r.wrong_ids || []); });
    if (wrong.length) L.push("Recent wrong question ids: " + wrong.slice(-40).join(", "));
    L.push("Last activities: " + (A.H.slice(-8).map(function (x) { return x.ts.slice(5, 16).replace("T", " ") + " " + x.kind + " " + (x.correct != null ? x.correct : x.solved) + "/" + x.total; }).join("; ") || "none"));
    if (p && p.complete) L.push(A.placementReport(p));
    return L.join("\n");
  };

  /* ---------- Progress screen ---------- */
  A.progress = function () {
    var rd = A.readiness(), rows = domRows(), weak = weakTopics(), drills = A.hist("subnet").slice(-12), mocks = A.hist("mock").slice(-6);
    var area = h("textarea", { class: "report", id: "report", readonly: true, "aria-label": "Report for your coach" }), status = h("span", { class: "small muted", role: "status" });
    area.value = A.report();
    var maxT = Math.max(GOAL * 1.5, Math.max.apply(null, drills.map(function (d) { return d.avg_time; }).concat([0])));
    frame({ title: "Progress", tab: "more", back: A.moreMenu, backLabel: "More" }, [
      h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Readiness score" }), h("div", { class: "score", text: Math.round(rd.score) + " / 100" }), h("div", { class: "track" }, [h("div", { class: "fill", style: "width:" + rd.score + "%" })])]),
      h("div", { class: "panel" }, [h("dl", { class: "facts" }, [].concat.apply([], rd.parts.map(function (p) { return [h("dt", { text: p[0] }), h("dd", { text: p[1].toFixed(1) + " / " + p[2] })]; })))]),
      h("h2", { text: "Scores per domain" }),
      h("div", { class: "panel bars" }, rows.map(function (x) { return h("div", { class: "stack tight" }, [h("div", { class: "bar-head" }, [h("span", { text: x.d + ". " + DOMAINS[x.d][0] }), h("span", { text: x.score.toFixed(1) + " / 10" })]),
        h("div", { class: "track" }, [h("div", { class: "fill", style: "width:" + x.score * 10 + "%" })]), h("span", { class: "small muted mono", text: "seen " + x.seen + "/" + x.total + " · accuracy " + x.acc + " · weight " + DOMAINS[x.d][1] + "%" })]); })),
      h("p", { class: "small muted", text: "Score out of 10 = share of the domain's questions you answered correctly the last time you saw them. Unseen questions count as zero, so it rewards coverage as well as accuracy." }),
      h("h2", { text: "Weakest topics" }),
      weak.length ? h("div", { class: "panel tbl" }, [h("table", {}, weak.map(function (t) { return h("tr", {}, [h("td", { class: "mono", text: t.obj }), h("td", { text: t.topic }), h("td", { class: "n", text: t.right + "/" + t.seen })]); }))]) : h("p", { class: "muted small", text: "Not enough answers yet. A topic needs two or more attempts." }),
      h("h2", { text: "Subnetting speed trend" }),
      drills.length ? h("div", { class: "panel stack" }, [
        h("div", { class: "trend-wrap" }, [h("div", { class: "trend", role: "img", "aria-label": "Average seconds per question for the last " + drills.length + " drills" }, drills.map(function (d) {
          return h("div", { class: "col" + (d.avg_time <= GOAL ? " ok" : ""), style: "height:" + Math.max(4, 100 * d.avg_time / maxT) + "%", title: d.avg_time + "s" }); })),
          h("div", { class: "trend-goal", style: "bottom:" + (100 * GOAL / maxT) + "%", text: GOAL + "s target" })]),
        h("div", { class: "tbl" }, [h("table", {}, [h("tr", {}, [h("th", { text: "Date" }), h("th", { text: "Drill" }), h("th", { class: "n", text: "Score" }), h("th", { class: "n", text: "Avg" })])].concat(drills.slice(-6).map(function (d) {
          return h("tr", {}, [h("td", { class: "mono", text: A.localDay(d.ts).slice(5) }), h("td", { text: d.mode }), h("td", { class: "n", text: d.correct + "/" + d.total }), h("td", { class: "n " + (d.avg_time <= GOAL ? "t-ok" : ""), text: d.avg_time.toFixed(1) + "s" })]); })))])]) : h("p", { class: "muted small", text: "No drills yet." }),
      h("h2", { text: "Mock exams" }),
      mocks.length ? h("div", { class: "panel tbl" }, [h("table", {}, mocks.map(function (m) { return h("tr", {}, [h("td", { class: "mono", text: A.localDay(m.ts) }), h("td", { text: m.full ? "full" : "half" }), h("td", { class: "n", text: m.correct + "/" + m.total }), h("td", { class: "n " + (m.percent >= TARGET ? "t-ok" : ""), text: m.percent + "%" })]); }))]) : h("p", { class: "muted small", text: "None taken yet. Mocks belong in the last few weeks." }),
      h("h2", { text: "Pass with flying colours checklist" }),
      h("div", { class: "panel stack" }, checklist().map(function (c) { return h("div", { class: "check" }, [h("span", { class: "box " + (c[0] ? "t-ok" : ""), text: c[0] ? "[x]" : "[ ]" }), h("div", { class: "stack tight" }, [h("span", { text: c[1] }), h("span", { class: "small muted", text: c[2] })])]); })),
      h("h2", { text: "Report for your coach" }),
      h("p", { class: "small muted", text: A.cloud ? "Your scores are saved to your Claude account, so Claude can read them. This copy is a backup." : "Your scores stay on this phone, so Claude cannot see them. Copy this and paste it into the chat at the start of each session." }),
      area, h("button", { class: "btn", type: "button", text: "Copy report", onclick: function () { A.copy(area.value, area, status); } }), status
    ]);
  };

  /* ---------- Home ---------- */
  function currentWeek() { return A.currentWeek(); }
  function suggested() {
    var steps = [], wk = currentWeek(), day = new Date().getDay(), weekend = day === 0 || day === 6, all = A.D.questions;
    var p = A.LS.get("placement"), due = A.dueCards().length, fresh = A.D.flashcards.filter(function (k) { return !A.ST.cards.cards[k.id]; }).length;
    if (!A.placementDone()) steps.push({ name: "Placement test", sub: p && p.answers && p.answers.length ? "Carry on from question " + (p.answers.length + 1) : "40 questions plus a subnetting speed test. Do this first", go: A.placementMenu });
    var lesson = A.nextLesson(), crs = A.COURSES[0], cd = A.courseDone(crs.id);
    if (cd < crs.chapters.length) steps.push({ name: crs.title + ": chapter " + (cd + 1) + " of " + crs.chapters.length, sub: crs.chapters[cd].t + ". About 5 minutes", done: A.doneToday("course"), go: function () { A.runCourse(crs.id, null, A.home); } });
    else if (lesson) steps.push({ name: "Learn: " + lesson.title.replace(/^[\d.]+\s*/, ""), sub: "Step-by-step lesson" + (A.visualsFor(lesson.objective).length ? " with a visual guide" : "") + ", about 10 minutes", done: A.doneToday("lesson"), go: function () { A.runLesson(lesson, 0, A.home); } });
    steps.push({ name: "Flashcards", sub: due ? due + " due today" : fresh ? "20 new cards" : "Nothing due today", done: A.doneToday("flashcards"), go: function () { A.cardsToday(A.home); } });
    var mix = wk && wk.n >= 6 ? ["Everything mixed", A.genAll, 15] : ["IPv4 mixed", A.genV4, 10];
    steps.push({ name: "Subnetting drill", sub: mix[2] + " timed questions", done: A.doneToday("subnet"), go: function () { A.runDrill(mix[0], mix[1], mix[2], { backTo: A.home }); } });
    var objs = wk ? wk.objectives.filter(function (o) { return all.some(function (q) { return q.objective === o; }); }) : [];
    if (objs.length) steps.push({ name: "Quiz on this week's topic", sub: "10 questions on " + objs.join(", "), done: A.doneToday("quiz"), go: function () {
      A.runQuiz("Week " + wk.n + ": " + objs.join(", "), A.pickQ(all.filter(function (q) { return objs.indexOf(q.objective) >= 0; }), 10), A.home); } });
    else steps.push({ name: "Mixed quiz", sub: "10 questions, weighted like the exam", done: A.doneToday("quiz"), go: function () { A.runQuiz("Mixed quiz (10)", A.pickByWeight(all, 10), A.home); } });
    if (wk && wk.n >= 17 && weekend) steps.push({ name: "Full mock exam", sub: "100 questions, 120 minutes", done: A.doneToday("mock"), go: A.mockMenu });
    else if (weekend) steps.push({ name: "Troubleshooting scenario", sub: "Weekend: one broken network", done: A.doneToday("troubleshoot"), go: function () { A.runScenarios(A.pickScenarios(1), A.home); } });
    return steps.map(function (s) { if (s.done) { s.badge = "done"; } return s; });
  }
  A.home = function () {
    var rd = A.readiness(), wk = currentWeek(), co = A.D.coach || {}, streak = A.streak(), t = A.today();
    var days = A.daysToExam(), plan = A.D.plan, wn = A.weekNumber(), needDates = !A.settings.exam || !A.settings.start;
    var iosTab = !A.hosted && /iphone|ipad|ipod/i.test(navigator.userAgent) && !navigator.standalone && !A.LS.get("hide-install-tip");
    var R = 34, C = 2 * Math.PI * R, ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ring.setAttribute("viewBox", "0 0 80 80"); ring.setAttribute("class", "ring"); ring.setAttribute("role", "img"); ring.setAttribute("aria-label", "Readiness " + Math.round(rd.score) + " out of 100");
    ring.innerHTML = '<circle cx="40" cy="40" r="' + R + '" class="ring-bg"/><circle cx="40" cy="40" r="' + R + '" class="ring-fg" opacity="' + (rd.score < 0.5 ? 0 : 1) + '" stroke-dasharray="' + (C * Math.min(100, rd.score) / 100).toFixed(1) + " " + C.toFixed(1) + '" transform="rotate(-90 40 40)"/><text x="40" y="46" text-anchor="middle" class="ring-num">' + Math.round(rd.score) + "</text>";
    var when = wk ? "Week " + wk.n + " of " + plan.weeks.length + " \u00b7 " + wk.title : needDates ? "Set your dates below to see your plan" : wn === 0 ? "Study starts " + A.niceDate(A.settings.start) : "Final stretch: weak spots and mock exams";
    frame({ title: "CCNA 200-301 v2.0", tab: "home" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Today" }), h("p", { class: "muted", text: when })]),
      !A.storageOK ? h("div", { class: "notice", text: "This browser is not saving your progress (private browsing, or storage is full). Open the app from your Home Screen icon." }) : null,
      iosTab ? h("div", { class: "notice info" }, [h("span", { text: "For offline use, tap the Share button in Safari, then \"Add to Home Screen\", and always open the app from that icon. Progress made in this Safari tab does not carry over to the icon. " }),
        h("button", { class: "linkbtn", type: "button", text: "Hide this", onclick: function () { A.LS.set("hide-install-tip", 1); A.home(); } })]) : null,
      h("div", { class: "stats" }, [
        h("div", { class: "stat centre" }, [ring, h("span", { class: "lbl", text: "Readiness" })]),
        h("div", { class: "stat" }, [h("span", { class: "num", text: String(streak) }), h("span", { class: "lbl", text: "Day streak" })]),
        h("div", { class: "stat" }, [h("span", { class: "num", text: days === null ? "\u2013" : String(Math.max(0, days)) }), h("span", { class: "lbl", text: "Days to exam" })])]),
      needDates ? h("div", { class: "panel stack" }, [h("h2", { text: "Set up your plan" }), h("p", { class: "small muted", text: "Enter your exam date and the Monday you start studying. They are stored on this phone only." }), A.datesForm(A.home)]) : null,
      h("h2", { text: "Today's session: learn, practise, check" }),
      h("div", { class: "path" }, suggested().map(function (s, k) { return h("button", { class: "path-step" + (s.done ? " done" : ""), type: "button", onclick: s.go }, [h("span", { class: "path-num", text: s.done ? "\u2713" : String(k + 1) }),
        h("span", { class: "txt" }, [h("span", { class: "name", text: s.name }), h("span", { class: "sub", text: s.sub })]), h("span", { class: "chev", text: "\u203a" })]); })),
      wk && wk.lab ? h("p", { class: "small muted", text: "This week's hands-on: " + wk.lab + ". Do it in the chat with Claude: type \"lab\" there." }) : null,
      co.focus ? h("div", { class: "panel stack tight" }, [h("span", { class: "eyebrow", text: "From your coach" + (co.updated ? " · " + co.updated : "") }), h("p", { text: String(co.focus) }), co.next ? h("p", { class: "small muted", text: "Next: " + String(co.next) }) : null]) : null
    ]);
  };

  /* ---------- More ---------- */
  A.moreMenu = function () {
    var solved = A.D.scenarios.filter(function (s) { var e = A.ST.scen.stats[s.id]; return e && e.l; }).length, notes = A.D.notes.filter(function (d) { return d.group === "notes"; }).length;
    frame({ title: "More", tab: "more" }, [
      h("h1", { text: "More" }),
      A.modeList([
        { name: "Troubleshoot", sub: A.D.scenarios.length + " broken networks. " + solved + " solved", go: A.troubleMenu },
        { name: "Mock exam", sub: "100 questions, 120 minutes", badge: A.LS.get("mock") ? "in progress" : null, go: A.mockMenu },
        { name: "Notes", sub: "Search every note, the blueprint, the plan and the labs", go: function () { A.notesMenu(); } },
        { name: "Progress", sub: "Domain scores, weakest topics, speed trend", go: A.progress }]),
      A.modeList([
        { name: "Placement test", sub: A.placementDone() ? "Completed. View your results" : "Phase 1 diagnostic", go: A.placementMenu },
        { name: "Settings and backup", sub: "Dark mode, back up or restore your progress", go: A.settingsMenu }])
    ]);
  };
  A.datesForm = function (after) {
    var exam = h("input", { class: "answer", id: "set-exam", type: "date", "aria-label": "Exam date" }), start = h("input", { class: "answer", id: "set-start", type: "date", "aria-label": "Study start date" }), msg = h("span", { class: "small t-bad", role: "status" });
    exam.value = A.settings.exam || ""; start.value = A.settings.start || "";
    return h("form", { class: "stack", onsubmit: function (e) { e.preventDefault();
      if (!exam.value || !start.value) { msg.textContent = "Fill in both dates."; return; }
      if (exam.value <= start.value) { msg.textContent = "The exam date must be after the start date."; return; }
      A.settings.exam = exam.value; A.settings.start = start.value; A.LS.set("settings", A.settings); A.toast("Dates saved"); after(); } },
      [h("label", { class: "fld" }, ["Exam date", exam]), h("label", { class: "fld" }, ["Study start date (a Monday)", start]), msg, h("button", { class: "btn", type: "submit", text: "Save dates" })]);
  };
  A.settingsMenu = function () {
    var status = h("span", { class: "small muted", role: "status" }), offline = h("span", { class: "small muted", text: "Checking offline copy..." }), confirmBox = h("div"), restoreBox = h("div");
    var paste = h("textarea", { class: "report", id: "restore-text", placeholder: "Paste a backup here", "aria-label": "Backup to restore", autocapitalize: "none", autocorrect: "off", spellcheck: "false" });
    function themeBtn(v, label) { return h("button", { class: "btn " + (A.settings.theme === v ? "" : "quiet"), type: "button", text: label, "aria-pressed": String(A.settings.theme === v), onclick: function () { A.settings.theme = v; A.LS.set("settings", A.settings); A.applyTheme(); A.settingsMenu(); } }); }
    function backupText() { var data = {}; A.STATE_KEYS.concat(["mock"]).forEach(function (k) { var v = A.LS.get(k); if (v != null) data[k] = v; }); return JSON.stringify({ app: "ccna-pocket-trainer", v: 1, exported: new Date().toISOString(), data: data }); }
    if (A.hosted) offline.textContent = "This copy needs a connection. The installable version works offline.";
    else if (window.caches && caches.keys) caches.keys().then(function (keys) { offline.textContent = keys.some(function (k) { return k.indexOf("ccna-trainer") === 0; }) ? "Offline copy: saved on this phone. The app works with no signal." : "Offline copy: not saved yet. Open the app once with a connection."; }, function () { offline.textContent = "Offline copy: could not be checked."; });
    else offline.textContent = "Offline copy: not supported in this browser.";
    frame({ title: "Settings", tab: "more", back: A.moreMenu, backLabel: "More" }, [
      h("h1", { text: "Settings and backup" }),
      A.hosted ? h("div", { class: "notice info", text: "You are using the copy inside Claude. Your scores are saved on this phone and mirrored to your Claude account, so your coach can read them. Light or dark follows your Claude setting. To reset your scores, ask Claude." }) : null,
      A.hosted ? null : h("h2", { text: "Appearance" }), A.hosted ? null : h("div", { class: "row" }, [themeBtn("auto", "Auto"), themeBtn("light", "Light"), themeBtn("dark", "Dark")]),
      h("h2", { text: "Your dates" }), A.datesForm(A.settingsMenu),
      h("h2", { text: "Back up your progress" }),
      h("p", { class: "small muted", text: "Everything is stored on this phone only. Copy a backup now and then and keep it in Notes or email it to yourself. If you change phone or the data is cleared, paste it back in below." }),
      h("button", { class: "btn", type: "button", text: "Copy backup", onclick: function () { var t = backupText(); paste.value = t; A.copy(t, A.hosted ? null : paste, status); } }), status,
      A.hosted ? null : h("h2", { text: "Restore from a backup" }), A.hosted ? null : paste,
      A.hosted ? null : h("button", { class: "btn ghost", type: "button", text: "Restore this backup", onclick: function () {
        var obj; try { obj = JSON.parse(paste.value); } catch (e) { obj = null; }
        if (!obj || obj.app !== "ccna-pocket-trainer" || !obj.data) { A.setKids(restoreBox, [h("div", { class: "notice", text: "That is not a valid backup. Paste the whole text exactly as it was copied." })]); return; }
        A.setKids(restoreBox, [h("div", { class: "panel stack" }, [h("p", { text: "Replace the progress on this phone with the backup from " + String(obj.exported).slice(0, 10) + "?" }),
          h("div", { class: "row" }, [h("button", { class: "btn quiet", text: "Cancel", onclick: function () { A.setKids(restoreBox, []); } }),
            h("button", { class: "btn", text: "Replace", onclick: function () { A.STATE_KEYS.concat(["mock"]).forEach(function (k) { if (obj.data[k] != null) A.LS.set(k, obj.data[k]); else A.LS.del(k); }); A.loadState(); A.toast("Progress restored"); A.home(); } })])])]); } }),
      restoreBox,
      A.hosted ? null : h("h2", { text: "Start again" }),
      A.hosted ? null : h("button", { class: "btn danger", type: "button", text: "Erase all progress on this phone", onclick: function () {
        A.setKids(confirmBox, [h("div", { class: "panel stack" }, [h("p", { text: "Erase every score, flashcard box and the placement test result? This cannot be undone unless you have a backup." }),
          h("div", { class: "row" }, [h("button", { class: "btn quiet", text: "Keep my progress", onclick: function () { A.setKids(confirmBox, []); } }),
            h("button", { class: "btn danger", text: "Erase everything", onclick: function () { A.STATE_KEYS.concat(["mock"]).forEach(A.LS.del); A.loadState(); A.toast("Progress erased"); A.home(); } })])])]); confirmBox.scrollIntoView({ block: "nearest" }); } }),
      confirmBox,
      h("h2", { text: "About" }),
      h("div", { class: "panel stack tight" }, [
        h("p", { class: "small", text: "CCNA Pocket Trainer for the Cisco 200-301 v2.0 exam. " + A.D.questions.length + " questions, " + A.D.flashcards.length + " flashcards, " + A.D.scenarios.length + " scenarios. Content version " + (A.D.plan.built || "") + "." }),
        offline,
        h("p", { class: "small muted", text: "All questions, notes and scenarios are original and written for this course. The objectives come from Cisco's official v2.0 exam topics. The rest has not been checked line by line against Cisco documentation: if something disagrees with official Cisco material, trust Cisco. Not affiliated with or endorsed by Cisco." })])
    ]);
  };
})(window.CCNA);
