/* notes.js: the study notes, blueprint, plan and labs, readable and searchable offline.
   Documents are stored as Markdown text in data/notes.json and drawn by the small renderer below. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame;

  /* ---------- a small, safe Markdown renderer (builds DOM nodes, never innerHTML) ---------- */
  function inline(text, into) {
    var re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(<https?:\/\/[^>\s]+>)/g, last = 0, m;
    text = text.replace(/\\\|/g, "|");
    while ((m = re.exec(text))) {
      if (m.index > last) into.appendChild(document.createTextNode(text.slice(last, m.index)));
      var tok = m[0];
      if (m[1]) into.appendChild(h("code", { text: tok.slice(1, -1) }));
      else if (m[2]) { var b = h("strong"); inline(tok.slice(2, -2), b); into.appendChild(b); }
      else if (m[3]) { var parts = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (/^https:\/\//.test(parts[2])) into.appendChild(h("a", { href: parts[2], target: "_blank", rel: "noopener", text: parts[1] })); else inline(parts[1], into); }
      else { var url = tok.slice(1, -1); into.appendChild(/^https:\/\//.test(url) ? h("a", { href: url, target: "_blank", rel: "noopener", text: url }) : document.createTextNode(url)); }
      last = m.index + tok.length;
    }
    if (last < text.length) into.appendChild(document.createTextNode(text.slice(last)));
    return into;
  }
  /* a pipe written as \| inside a table cell is text, not a column break (no regex lookbehind: older iPhones lack it) */
  function cells(line) { return line.trim().replace(/\\\|/g, "\u0001").replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim().replace(/\u0001/g, "|"); }); }
  function isBlockStart(l) { return /^(#{1,4} |```|> ?|[-*] |\d+\. |\||<details>|---+\s*$)/.test(l); }
  A.md = function (text) {
    var lines = String(text).replace(/\r/g, "").split("\n"), out = [], i = 0, m;
    while (i < lines.length) {
      var line = lines[i];
      if (/^\s*$/.test(line)) { i++; continue; }
      if (/^```/.test(line)) { var code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++;
        out.push(h("div", { class: "exhibit", tabindex: "0" }, [h("pre", {}, [h("code", { text: code.join("\n") })])])); continue; }
      if (/^<details>/.test(line)) { var inner = [], summary = "Show"; i++;
        while (i < lines.length && !/^<\/details>/.test(lines[i])) { var sm = lines[i].match(/^<summary>(.*)<\/summary>/); if (sm) summary = sm[1]; else inner.push(lines[i]); i++; } i++;
        out.push(h("details", {}, [h("summary", { text: summary }), h("div", { class: "body" }, A.md(inner.join("\n")))])); continue; }
      if ((m = line.match(/^(#{1,4}) (.*)$/))) { out.push(inline(m[2], h("h" + Math.min(3, m[1].length)))); i++; continue; }
      if (/^---+\s*$/.test(line)) { out.push(h("hr")); i++; continue; }
      if (/^> ?/.test(line)) { var q = []; while (i < lines.length && /^> ?/.test(lines[i])) q.push(lines[i++].replace(/^> ?/, "")); out.push(h("blockquote", {}, A.md(q.join("\n")))); continue; }
      if (/^\|/.test(line) && i + 1 < lines.length && /^\|?[\s:|-]*-{2,}[\s:|-]*$/.test(lines[i + 1])) {
        var head = cells(line), rows = []; i += 2;
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
        out.push(h("div", { class: "tbl" }, [h("table", {}, [h("thead", {}, [h("tr", {}, head.map(function (c) { return inline(c, h("th")); }))]),
          h("tbody", {}, rows.map(function (r) { return h("tr", {}, r.map(function (c) { return inline(c, h("td")); })); }))])])); continue; }
      if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
        var ordered = /^\d+\. /.test(line), re = ordered ? /^\d+\. / : /^[-*] /, items = [];
        while (i < lines.length && (re.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
          if (re.test(lines[i])) items.push(lines[i].replace(re, "")); else items[items.length - 1] += " " + lines[i].trim(); i++; }
        out.push(h(ordered ? "ol" : "ul", {}, items.map(function (t) { return inline(t.replace(/^\[ \] /, "☐ ").replace(/^\[x\] /i, "☑ "), h("li")); }))); continue; }
      var para = [line]; i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) para.push(lines[i++]);
      out.push(inline(para.join(" "), h("p")));
    }
    return out;
  };

  /* ---------- library ---------- */
  function snippet(text, at, len) { var s = Math.max(0, at - 40), e = Math.min(text.length, at + len + 60); return (s ? "..." : "") + text.slice(s, e).replace(/\s+/g, " ") + (e < text.length ? "..." : ""); }
  A.notesMenu = function (query) {
    var docs = A.D.notes, results = h("div", { class: "stack" });
    var input = h("input", { class: "search", id: "notes-search", type: "search", placeholder: "Search notes: ospf cost, wildcard, 4.7 ...", autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "false", "aria-label": "Search the notes", enterkeyhint: "search" });
    input.value = query || "";
    function listing() {
      var q = input.value.trim().toLowerCase(), kids = [];
      if (q) {
        var hits = docs.map(function (d) { var hay = (d.title + "\n" + d.md).toLowerCase(), at = hay.indexOf(q); return at < 0 ? null : { d: d, at: at, inTitle: d.title.toLowerCase().indexOf(q) >= 0, count: hay.split(q).length - 1 }; }).filter(Boolean)
          .sort(function (a, b) { return (b.inTitle - a.inTitle) || (b.count - a.count); });
        kids.push(h("p", { class: "small muted", text: hits.length ? hits.length + " document" + (hits.length === 1 ? "" : "s") + " mention “" + input.value.trim() + "”" : "Nothing found. Try a shorter word." }));
        if (hits.length) kids.push(A.modeList(hits.map(function (x) { var text = x.d.title + "\n" + x.d.md; return { name: x.d.title, sub: snippet(text, x.at, q.length), badge: String(x.count), go: function () { A.readDoc(x.d, input.value.trim()); } }; })));
      } else {
        var notes = docs.filter(function (d) { return d.group === "notes"; });
        if (!notes.length) kids.push(h("div", { class: "notice", text: "No study notes are in the app yet." }));
        Object.keys(A.DOMAINS).forEach(function (dom) {
          var set = notes.filter(function (d) { return String(d.domain) === dom; }); if (!set.length) return;
          kids.push(h("h2", { text: dom + ". " + A.DOMAINS[dom][0] }));
          kids.push(A.modeList(set.map(function (d) { return { name: d.title, sub: A.DOMAINS[dom][1] + "% domain", go: function () { A.readDoc(d); } }; })));
        });
        [["labs", "Labs"], ["reference", "Reference"]].forEach(function (g) {
          var set = docs.filter(function (d) { return d.group === g[0]; }); if (!set.length) return;
          kids.push(h("h2", { text: g[1] })); kids.push(A.modeList(set.map(function (d) { return { name: d.title, sub: d.sub || "", go: function () { A.readDoc(d); } }; })));
        });
      }
      A.setKids(results, kids);
    }
    input.addEventListener("input", listing);
    frame({ title: "Notes", tab: "more", back: A.moreMenu, backLabel: "More" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Notes" }), h("p", { class: "muted", text: "One note per exam objective, plus the blueprint, your study plan and the labs. All available offline." })]),
      input, results]);
    listing();
  };
  A.readDoc = function (d, query) {
    var body = h("div", { class: "doc" }, A.md(d.md));
    frame({ title: d.objective ? "Objective " + d.objective : d.title, tab: "more", back: function () { A.notesMenu(query); }, backLabel: "Notes" }, [
      d.unverified ? h("div", { class: "notice", text: "Written for this course and not yet checked line by line against Cisco documentation. If something here disagrees with official Cisco material, trust Cisco and tell your coach." }) : null,
      body,
      d.objective ? h("button", { class: "btn ghost", type: "button", text: "Quiz me on objective " + d.objective, onclick: function () {
        A.runQuiz("Objective " + d.objective, A.pickQ(A.D.questions.filter(function (q) { return q.objective === d.objective; }), 10), function () { A.readDoc(d, query); }); } }) : null]);
    if (query) highlight(body, query);
  };
  function highlight(root, query) {
    var q = query.toLowerCase(), walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [], n, first = null;
    while ((n = walker.nextNode())) if (n.nodeValue.toLowerCase().indexOf(q) >= 0) nodes.push(n);
    nodes.forEach(function (node) {
      var text = node.nodeValue, low = text.toLowerCase(), frag = document.createDocumentFragment(), pos = 0, at;
      while ((at = low.indexOf(q, pos)) >= 0) { if (at > pos) frag.appendChild(document.createTextNode(text.slice(pos, at)));
        var mk = h("mark", { text: text.slice(at, at + q.length) }); if (!first) first = mk; frag.appendChild(mk); pos = at + q.length; }
      if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
      node.parentNode.replaceChild(frag, node);
    });
    if (first) { var det = first.closest("details"); if (det) det.open = true; first.scrollIntoView({ block: "center" }); }
  }
})(window.CCNA);
