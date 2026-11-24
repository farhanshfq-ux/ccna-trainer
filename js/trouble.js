/* trouble.js: the troubleshooting simulator. Ported from trainer/troubleshoot.py.
   The fix checker accepts IOS-style abbreviations: keywords may be shortened to two or more letters,
   but values (numbers, addresses, interface numbers) must match exactly. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame, shuffle = A.shuffle, range = A.range;

  var IFN = [["tengigabitethernet", 2], ["gigabitethernet", 1], ["fastethernet", 1], ["port-channel", 2], ["loopback", 2], ["ethernet", 1], ["serial", 1], ["vlan", 2]], WORDS = {};
  IFN.forEach(function (p) { for (var n = p[1]; n <= p[0].length; n++) if (!WORDS[p[0].slice(0, n)]) WORDS[p[0].slice(0, n)] = p[0]; });
  var IFRE = new RegExp("\\b(" + Object.keys(WORDS).sort(function (a, b) { return b.length - a.length; }).map(function (w) { return w.replace(/-/g, "\\-"); }).join("|") + ")\\s?(\\d+(?:/\\d+)*(?:\\.\\d+)?)", "g");
  function normCmd(c) {
    /* iPhone keyboards like to swap in curly quotes and long dashes: undo that first */
    var t = String(c).replace(/[‐-―]/g, "-").replace(/[‘’]/g, "'").trim().toLowerCase().replace(/\s+/g, " ");
    t = t.replace(/^[\w\-]*(\([\w\-]+\))?[#>]\s*/, "").replace(/^do\s+/, "");
    return t.replace(IFRE, function (m, a, b) { return WORDS[a] + b; });
  }
  A.cmdMatch = function (typed, required) {
    var a = normCmd(typed).split(" "), b = normCmd(required).split(" ");
    if (a.length !== b.length || !a[0]) return false;
    for (var i = 0; i < a.length; i++) { if (a[i] === b[i]) continue; if (/\d/.test(b[i])) return false; if (a[i].length >= 2 && b[i].indexOf(a[i]) === 0) continue; return false; }
    return true;
  };
  function fixRight(lines, groups) { var missing = []; groups.forEach(function (g) { if (!lines.some(function (l) { return g.some(function (alt) { return A.cmdMatch(l, alt); }); })) missing.push(g[0]); }); return missing; }

  A.scenRecent = function () { var r = []; A.hist("troubleshoot").forEach(function (x) { r = r.concat(x.results || []); }); r = r.slice(-10); return { n: r.length, solved: r.filter(function (x) { return x.solved; }).length }; };
  A.pickScenarios = function (n) {
    return shuffle(A.D.scenarios.map(function (s) { var e = A.ST.scen.stats[s.id]; return [(!e ? 0 : !e.l ? 1 : 2 + (e.s || 0)) + Math.random() * 0.9, s]; }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, n).map(function (x) { return x[1]; }));
  };
  A.troubleMenu = function () {
    var all = A.D.scenarios, solved = all.filter(function (s) { var e = A.ST.scen.stats[s.id]; return e && e.l; }).length;
    frame({ title: "Troubleshoot", tab: "more", back: A.moreMenu, backLabel: "More" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Troubleshooting simulator" }), h("p", { class: "muted", text: all.length + " broken networks, each with one hidden fault. Read the ticket, run show commands, name the root cause, then type the fix. Solved so far: " + solved + " of " + all.length + "." })]),
      A.modeList([{ name: "One scenario", sub: "About 5 to 10 minutes", go: function () { A.runScenarios(A.pickScenarios(1)); } }, { name: "Set of 5", sub: "A weekend session", go: function () { A.runScenarios(A.pickScenarios(5)); } },
                  { name: "Set of 10", sub: "The exam-ready test: 9 out of 10 needed", go: function () { A.runScenarios(A.pickScenarios(10)); } }])
    ]);
  };
  A.runScenarios = function (list, backTo) {
    var i = 0, results = [], started = Date.now(), exit = backTo || A.troubleMenu;
    function done() {
      if (!results.length) return exit();
      var solved = results.filter(function (r) { return r.solved; }).length;
      A.addHistory({ kind: "troubleshoot", total: results.length, solved: solved, results: results, duration_s: Math.round((Date.now() - started) / 1000) });
      frame({ title: "Results", tab: "more" }, [
        h("div", { class: "stack tight" }, [h("div", { class: "score", text: solved + " / " + results.length }), h("p", { class: "muted", text: "Solved means root cause AND fix both right. Exam-ready target: 9 out of 10." })]),
        h("div", { class: "panel tbl" }, [h("table", {}, [h("tr", {}, [h("th", { text: "Scenario" }), h("th", { text: "Cause" }), h("th", { text: "Fix" })])].concat(results.map(function (r) {
          return h("tr", {}, [h("td", { text: r.title }), h("td", { class: r.cause_ok ? "t-ok" : "t-bad", text: r.cause_ok ? "yes" : "no" }), h("td", { class: r.fix_ok ? "t-ok" : "t-bad", text: r.fix_ok ? (r.self_marked ? "yes*" : "yes") : "no" })]); })))]),
        results.some(function (r) { return r.self_marked; }) ? h("p", { class: "small muted", text: "* fix marked correct by you, not by the checker." }) : null,
        h("button", { class: "btn", text: "Done", onclick: exit })]);
    }
    function step() {
      if (i >= list.length) return done();
      var s = list[i], viewed = {}, hints = 0, begin = Date.now();
      function ticket() {
        var outBox = h("div", { class: "stack" }), hintBox = h("div", { class: "stack" }), cmdBox = h("div", { class: "modes" }), warnBox = h("div");
        function paintCmds() { A.setKids(cmdBox, s.outputs.map(function (o, k) {
          return h("button", { class: "mode", type: "button", onclick: function () { viewed[k] = 1; paintCmds(); A.setKids(warnBox, []); A.setKids(outBox, [A.exhibit(o.text, o.device + "# " + o.command, true)]); outBox.scrollIntoView({ block: "nearest" }); } },
            [h("span", { class: "txt" }, [h("span", { class: "name mono small", text: o.device + "# " + o.command })]), viewed[k] ? h("span", { class: "badge", text: "viewed" }) : null, h("span", { class: "chev", text: "›" })]); })); }
        paintCmds();
        frame({ title: "Scenario " + (i + 1) + " of " + list.length, back: done, backLabel: "Finish" }, [
          h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Fault ticket" }), h("h1", { text: s.title }), h("p", { text: s.situation })]),
          h("h2", { text: "Show commands you can run" }), cmdBox, outBox, hintBox,
          h("button", { class: "linkbtn", type: "button", text: "Give me a hint", onclick: function () { var hs = s.hints || [];
            hintBox.appendChild(h("div", { class: "notice info", text: hints < hs.length ? "Hint " + (hints + 1) + ": " + hs[hints] : "No more hints. Compare the outputs line by line against what the ticket says should be true." })); hints++; } }),
          warnBox,
          h("button", { class: "btn", type: "button", text: "I know the fault", onclick: function () {
            if (!Object.keys(viewed).length) { A.setKids(warnBox, [h("div", { class: "notice", text: "Look at some output first. Guessing is not troubleshooting." })]); return; } diagnose(); } })]);
      }
      function diagnose() {
        var order = shuffle(range(s.causes.length)), picked = null, list3 = h("div", { class: "stack" });
        var cli = h("textarea", { class: "cli", id: "fix-cli", rows: "5", autocapitalize: "none", autocorrect: "off", autocomplete: "off", spellcheck: "false", "aria-label": "Fix commands, one per line", placeholder: "interface g0/1\nno shutdown" });
        var submit = h("button", { class: "btn", type: "button", text: "Submit diagnosis and fix", disabled: true, onclick: function () { mark(picked, cli.value.split("\n").map(function (l) { return l.trim(); }).filter(Boolean)); } });
        order.forEach(function (idx) { list3.appendChild(h("button", { class: "opt", type: "button", "aria-pressed": "false", onclick: function (e) { picked = idx;
          Array.prototype.forEach.call(list3.children, function (b) { b.setAttribute("aria-pressed", "false"); b.querySelector(".mark").textContent = ""; });
          var b = e.currentTarget; b.setAttribute("aria-pressed", "true"); b.querySelector(".mark").textContent = "✓"; submit.disabled = false; } }, [h("span", { class: "mark" }), h("span", { class: "txt", text: s.causes[idx] })])); });
        frame({ title: "Diagnosis", back: ticket, backLabel: "Outputs" }, [
          h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: s.title }), h("h2", { text: "1. What is the root cause?" })]), list3,
          h("div", { class: "stack tight" }, [h("h2", { text: "2. Type the fix on " + (s.fix_device || "the device") }),
            h("p", { class: "small muted", text: "One command per line, starting from global configuration mode. Include interface or router lines where they matter. Abbreviations are fine." })]),
          cli, submit]);
      }
      function mark(pick, lines) {
        var causeOk = pick === s.answer, missing = fixRight(lines, s.fix_required), fixOk = !missing.length, selfMarked = false, notes = s.cause_notes || [], override = h("div");
        function finish() {
          var r = { id: s.id, title: s.title, cause_ok: causeOk, fix_ok: fixOk, solved: causeOk && fixOk, hints: hints, self_marked: selfMarked, elapsed: Math.round((Date.now() - begin) / 1000), objective: s.objective, topic: s.topic };
          results.push(r); var e = A.ST.scen.stats[s.id] || (A.ST.scen.stats[s.id] = { a: 0, s: 0 }); e.a++; e.s += r.solved ? 1 : 0; e.l = r.solved ? 1 : 0; A.touch("scen"); i++; step();
        }
        if (causeOk && !fixOk && lines.length) A.setKids(override, [h("div", { class: "panel stack" }, [h("p", { class: "small", text: "The checker is strict. If your commands would genuinely have fixed it another valid way, you may overrule it. Be honest: the exam will not negotiate." }),
          h("button", { class: "btn quiet", type: "button", text: "My fix was fully equivalent", onclick: function () { fixOk = true; selfMarked = true; A.setKids(override, [h("p", { class: "small t-ok", text: "Marked correct by you." })]); } })])]);
        frame({ title: "Marking" }, [
          h("span", { class: "eyebrow", text: s.title }),
          h("div", { class: "rv " + (causeOk ? "ok" : "bad") }, [h("span", { class: "tagline " + (causeOk ? "t-ok" : "t-bad"), text: causeOk ? "Root cause: correct" : "Root cause: incorrect" }), h("span", { text: s.causes[s.answer] }),
            !causeOk ? h("span", { class: "why", text: "You chose: " + s.causes[pick] + (notes[pick] ? ". Why not: " + notes[pick] : "") }) : null]),
          h("div", { class: "rv " + (fixOk ? "ok" : "bad") }, [h("span", { class: "tagline " + (fixOk ? "t-ok" : "t-bad"), text: fixOk ? "Fix: correct" : "Fix: not matched" }),
            !fixOk ? h("span", { class: "why", text: "Missing or different: " + missing.join("; ") }) : null]),
          override,
          A.exhibit(s.fix_model.join("\n"), "Model fix on " + (s.fix_device || "the device")),
          h("div", { class: "why-box" }, [h("span", { class: "eyebrow", text: "Why" }), h("p", { text: s.explanation })]),
          s.verify ? h("div", { class: "why-box" }, [h("span", { class: "eyebrow", text: "Verify" }), h("p", { text: s.verify })]) : null,
          h("button", { class: "btn", type: "button", text: i + 1 < list.length ? "Next scenario" : "See results", onclick: finish })]);
      }
      ticket();
    }
    if (!list.length) return exit();
    step();
  };
})(window.CCNA);
