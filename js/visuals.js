/* visuals.js: interactive visual guides. Each one shows an idea rather than asking about it:
   subnetting bit by bit, a packet followed hop by hop, message sequences, spanning tree, ACLs, route lookups. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame, T = A._subnet, NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, kids) {
    var el = document.createElementNS(NS, tag), k; attrs = attrs || {};
    for (k in attrs) { if (k === "text") el.textContent = attrs[k]; else if (attrs[k] != null) el.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function facts(rows) { return h("div", { class: "panel" }, [h("dl", { class: "facts" }, [].concat.apply([], rows.map(function (r) { return [h("dt", { text: r[0] }), h("dd", { text: r[1] })]; })))]); }
  function stepper(count, onStep) {            /* Back / Next controls shared by the step-through guides */
    var i = 0, dots = h("div"), back = h("button", { class: "btn quiet", type: "button", text: "Back", onclick: function () { if (i > 0) { i--; paint(); } } }),
        next = h("button", { class: "btn", type: "button", text: "Next", onclick: function () { if (i < count - 1) { i++; paint(); } } });
    function paint() { back.disabled = i === 0; next.disabled = i === count - 1; next.textContent = i === count - 1 ? "End" : "Next";
      A.setKids(dots, [A.plate("Step " + (i + 1) + " of " + count, "", count, function (k) { return k < i ? "done" : k === i ? "now" : ""; })]); onStep(i); }
    return { el: h("div", { class: "stack" }, [dots, h("div", { class: "row" }, [back, next])]), start: paint };
  }

  /* ================= 1. Subnetting, bit by bit ================= */
  A.subnetVisual = function (host, prefix) {
    host = host >>> 0;
    var mask = T.maskOf(prefix), net = (host & mask) >>> 0, size = Math.pow(2, 32 - prefix), bc = net + size - 1, ipS = T.ip(host).split("."), mS = T.ip(mask).split("."), kids = [];
    var octets = h("div", { class: "bits" }, [0, 1, 2, 3].map(function (o) {
      var cells = []; for (var b = 0; b < 8; b++) { var pos = o * 8 + b, bit = (host >>> (31 - pos)) & 1; cells.push(h("span", { class: "bit " + (pos < prefix ? "net" : "hostb"), text: String(bit) })); }
      return h("div", { class: "octet" }, [h("div", { class: "bitrow" }, cells), h("div", { class: "oct-num", text: ipS[o] }), h("div", { class: "oct-mask", text: mS[o] })]);
    }));
    kids.push(h("div", { class: "stack tight" }, [h("div", { class: "legend" }, [h("span", { class: "key net", text: prefix + " network bits" }), h("span", { class: "key hostb", text: (32 - prefix) + " host bits" })]), octets,
      h("p", { class: "small muted", text: "Top row: the address in binary. Then the address and the mask in decimal, octet by octet." })]));
    var steps = [];
    if (prefix % 8 === 0) {
      steps.push("/" + prefix + " is a mask of " + T.ip(mask) + ". It ends exactly on an octet boundary, so there is no block maths.");
      steps.push("The first " + (prefix / 8) + " octet" + (prefix === 8 ? "" : "s") + " are the network. Everything after is host.");
    } else {
      var idx = Math.floor(prefix / 8), block = 256 - Number(mS[idx]), v = Number(ipS[idx]), start = v - (v % block), k = start / block, last = 256 / block - 1, lo = Math.max(0, k - 2), hi = Math.min(last, k + 2), boxes = [];
      if (lo > 0) boxes.push(h("span", { class: "blk gap", text: "…" }));
      for (var n = lo; n <= hi; n++) boxes.push(h("span", { class: "blk" + (n === k ? " cur" : "") }, [h("span", { class: "rng", text: (n * block) + "–" + (n * block + block - 1) }), n === k ? h("span", { class: "pin", text: "▲ " + v }) : null]));
      if (hi < last) boxes.push(h("span", { class: "blk gap", text: "…" }));
      kids.push(h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Octet " + (idx + 1) + ", cut into blocks of " + block }), h("div", { class: "numline" }, boxes)]));
      steps.push("/" + prefix + " is a mask of " + T.ip(mask) + ".");
      steps.push("The interesting octet is number " + (idx + 1) + ", where the mask is neither 255 nor 0. Block size = 256 − " + mS[idx] + " = " + block + ".");
      steps.push("Subnets start at multiples of " + block + ". The address has " + v + " in that octet, which sits in the block " + start + " to " + (start + block - 1) + ".");
    }
    steps.push("Network = " + T.ip(net) + ". Broadcast = one below the next network = " + T.ip(bc) + ".");
    steps.push("Usable hosts run from " + T.ip(net + 1) + " to " + T.ip(bc - 1) + ": 2^" + (32 - prefix) + " − 2 = " + (size - 2).toLocaleString("en-GB") + ".");
    kids.push(h("ol", { class: "plain" }, steps.map(function (t) { return h("li", { text: t }); })));
    kids.push(facts([["Network", T.ip(net) + "/" + prefix], ["First host", T.ip(net + 1)], ["Last host", T.ip(bc - 1)], ["Broadcast", T.ip(bc)], ["Usable hosts", (size - 2).toLocaleString("en-GB")], ["Mask", T.ip(mask)], ["Wildcard", T.ip(~mask)]]));
    return h("div", { class: "stack" }, kids);
  };
  function subnetExplorer(back) {
    var ipIn = h("input", { class: "answer", id: "vx-ip", type: "text", inputmode: "decimal", autocomplete: "off", "aria-label": "IP address" }), out = h("div"), plabel = h("strong", { class: "mono" });
    var slider = h("input", { type: "range", id: "vx-prefix", min: "8", max: "30", step: "1", "aria-label": "Prefix length", class: "slider" });
    ipIn.value = "192.168.10.77"; slider.value = "27";
    function paint() { var ipv = T.parseIp(ipIn.value), p = Number(slider.value); plabel.textContent = "/" + p;
      A.setKids(out, [ipv === null ? h("div", { class: "notice", text: "Type a full IPv4 address, for example 172.16.37.200." }) : A.subnetVisual(ipv, p)]); }
    function nudge(d) { slider.value = String(Math.max(8, Math.min(30, Number(slider.value) + d))); paint(); }
    ipIn.addEventListener("input", paint); slider.addEventListener("input", paint);
    frame({ title: "Visual guide", tab: "learn", back: back, backLabel: "Back" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Subnetting, bit by bit" }), h("p", { class: "muted", text: "Change the address or drag the prefix and watch where the network ends and the hosts begin." })]),
      h("label", { class: "fld" }, ["IP address", ipIn]),
      h("div", { class: "stack tight" }, [h("div", { class: "bar-head" }, [h("span", { class: "small muted", text: "Prefix length" }), plabel]),
        h("div", { class: "row slider-row" }, [h("button", { class: "btn quiet", type: "button", text: "−", "aria-label": "Shorter prefix", onclick: function () { nudge(-1); } }), slider, h("button", { class: "btn quiet", type: "button", text: "+", "aria-label": "Longer prefix", onclick: function () { nudge(1); } })])]),
      out,
      h("div", { class: "row" }, [h("button", { class: "btn ghost", type: "button", text: "Random example", onclick: function () { var q = T.GEN.network(), m = q.prompt.match(/(\d+\.\d+\.\d+\.\d+)/); ipIn.value = m[1]; slider.value = String(A.pick1([18, 20, 22, 23, 25, 26, 27, 28, 29, 30])); paint(); } }),
        h("button", { class: "btn", type: "button", text: "Now drill it", onclick: function () { A.runDrill("IPv4 mixed", A.genV4, 10, { backTo: function () { subnetExplorer(back); } }); } })])
    ]);
    paint();
  }

  /* ================= 2. IPv6 and EUI-64 ================= */
  function v6kind(g) {
    if (g.every(function (x) { return x === 0; })) return "Unspecified (::)";
    if (g.slice(0, 7).every(function (x) { return x === 0; }) && g[7] === 1) return "Loopback (::1)";
    if ((g[0] >> 13) === 1) return "Global unicast (2000::/3)";
    if ((g[0] & 0xfe00) === 0xfc00) return "Unique local (fc00::/7)";
    if ((g[0] & 0xffc0) === 0xfe80) return "Link-local (fe80::/10)";
    if ((g[0] & 0xff00) === 0xff00) return "Multicast (ff00::/8)";
    return "Reserved or unassigned";
  }
  function ipv6Explorer(back) {
    var addr = h("input", { class: "answer", id: "vx-v6", type: "text", autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "false", "aria-label": "IPv6 address" }),
        mac = h("input", { class: "answer", id: "vx-mac", type: "text", autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "false", "aria-label": "MAC address" }), out = h("div"), out2 = h("div");
    addr.value = "2001:0db8:0000:0042:0000:0000:0000:0100"; mac.value = "001a.2b3c.4d5e";
    function hx(n, w) { return ("0000" + n.toString(16)).slice(-w); }
    function paint() {
      var g = T.v6parse(addr.value.split("/")[0]);
      if (!g) { A.setKids(out, [h("div", { class: "notice", text: "That is not a valid IPv6 address. Eight groups of hex, or use :: once." })]); }
      else {
        var noLead = g.map(function (x) { return x.toString(16); }).join(":");
        A.setKids(out, [h("div", { class: "stack" }, [
          h("div", { class: "chips" }, g.map(function (x, i) { return h("span", { class: "chip " + (i < 3 ? "c-site" : i === 3 ? "c-sub" : "c-iid"), text: hx(x, 4) }); })),
          h("div", { class: "legend" }, [h("span", { class: "key c-site", text: "Site prefix (/48)" }), h("span", { class: "key c-sub", text: "Subnet (to /64)" }), h("span", { class: "key c-iid", text: "Interface ID (64 bits)" })]),
          h("ol", { class: "plain" }, [h("li", {}, ["Full form: ", h("code", { text: T.v6full(g) })]), h("li", {}, ["Drop the leading zeros in each group: ", h("code", { text: noLead })]),
            h("li", {}, ["Replace the longest run of zero groups with :: (once only): ", h("code", { text: T.v6short(g) })])]),
          facts([["Shortest form", T.v6short(g)], ["Type", v6kind(g)], ["Its /64 subnet", T.v6short(g.slice(0, 4).concat([0, 0, 0, 0])) + "/64"]])])]);
      }
      var m = mac.value.toLowerCase().replace(/[^0-9a-f]/g, "");
      if (m.length !== 12) { A.setKids(out2, [h("div", { class: "notice", text: "A MAC address has 12 hex digits, for example 001a.2b3c.4d5e." })]); return; }
      var b = m.match(/../g).map(function (x) { return parseInt(x, 16); }), flipped = b[0] ^ 2, bin = function (n) { return ("00000000" + n.toString(2)).slice(-8); };
      var iid = [(flipped << 8) | b[1], (b[2] << 8) | 0xff, 0xfe00 | b[3], (b[4] << 8) | b[5]], pre = g ? g.slice(0, 4) : [0x2001, 0xdb8, 1, 0x10];
      function bits(n, mark) { return h("span", { class: "mono" }, bin(n).split("").map(function (c, i) { return h("span", { class: i === 6 && mark ? "flip" : "", text: c }); })); }
      A.setKids(out2, [h("div", { class: "stack" }, [
        h("ol", { class: "plain" }, [
          h("li", {}, ["Split the MAC in half: ", h("code", { text: m.slice(0, 6) + " | " + m.slice(6) })]),
          h("li", {}, ["Insert fffe in the middle: ", h("code", { text: m.slice(0, 6) + "fffe" + m.slice(6) })]),
          h("li", {}, ["Flip the 7th bit of the first byte: ", bits(b[0], true), " becomes ", bits(flipped, true), ", so ", h("code", { text: hx(b[0], 2) }), " becomes ", h("code", { text: hx(flipped, 2) })])]),
        facts([["Interface ID", iid.map(function (x) { return hx(x, 4); }).join(":")], ["Link-local address", T.v6short([0xfe80, 0, 0, 0].concat(iid))], ["Address in the /64 above", T.v6short(pre.concat(iid))]])])]);
    }
    addr.addEventListener("input", paint); mac.addEventListener("input", paint);
    frame({ title: "Visual guide", tab: "learn", back: back, backLabel: "Back" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "IPv6 addresses and EUI-64" }), h("p", { class: "muted", text: "Type any IPv6 address to see its parts and its shortest form. Then build an address from a MAC." })]),
      h("label", { class: "fld" }, ["IPv6 address", addr]), out,
      h("h2", { text: "Modified EUI-64: an address from a MAC" }), h("label", { class: "fld" }, ["MAC address", mac]), out2,
      h("button", { class: "btn", type: "button", text: "Now drill IPv6", onclick: function () { A.runDrill("IPv6", A.genV6, 10, { backTo: function () { ipv6Explorer(back); } }); } })]);
    paint();
  }

  /* ================= 3. Follow a packet along a path ================= */
  function icon(kind, x, y, on) {
    var c = on ? "var(--accent)" : "var(--muted)", f = on ? "var(--accent-soft)" : "var(--surface)", a = { fill: f, stroke: c, "stroke-width": 2 };
    if (kind === "router") return S("g", {}, [S("circle", Object.assign({ cx: x, cy: y, r: 15 }, a)), S("path", { d: "M" + (x - 8) + " " + y + "h16M" + x + " " + (y - 8) + "v16", stroke: c, "stroke-width": 2 })]);
    if (kind === "switch") return S("g", {}, [S("rect", Object.assign({ x: x - 18, y: y - 10, width: 36, height: 20, rx: 4 }, a)), S("path", { d: "M" + (x - 10) + " " + (y - 3) + "h20M" + (x - 10) + " " + (y + 3) + "h20", stroke: c, "stroke-width": 1.5 })]);
    if (kind === "server") return S("g", {}, [S("rect", Object.assign({ x: x - 11, y: y - 16, width: 22, height: 32, rx: 3 }, a)), S("path", { d: "M" + (x - 6) + " " + (y - 8) + "h12M" + (x - 6) + " " + (y - 1) + "h12", stroke: c, "stroke-width": 1.5 })]);
    if (kind === "cloud") return S("ellipse", Object.assign({ cx: x, cy: y, rx: 20, ry: 12 }, a));
    return S("g", {}, [S("rect", Object.assign({ x: x - 14, y: y - 12, width: 28, height: 19, rx: 3 }, a)), S("path", { d: "M" + (x - 8) + " " + (y + 12) + "h16", stroke: c, "stroke-width": 2 })]);
  }
  function pathWalk(def, back) {
    var pic = h("div"), head = h("div"), note = h("p"), extra = h("div"), n = def.nodes.length, W = 340, gap = (W - 40) / (n - 1);
    var ctl = stepper(def.steps.length, function (i) {
      var st = def.steps[i], kids = [];
      for (var k = 0; k < n - 1; k++) { var live = st.link === k; kids.push(S("line", { x1: 20 + k * gap, y1: 30, x2: 20 + (k + 1) * gap, y2: 30, stroke: live ? "var(--accent)" : "var(--line)", "stroke-width": live ? 4 : 2, "stroke-dasharray": def.nodes[k].wan ? "4 4" : null })); }
      def.nodes.forEach(function (nd, k) { kids.push(icon(nd.kind, 20 + k * gap, 30, st.at === k)); kids.push(S("text", { x: 20 + k * gap, y: 64, "text-anchor": "middle", "font-size": 11, fill: st.at === k ? "var(--accent)" : "var(--muted)", "font-weight": st.at === k ? 700 : 400, text: nd.label })); });
      var px = st.link != null ? 20 + (st.link + 0.5) * gap : 20 + st.at * gap;
      kids.push(S("rect", { x: px - 9, y: st.link != null ? 21 : 2, width: 18, height: 12, rx: 2, fill: "var(--warn)" }));
      A.setKids(pic, [S("svg", { viewBox: "0 0 " + W + " 72", role: "img", "aria-label": def.title, class: "vis-svg" }, kids)]);
      A.setKids(head, [st.head ? h("div", { class: "panel tbl" }, [h("table", { class: "hdr" }, st.head.map(function (r) { return h("tr", { class: r[2] ? "chg" : "" }, [h("td", { text: r[0] }), h("td", { class: "mono", text: r[1] }), h("td", { class: "small", text: r[2] ? "changed" : "" })]); }))]) : null]);
      note.textContent = st.note;
      A.setKids(extra, [st.table ? h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: st.table[0] }), A.exhibit(st.table[1])]) : null]);
    });
    frame({ title: "Visual guide", tab: "learn", back: back, backLabel: "Back" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: def.title }), h("p", { class: "muted", text: def.intro })]),
      pic, head, h("div", { class: "why-box" }, [note]), extra, ctl.el,
      def.takeaway ? h("div", { class: "notice info", text: def.takeaway }) : null]);
    ctl.start();
  }

  /* ================= 4. Message sequences ================= */
  function seqWalk(def, back) {
    var pic = h("div"), note = h("p"), state = h("div"), n = def.actors.length, W = 340, xs = def.actors.map(function (_, k) { return n === 2 ? 60 + k * 220 : 45 + k * (250 / (n - 1)); });
    var ctl = stepper(def.steps.length, function (i) {
      var H = 44 + def.steps.length * 30, kids = [];
      def.actors.forEach(function (a, k) { kids.push(S("text", { x: xs[k], y: 14, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "var(--ink)", text: a })); kids.push(S("line", { x1: xs[k], y1: 22, x2: xs[k], y2: H - 6, stroke: "var(--line)", "stroke-width": 2 })); });
      def.steps.slice(0, i + 1).forEach(function (st, k) {
        var y = 48 + k * 30, x1 = xs[st.from], x2 = xs[st.to], live = k === i, col = live ? "var(--accent)" : "var(--muted)", dir = x2 > x1 ? 1 : -1;
        kids.push(S("line", { x1: x1, y1: y, x2: x2 - dir * 2, y2: y, stroke: col, "stroke-width": live ? 3 : 1.5, "stroke-dasharray": st.dashed ? "5 4" : null }));
        kids.push(S("path", { d: "M" + x2 + " " + y + "l" + (-dir * 9) + " -5v10z", fill: col }));
        kids.push(S("text", { x: (x1 + x2) / 2, y: y - 6, "text-anchor": "middle", "font-size": 11, "font-weight": live ? 700 : 400, fill: live ? "var(--accent)" : "var(--muted)", text: st.label }));
      });
      A.setKids(pic, [S("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": def.title, class: "vis-svg" }, kids)]);
      var st = def.steps[i]; note.textContent = st.note;
      A.setKids(state, [st.state ? h("span", { class: "badge", text: st.state }) : null]);
    });
    frame({ title: "Visual guide", tab: "learn", back: back, backLabel: "Back" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: def.title }), h("p", { class: "muted", text: def.intro })]),
      pic, state, h("div", { class: "why-box" }, [note]), ctl.el,
      def.takeaway ? h("div", { class: "notice info", text: def.takeaway }) : null]);
    ctl.start();
  }

  /* ================= 5. Spanning tree you can change ================= */
  function stpExplorer(back) {
    var sw = [{ name: "SW1", pri: 32768, mac: "0011.1111.1111" }, { name: "SW2", pri: 32768, mac: "0022.2222.2222" }, { name: "SW3", pri: 32768, mac: "0033.3333.3333" }];
    var cost = { "0-1": 4, "0-2": 4, "1-2": 4 }, out = h("div");
    function c(a, b) { return cost[Math.min(a, b) + "-" + Math.max(a, b)]; }
    function bid(i) { return ("00000" + sw[i].pri).slice(-5) + "." + sw[i].mac; }
    function paint() {
      var root = [0, 1, 2].sort(function (a, b) { return bid(a) < bid(b) ? -1 : 1; })[0], rpc = [1e9, 1e9, 1e9], rp = [null, null, null], it, a, b; rpc[root] = 0;
      for (it = 0; it < 3; it++) for (a = 0; a < 3; a++) { if (a === root) continue; for (b = 0; b < 3; b++) { if (b === a) continue;
        var via = rpc[b] + c(a, b); if (via < rpc[a] || (via === rpc[a] && rp[a] !== null && bid(b) < bid(rp[a]))) { rpc[a] = via; rp[a] = b; } } }
      var pos = [[170, 34], [56, 150], [284, 150]], kids = [], why = [], roles = {};
      [[0, 1], [0, 2], [1, 2]].forEach(function (L) {
        var x = L[0], y = L[1], des = (rpc[x] < rpc[y] || (rpc[x] === rpc[y] && bid(x) < bid(y))) ? x : y, other = des === x ? y : x;
        roles[des + ">" + other] = "D"; roles[other + ">" + des] = rp[other] === des ? "R" : "A";
        var blocked = roles[other + ">" + des] === "A";
        kids.push(S("line", { x1: pos[x][0], y1: pos[x][1], x2: pos[y][0], y2: pos[y][1], stroke: blocked ? "var(--bad)" : "var(--ok)", "stroke-width": 3, "stroke-dasharray": blocked ? "6 5" : null }));
        var mx = (pos[x][0] + pos[y][0]) / 2, my = (pos[x][1] + pos[y][1]) / 2;
        var lx = L[0] === 1 ? mx : L[1] === 1 ? mx - 34 : mx + 34, ly = L[0] === 1 ? my + 16 : my;      /* keep the label clear of the line */
        kids.push(S("text", { x: lx, y: ly, "text-anchor": "middle", "font-size": 10, fill: "var(--muted)", text: "cost " + c(x, y) }));
        [[x, y], [y, x]].forEach(function (e) { var r = roles[e[0] + ">" + e[1]], px = pos[e[0]][0] + (pos[e[1]][0] - pos[e[0]][0]) * 0.26, py = pos[e[0]][1] + (pos[e[1]][1] - pos[e[0]][1]) * 0.26;
          kids.push(S("circle", { cx: px, cy: py, r: 9, fill: r === "A" ? "var(--bad)" : r === "R" ? "var(--accent)" : "var(--ok)" })); kids.push(S("text", { x: px, y: py + 3.5, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "var(--surface)", text: r })); });
      });
      sw.forEach(function (s, i) { kids.push(S("rect", { x: pos[i][0] - 34, y: pos[i][1] - 18, width: 68, height: 36, rx: 6, fill: i === root ? "var(--accent-soft)" : "var(--surface)", stroke: i === root ? "var(--accent)" : "var(--muted)", "stroke-width": 2 }));
        kids.push(S("text", { x: pos[i][0], y: pos[i][1] + (i === root ? -1 : 4), "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "var(--ink)", text: s.name }));
        if (i === root) kids.push(S("text", { x: pos[i][0], y: pos[i][1] + 12, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "var(--accent)", text: "ROOT" })); });
      why.push(sw[root].name + " is the root bridge: it has the lowest bridge ID (" + sw[root].pri + " then MAC " + sw[root].mac + "). All of its ports are designated.");
      [0, 1, 2].forEach(function (i) { if (i !== root) why.push(sw[i].name + " reaches the root at cost " + rpc[i] + " through its port towards " + sw[rp[i]].name + ". That is its root port."); });
      var alt = Object.keys(roles).filter(function (k) { return roles[k] === "A"; })[0];
      if (alt) { var e = alt.split(">"); why.push("On the " + sw[e[0]].name + " to " + sw[e[1]].name + " link, " + sw[e[1]].name + " has the better claim (lower cost to the root, or lower bridge ID on a tie), so it is designated. " + sw[e[0]].name + "'s port becomes alternate and discards. That one blocked port breaks the loop."); }
      A.setKids(out, [S("svg", { viewBox: "0 0 340 184", role: "img", "aria-label": "Three switches in a triangle with spanning-tree port roles", class: "vis-svg" }, kids),
        h("div", { class: "legend" }, [h("span", { class: "key k-r", text: "R root port" }), h("span", { class: "key k-d", text: "D designated" }), h("span", { class: "key k-a", text: "A alternate (blocked)" })]),
        h("ol", { class: "plain" }, why.map(function (t) { return h("li", { text: t }); }))]);
    }
    function priRow(i) { var val = h("strong", { class: "mono" });
      function set(d) { sw[i].pri = Math.max(0, Math.min(61440, sw[i].pri + d)); val.textContent = String(sw[i].pri); paint(); }
      val.textContent = String(sw[i].pri);
      return h("div", { class: "pri-row" }, [h("span", { text: sw[i].name + " priority" }), h("button", { class: "btn quiet", type: "button", text: "−", "aria-label": "Lower " + sw[i].name + " priority", onclick: function () { set(-4096); } }), val,
        h("button", { class: "btn quiet", type: "button", text: "+", "aria-label": "Raise " + sw[i].name + " priority", onclick: function () { set(4096); } })]); }
    var slow = h("button", { class: "btn ghost", type: "button", text: "Make the SW1 to SW2 link 100 Mb (cost 19)", onclick: function () { cost["0-1"] = cost["0-1"] === 4 ? 19 : 4; slow.textContent = cost["0-1"] === 4 ? "Make the SW1 to SW2 link 100 Mb (cost 19)" : "Put the SW1 to SW2 link back to 1 Gb (cost 4)"; paint(); } });
    frame({ title: "Visual guide", tab: "learn", back: back, backLabel: "Back" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Spanning tree you can change" }), h("p", { class: "muted", text: "Three switches in a triangle would loop. Change a priority or a link speed and watch Rapid PVST+ pick the root and block one port." })]),
      out, h("div", { class: "panel stack" }, [priRow(0), priRow(1), priRow(2)]), slow,
      h("div", { class: "notice info", text: "Lowest wins every time: lowest bridge ID for the root, lowest cost for the root port. Priorities move in steps of 4096. The MAC address breaks a tie." })]);
    paint();
  }

  /* ================= 6. ACL, line by line ================= */
  function inNet(ipS, net) { if (net === "any") return true; var p = T.parseIp(ipS), n = T.parseIp(net[0]), w = T.parseIp(net[1]); return ((p ^ n) & ~w) >>> 0 === 0; }
  function aclStepper(back) {
    var acl = [{ seq: 10, act: "permit", proto: "tcp", src: ["192.168.10.0", "0.0.0.255"], dst: ["10.1.1.10", "0.0.0.0"], port: 443, text: "permit tcp 192.168.10.0 0.0.0.255 host 10.1.1.10 eq 443" },
               { seq: 20, act: "deny", proto: "ip", src: ["192.168.10.0", "0.0.0.255"], dst: ["10.1.1.0", "0.0.0.255"], text: "deny ip 192.168.10.0 0.0.0.255 10.1.1.0 0.0.0.255" },
               { seq: 30, act: "permit", proto: "ip", src: "any", dst: "any", text: "permit ip any any" }];
    var pkts = [{ name: "Staff PC to the web server (HTTPS)", src: "192.168.10.25", dst: "10.1.1.10", proto: "tcp", port: 443 }, { name: "Staff PC to another server (SSH)", src: "192.168.10.25", dst: "10.1.1.20", proto: "tcp", port: 22 },
                { name: "Staff PC to an internet DNS server", src: "192.168.10.25", dst: "198.51.100.53", proto: "udp", port: 53 }, { name: "A PC on a different LAN to the web server", src: "192.168.20.9", dst: "10.1.1.10", proto: "tcp", port: 443 }];
    var pick = 0, out = h("div"), chooser = h("div", { class: "stack" });
    function test(l, p) { if (l.proto !== "ip" && l.proto !== p.proto) return "protocol is " + p.proto + ", the line wants " + l.proto; if (!inNet(p.src, l.src)) return "source " + p.src + " is outside the line's source range";
      if (!inNet(p.dst, l.dst)) return "destination " + p.dst + " is outside the line's destination range"; if (l.port && l.port !== p.port) return "port is " + p.port + ", the line wants " + l.port; return ""; }
    function paint() {
      var p = pkts[pick], hit = false, rows = acl.map(function (l) { if (hit) return h("div", { class: "rv" }, [h("span", { class: "mono small", text: l.seq + " " + l.text }), h("span", { class: "why", text: "Never looked at. The packet was already matched above." })]);
        var miss = test(l, p); if (!miss) hit = l;
        return h("div", { class: "rv " + (miss ? "" : l.act === "permit" ? "ok" : "bad") }, [h("span", { class: "mono small", text: l.seq + " " + l.text }), h("span", { class: "why", text: miss ? "No match: " + miss + ". Move to the next line." : "MATCH. First match wins: the packet is " + (l.act === "permit" ? "permitted" : "denied") + " and checking stops." })]); });
      rows.push(h("div", { class: "rv " + (hit ? "" : "bad") }, [h("span", { class: "mono small", text: "(implicit) deny ip any any" }), h("span", { class: "why", text: hit ? "Always there, never shown. Not reached this time." : "Nothing matched, so the hidden last line denies the packet." })]));
      Array.prototype.forEach.call(chooser.children, function (b, i) { b.setAttribute("aria-pressed", String(i === pick)); b.querySelector(".mark").textContent = i === pick ? "✓" : ""; });
      A.setKids(out, [facts([["Source", p.src], ["Destination", p.dst], ["Protocol and port", p.proto + " " + p.port]]), h("div", { class: "stack tight" }, rows)]);
    }
    pkts.forEach(function (p, i) { chooser.appendChild(h("button", { class: "opt", type: "button", "aria-pressed": "false", onclick: function () { pick = i; paint(); } }, [h("span", { class: "mark" }), h("span", { class: "txt", text: p.name })])); });
    frame({ title: "Visual guide", tab: "learn", back: back, backLabel: "Back" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "An ACL, line by line" }), h("p", { class: "muted", text: "Pick a packet and watch the router test it against each line from the top. Policy: staff may reach the web server on HTTPS only, nothing else on the server LAN, and anything else is allowed." })]),
      h("h2", { text: "Choose a packet" }), chooser, out,
      h("div", { class: "notice info", text: "Try the last packet. It is permitted by line 30, because lines 10 and 20 only talk about 192.168.10.0/24. An ACL does exactly what its lines say, not what you meant." })]);
    paint();
  }

  /* ================= 7. Which route wins? ================= */
  function routeLookup(back) {
    var routes = [["S*", "0.0.0.0", 0, "[1/0]", "203.0.113.1"], ["O", "10.1.0.0", 16, "[110/20]", "10.0.0.2"], ["S", "10.1.1.0", 24, "[1/0]", "10.0.0.6"], ["O", "10.1.1.128", 25, "[110/30]", "10.0.0.10"], ["C", "10.0.0.0", 30, "", "connected, Gi0/0"]];
    var dests = ["10.1.1.200", "10.1.1.20", "10.1.9.9", "198.51.100.7", "10.0.0.2"], pick = 0, out = h("div"), chooser = h("div", { class: "row" });
    function paint() {
      var d = T.parseIp(dests[pick]), best = -1, len = -1, rows;
      routes.forEach(function (r, i) { if (((d ^ T.parseIp(r[1])) & T.maskOf(r[2])) >>> 0 === 0 && r[2] > len) { len = r[2]; best = i; } });
      rows = routes.map(function (r, i) { var m = ((d ^ T.parseIp(r[1])) & T.maskOf(r[2])) >>> 0 === 0, size = Math.pow(2, 32 - r[2]), lo = T.parseIp(r[1]);
        return h("div", { class: "rv " + (i === best ? "ok" : "") }, [h("span", { class: "mono small", text: r[0] + "  " + r[1] + "/" + r[2] + " " + r[3] + " via " + r[4] }),
          h("span", { class: "why", text: (r[2] === 0 ? "Covers every address." : "Covers " + T.ip(lo) + " to " + T.ip(lo + size - 1) + ".") + (m ? (i === best ? " MATCH, and the longest prefix (/" + r[2] + "): this route is used." : " Matches, but a longer prefix also matches.") : " No match.") })]); });
      Array.prototype.forEach.call(chooser.children, function (b, i) { b.className = "btn " + (i === pick ? "" : "quiet"); });
      A.setKids(out, [h("div", { class: "stack tight" }, rows), h("div", { class: "why-box" }, [h("p", { text: "A packet for " + dests[pick] + " goes to " + routes[best][4] + ". The router picks the most specific match first. Administrative distance (the first number in the brackets) only decides between two sources offering the SAME prefix." + (pick === 0 ? " That is why the OSPF /25 beats the static /24 here, even though static has the better distance." : "") })])]);
    }
    dests.forEach(function (d, i) { chooser.appendChild(h("button", { class: "btn quiet", type: "button", text: d, onclick: function () { pick = i; paint(); } })); });
    frame({ title: "Visual guide", tab: "learn", back: back, backLabel: "Back" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Which route wins?" }), h("p", { class: "muted", text: "Tap a destination. Every route that covers it is a match, and the longest prefix wins." })]),
      h("h2", { text: "Destination address" }), h("div", { class: "dest-grid" }, [chooser]), out]);
    paint();
  }

  /* ================= the scripts for the step-through guides ================= */
  var PC = "0000.0000.00aa", R0 = "0000.0000.0101", R1 = "0000.0000.0102", SV = "0000.0000.00bb";
  function hdr(sm, dm, chg) { return [["Source MAC", sm, chg], ["Destination MAC", dm, chg], ["Source IP", "192.168.1.10"], ["Destination IP", "10.5.5.5"]]; }
  var WALKS = {
    packet: { title: "Follow a packet across a router", intro: "PC-A (192.168.1.10/24) sends to a server at 10.5.5.5. Watch which addresses change and which never do.",
      nodes: [{ label: "PC-A", kind: "pc" }, { label: "SW1", kind: "switch" }, { label: "R1", kind: "router" }, { label: "SW2", kind: "switch" }, { label: "Server", kind: "server" }],
      steps: [
        { at: 0, head: [["Source IP", "192.168.1.10"], ["Destination IP", "10.5.5.5"]], note: "PC-A compares the destination with its own subnet, 192.168.1.0/24. It is not local, so the packet must go to the default gateway, 192.168.1.1." },
        { link: 0, head: [["Source MAC", PC], ["Destination MAC", "ffff.ffff.ffff"], ["Message", "ARP: who has 192.168.1.1?"]], note: "PC-A does not know the gateway's MAC address yet, so it broadcasts an ARP request. It never ARPs for the server: the server is not on its network." },
        { at: 1, note: "SW1 learns that " + PC + " lives on the port the frame arrived on. A broadcast is flooded out of every other port in the VLAN." },
        { at: 2, head: [["Source MAC", R0], ["Destination MAC", PC], ["Message", "ARP reply: 192.168.1.1 is at " + R0]], note: "R1 answers with the MAC of its LAN interface. The reply is a unicast straight back to PC-A, and SW1 learns R1's MAC on the way." },
        { link: 0, head: hdr(PC, R0, true), note: "Now the real frame. Destination MAC is the GATEWAY. Destination IP is the SERVER. That split is the whole idea." },
        { at: 1, head: hdr(PC, R0), note: "SW1 reads only the destination MAC, finds it in its MAC address table and forwards out of that one port. A switch changes nothing in the frame." },
        { at: 2, head: hdr(PC, R0), note: "R1 sees its own MAC, removes the frame and looks up 10.5.5.5 in its routing table: a connected network on its other interface. It lowers the TTL by 1." },
        { link: 2, head: hdr(R1, SV, true), note: "R1 builds a NEW frame for the next link. Source MAC is its own outgoing interface, destination MAC is the server (found by ARP on that side). The IP addresses have not changed." },
        { at: 3, head: hdr(R1, SV), note: "SW2 forwards by destination MAC, exactly as SW1 did." },
        { at: 4, head: hdr(R1, SV), note: "The server accepts the frame. Its reply makes the same journey in reverse: a frame to ITS gateway, then R1 re-frames it towards PC-A. If R1 had no route back, the reply would die there." }],
      takeaway: "IP addresses are end to end. MAC addresses last one hop. That is why a PC with the wrong default gateway can reach its own LAN but nothing beyond." },
    vlan: { title: "A frame through an access port and a trunk", intro: "Two PCs in VLAN 10 on different switches. Watch where the 802.1Q tag appears and disappears.",
      nodes: [{ label: "PC-A", kind: "pc" }, { label: "SW1", kind: "switch" }, { label: "SW2", kind: "switch" }, { label: "PC-B", kind: "pc" }],
      steps: [
        { link: 0, head: [["802.1Q tag", "none"], ["Frame size", "normal"]], note: "PC-A sends an ordinary untagged frame. PCs know nothing about VLANs." },
        { at: 1, head: [["802.1Q tag", "none"], ["Switch remembers", "VLAN 10"]], note: "The frame arrives on an access port assigned to VLAN 10 (switchport access vlan 10). The port's VLAN decides which VLAN the frame belongs to." },
        { link: 1, head: [["802.1Q tag", "VLAN ID 10", true], ["Frame size", "+ 4 bytes", true]], note: "To cross the trunk, SW1 inserts a 4-byte 802.1Q tag carrying VLAN ID 10, provided VLAN 10 is in the trunk's allowed list. Only the native VLAN (default 1) crosses untagged." },
        { at: 2, head: [["802.1Q tag", "read, then removed", true], ["Switch remembers", "VLAN 10"]], note: "SW2 reads the tag, so it knows the frame is VLAN 10, then strips the tag." },
        { link: 2, head: [["802.1Q tag", "none"], ["Frame size", "normal"]], note: "SW2 forwards only out of ports in VLAN 10. PC-B receives a normal untagged frame and never knew a tag existed." }],
      takeaway: "Faults to picture here: VLAN 10 missing from the allowed list (the frame is dropped at the trunk), the VLAN not created on SW2, or mismatched native VLANs (untagged frames land in the wrong VLAN)." },
    pat: { title: "PAT: many private hosts, one public address", intro: "A PC on 192.168.1.0/24 opens a web page. Watch R1 rewrite the source and remember what it did.",
      nodes: [{ label: "PC", kind: "pc" }, { label: "R1 (NAT)", kind: "router" }, { label: "Internet", kind: "cloud", wan: true }, { label: "Web", kind: "server" }],
      steps: [
        { link: 0, head: [["Source", "192.168.1.10:51000"], ["Destination", "198.51.100.7:443"]], note: "The PC sends from its private address. This source is the INSIDE LOCAL address." },
        { at: 1, head: [["Source", "192.168.1.10:51000"], ["Destination", "198.51.100.7:443"]], note: "The packet arrives on the interface marked ip nat inside and is routed towards the one marked ip nat outside. Its source matches the NAT access list, so it must be translated." },
        { link: 1, head: [["Source", "203.0.113.5:51000", true], ["Destination", "198.51.100.7:443"]], note: "R1 swaps the source for its own outside address (the INSIDE GLOBAL address) and writes the mapping in its table. The port keeps the conversations apart: that is the overload in the command.",
          table: ["R1# show ip nat translations", "Pro Inside global      Inside local       Outside global\ntcp 203.0.113.5:51000  192.168.1.10:51000 198.51.100.7:443"] },
        { at: 3, head: [["Source", "203.0.113.5:51000"], ["Destination", "198.51.100.7:443"]], note: "The web server only ever sees 203.0.113.5. It replies to that address and port." },
        { link: 1, head: [["Source", "198.51.100.7:443"], ["Destination", "203.0.113.5:51000"]], note: "The reply reaches R1's outside interface." },
        { at: 1, head: [["Source", "198.51.100.7:443"], ["Destination", "192.168.1.10:51000", true]], note: "R1 looks up port 51000 in its table and rewrites the destination back to the PC. A reply with no table entry is dropped: nothing outside can start a conversation through PAT.",
          table: ["A second PC that happens to use the same source port gets a different one", "Pro Inside global      Inside local       Outside global\ntcp 203.0.113.5:51000  192.168.1.10:51000 198.51.100.7:443\ntcp 203.0.113.5:1024   192.168.1.11:51000 198.51.100.7:443"] }],
      takeaway: "No translations at all usually means ip nat inside and ip nat outside are missing or swapped, or the access list does not match the inside subnet." }
  };
  var SEQS = {
    dhcp: { title: "DHCP through a relay", intro: "The client and the DHCP server are in different subnets. R1 has ip helper-address on the interface facing the client.", actors: ["Client", "R1 (relay)", "Server"],
      steps: [
        { from: 0, to: 1, label: "DISCOVER (broadcast)", note: "The client has no address yet. It broadcasts from 0.0.0.0 to 255.255.255.255, UDP port 68 to 67. Routers do not forward broadcasts, so on its own this never leaves the VLAN." },
        { from: 1, to: 2, label: "DISCOVER (unicast)", note: "Because of ip helper-address, R1 re-sends the message as a unicast to the server. It writes its own client-facing address into the giaddr field, which tells the server which pool to use." },
        { from: 2, to: 1, label: "OFFER", note: "The server picks a free address from the pool whose network contains giaddr, and replies to the relay." },
        { from: 1, to: 0, label: "OFFER", note: "R1 passes the offer to the client." },
        { from: 0, to: 1, label: "REQUEST (broadcast)", note: "The client asks for the address it was offered. It broadcasts so that any other server knows its offer was not taken." },
        { from: 1, to: 2, label: "REQUEST (unicast)", note: "Relayed to the server, as before." },
        { from: 2, to: 1, label: "ACK", note: "The server confirms the lease and records the binding (show ip dhcp binding)." },
        { from: 1, to: 0, label: "ACK", note: "The client configures its address, mask, default gateway and DNS server. Discover, Offer, Request, Acknowledge: DORA." }],
      takeaway: "No helper address, or the helper on the wrong interface: the Discover never reaches the server and the client gives itself a 169.254.x.x address." },
    tcp: { title: "The TCP three-way handshake", intro: "Every TCP connection (SSH, HTTPS, Telnet) starts like this. Knowing it lets you read a packet capture.", actors: ["Client", "Server"],
      steps: [
        { from: 0, to: 1, label: "SYN", note: "The client asks to open a connection to a port, for example TCP 443." },
        { from: 1, to: 0, label: "SYN, ACK", note: "A service is listening on that port. The server agrees and acknowledges the client's SYN." },
        { from: 0, to: 1, label: "ACK", note: "The client acknowledges. The connection is open in both directions." },
        { from: 0, to: 1, label: "Data", note: "Only now does the application talk. If you see all three handshake packets in a capture, the network path is fine: look at the application." },
        { from: 1, to: 0, label: "RST (instead of SYN, ACK)", dashed: true, note: "A different outcome. A reset in reply to the SYN means the host was reached but nothing is listening on that port, or it refused. That is a server problem, not a routing problem." },
        { from: 0, to: 1, label: "SYN ... SYN ... SYN (no reply)", dashed: true, note: "Another outcome. The SYN repeated with nothing coming back means it is being dropped silently: an ACL or firewall, no return route, or the host is down." }],
      takeaway: "Three pictures to remember: handshake completes (network good), SYN then RST (port closed), SYN repeated (dropped on the way or on the way back)." },
    ospf: { title: "How two OSPF routers become neighbours", intro: "Each message moves the neighbour through a state. show ip ospf neighbor tells you where it stopped.", actors: ["R1", "R2"],
      steps: [
        { from: 0, to: 1, label: "Hello", state: "R2 shows R1 as: INIT", note: "R2 hears R1's hello. Init means: I can hear you, but you have not listed me yet. Stuck here means one-way traffic." },
        { from: 1, to: 0, label: "Hello (lists R1)", state: "2-WAY", note: "R1 sees its own router ID in R2's hello. To get this far the area, subnet and mask, and hello and dead timers must all match. On Ethernet the DR and BDR are elected now." },
        { from: 0, to: 1, label: "DBD (who leads?)", state: "EXSTART", note: "They agree who leads the exchange (the higher router ID). Stuck in ExStart or Exchange usually means an MTU mismatch." },
        { from: 1, to: 0, label: "DBD (summary of my database)", state: "EXCHANGE", note: "Each router sends a summary of the link-state database it holds." },
        { from: 0, to: 1, label: "LSR (send me these)", state: "LOADING", note: "R1 asks for the entries it is missing or that are newer." },
        { from: 1, to: 0, label: "LSU (here they are)", state: "LOADING", note: "R2 sends them, and R1 acknowledges." },
        { from: 0, to: 1, label: "LSAck", state: "FULL", note: "Both databases match. Full is the goal. On Ethernet, two routers that are neither DR nor BDR stop at 2-Way with each other, and that is normal." }],
      takeaway: "No neighbour at all: check area, subnet, timers and passive-interface. Stuck in ExStart: check MTU. Full: the adjacency is healthy, so look elsewhere." }
  };

  A.VISUALS = [
    { id: "subnet", title: "Subnetting, bit by bit", sub: "Move the prefix and see the network and host bits", obj: ["1.3"], open: subnetExplorer },
    { id: "packet", title: "Follow a packet across a router", sub: "Which addresses change at each hop", obj: ["2.4"], open: function (b) { pathWalk(WALKS.packet, b); } },
    { id: "tcp", title: "The TCP three-way handshake", sub: "And what a failed one looks like in a capture", obj: ["2.4"], open: function (b) { seqWalk(SEQS.tcp, b); } },
    { id: "ipv6", title: "IPv6 addresses and EUI-64", sub: "Shorten any address, build one from a MAC", obj: ["1.4"], open: ipv6Explorer },
    { id: "dhcp", title: "DHCP through a relay", sub: "DORA, and what ip helper-address does", obj: ["1.7"], open: function (b) { seqWalk(SEQS.dhcp, b); } },
    { id: "vlan", title: "A frame through a trunk", sub: "Where the 802.1Q tag goes on and comes off", obj: ["2.1", "2.2"], open: function (b) { pathWalk(WALKS.vlan, b); } },
    { id: "stp", title: "Spanning tree you can change", sub: "Set priorities, watch the root and the blocked port", obj: ["2.5"], open: stpExplorer },
    { id: "route", title: "Which route wins?", sub: "Longest prefix match on a real routing table", obj: ["3.1", "3.2"], open: routeLookup },
    { id: "ospf", title: "OSPF neighbour states", sub: "Hello to Full, and where it gets stuck", obj: ["3.3"], open: function (b) { seqWalk(SEQS.ospf, b); } },
    { id: "pat", title: "PAT, step by step", sub: "How one public address serves a whole LAN", obj: ["4.3"], open: function (b) { pathWalk(WALKS.pat, b); } },
    { id: "acl", title: "An ACL, line by line", sub: "First match wins, and the hidden last line", obj: ["4.6"], open: aclStepper }
  ];
  A.visualsFor = function (objective) { return A.VISUALS.filter(function (v) { return v.obj.indexOf(objective) >= 0; }); };
})(window.CCNA);
