/* course.js: "from zero" courses. Unlike the lessons (which are revision notes), a course assumes nothing:
   one small idea per chapter, a picture, then a question you must get right before moving on. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame, T = A._subnet, NS = "http://www.w3.org/2000/svg";
  function S(tag, attrs, kids) { var el = document.createElementNS(NS, tag), k; for (k in attrs) { if (k === "text") el.textContent = attrs[k]; else el.setAttribute(k, attrs[k]); } (kids || []).forEach(function (c) { el.appendChild(c); }); return el; }
  function p(t) { return h("p", { text: t }); }
  function ul(items) { return h("ul", { class: "plain" }, items.map(function (t) { return h("li", { text: t }); })); }
  function ol(items) { return h("ol", { class: "plain" }, items.map(function (t) { return h("li", { text: t }); })); }
  function key(t) { return h("div", { class: "notice info", text: t }); }
  function table(head, rows) { return h("div", { class: "panel tbl" }, [h("table", {}, [h("tr", {}, head.map(function (c) { return h("th", { text: c }); }))].concat(rows.map(function (r) { return h("tr", {}, r.map(function (c) { return h("td", { class: "mono", text: c }); })); })))]); }

  /* A question the learner must get right. options[0] is the right answer; the rest are [text, why it is wrong]. */
  function ask(gate, q, options, why) {
    gate.need++;
    var out = h("div"), solved = false, list = h("div", { class: "stack" });
    A.shuffle(options.map(function (o, i) { return { text: i ? o[0] : o, right: !i, note: i ? o[1] : "" }; })).forEach(function (o) {
      list.appendChild(h("button", { class: "opt", type: "button", onclick: function (e) {
        if (solved) return; var b = e.currentTarget;
        if (o.right) { solved = true; b.classList.add("right"); b.querySelector(".mark").textContent = "✓"; A.setKids(out, [h("div", { class: "notice ok", text: "Yes. " + why })]); gate.done(); }
        else { b.classList.add("wrong"); b.disabled = true; b.querySelector(".mark").textContent = "✕"; A.setKids(out, [h("div", { class: "notice", text: "Not that one. " + (o.note || "Look at the picture again and try another.") })]); }
      } }, [h("span", { class: "mark" }), h("span", { class: "txt", text: o.text })]));
    });
    return h("div", { class: "panel stack ask" }, [h("span", { class: "eyebrow", text: "Your turn" }), h("p", { class: "qtext", text: q }), list, out]);
  }

  /* ---------- pictures ---------- */
  function sitePicture() {
    var k = [S("rect", { x: 4, y: 10, width: 120, height: 120, rx: 10, fill: "var(--surface)", stroke: "var(--bad)", "stroke-width": 2 }), S("text", { x: 64, y: 148, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)", text: "One big network" })], i, names = ["Tills", "CCTV", "Office", "Guests"];
    for (i = 0; i < 30; i++) k.push(S("circle", { cx: 18 + (i % 6) * 18, cy: 26 + Math.floor(i / 6) * 22, r: 4, fill: "var(--muted)" }));
    names.forEach(function (n, j) { var x = 196 + (j % 2) * 76, y = 10 + Math.floor(j / 2) * 66;
      k.push(S("rect", { x: x, y: y, width: 62, height: 52, rx: 8, fill: "var(--accent-soft)", stroke: "var(--accent)", "stroke-width": 2 })); k.push(S("text", { x: x + 31, y: y + 17, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "var(--ink)", text: n }));
      for (var d = 0; d < 4; d++) k.push(S("circle", { cx: x + 13 + d * 12, cy: y + 36, r: 4, fill: "var(--accent)" }));
      k.push(S("line", { x1: x + 31, y1: j < 2 ? y + 52 : y, x2: 265, y2: 69, stroke: "var(--muted)", "stroke-width": 1.5 })); });
    k.push(S("circle", { cx: 265, cy: 69, r: 13, fill: "var(--surface)", stroke: "var(--ink)", "stroke-width": 2 })); k.push(S("text", { x: 265, y: 73, "text-anchor": "middle", "font-size": 9, "font-weight": 700, fill: "var(--ink)", text: "R" }));
    k.push(S("text", { x: 265, y: 148, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)", text: "Four subnets, one router" }));
    k.push(S("path", { d: "M140 70h34m-8 -6l8 6-8 6", fill: "none", stroke: "var(--muted)", "stroke-width": 2 }));
    return S("svg", { viewBox: "0 0 340 154", class: "vis-svg", role: "img", "aria-label": "One large network compared with four subnets joined by a router" }, k);
  }
  function partsDemo() {
    var parts = ["192", "168", "10", "77"], pre = 24, row = h("div", { class: "parts" }), cap = h("div", { class: "stack tight small" }), btns = h("div", { class: "row" });
    function paint() {
      var n = pre / 8;
      A.setKids(row, parts.map(function (x, i) { return h("span", { class: "part " + (i < n ? "net" : "hostb"), text: x }); }));
      A.setKids(cap, [h("span", { text: "Street (network): " + parts.slice(0, n).join(".") }), h("span", { text: "House number (host): " + parts.slice(n).join(".") }), h("span", { text: "Neighbours: every address that starts " + parts.slice(0, n).join(".") + "." })]);
      Array.prototype.forEach.call(btns.children, function (b) { b.className = "btn " + (b.dataset.p === String(pre) ? "" : "quiet"); });
    }
    [8, 16, 24].forEach(function (v) { btns.appendChild(h("button", { class: "btn quiet", type: "button", "data-p": String(v), text: "Line after number " + (v / 8) + "  (/" + v + ")", onclick: function () { pre = v; paint(); } })); });
    paint();
    return h("div", { class: "stack" }, [row, h("div", { class: "legend" }, [h("span", { class: "key net", text: "street (network part)" }), h("span", { class: "key hostb", text: "house number (host part)" })]), cap, btns]);
  }
  function rangeBar() {
    return h("div", { class: "stack tight" }, [h("div", { class: "segbar" }, [h("span", { class: "seg s-net", style: "flex:0 0 56px", text: ".0" }), h("span", { class: "seg s-use", text: ".1  to  .254" }), h("span", { class: "seg s-bc", style: "flex:0 0 56px", text: ".255" })]),
      h("div", { class: "legend" }, [h("span", { class: "key k-a", text: "network address" }), h("span", { class: "key k-d", text: "254 usable" }), h("span", { class: "key hostb", text: "broadcast" })])]);
  }
  function halver() {
    var cuts = 0, bar = h("div", { class: "segbar" }), info = h("div"), more = h("button", { class: "btn", type: "button", id: "cut-more", text: "Cut every piece in half", onclick: function () { if (cuts < 6) { cuts++; paint(); } } });
    function paint() {
      var n = Math.pow(2, cuts), size = 256 / n;
      A.setKids(bar, A.range(n).map(function (i) { return h("span", { class: "seg " + (i % 2 ? "s-b" : "s-a"), text: n <= 8 ? String(i * size) : "" }); }));
      A.setKids(info, [h("dl", { class: "facts" }, [h("dt", { text: "Written as" }), h("dd", { text: "/" + (24 + cuts) }), h("dt", { text: "Mask" }), h("dd", { text: "255.255.255." + (256 - size) }), h("dt", { text: "Number of subnets" }), h("dd", { text: String(n) }),
        h("dt", { text: "Addresses in each (block size)" }), h("dd", { text: String(size) }), h("dt", { text: "Usable by devices (minus 2)" }), h("dd", { text: String(size - 2) })])]);
      more.disabled = cuts >= 6;
    }
    paint();
    return h("div", { class: "stack" }, [h("p", { class: "small muted", text: "The bar is the last number of the address, 0 on the left to 255 on the right. Each piece is one subnet, labelled with where it starts." }), bar, h("div", { class: "panel" }, [info]),
      h("div", { class: "row" }, [h("button", { class: "btn quiet", type: "button", text: "Start again", onclick: function () { cuts = 0; paint(); } }), more])]);
  }
  function blockLine(block, pin) {            /* at most four blocks: the one holding the pin and its neighbours */
    var total = 256 / block, at = pin == null ? 0 : Math.floor(pin / block), from = total <= 4 ? 0 : Math.max(0, Math.min(at - 1, total - 3)), to = total <= 4 ? total : from + 3, kids = [], n;
    function gap() { return h("span", { class: "blk gap", text: "\u2026" }); }
    if (from > 0) kids.push(gap());
    for (n = from; n < to; n++) { var cur = pin != null && n === at;
      kids.push(h("span", { class: "blk" + (cur ? " cur" : "") }, [h("span", { class: "rng", text: (n * block) + "\u2013" + (n * block + block - 1) }), cur ? h("span", { class: "pin", text: "\u25b2 " + pin }) : null])); }
    if (to < total) kids.push(gap());
    return h("div", { class: "numline" }, kids);
  }
  /* A worked example in the course's own plain words (no binary). */
  function worked(ipS, pre) {
    var host = T.parseIp(ipS), mask = T.maskOf(pre), idx = Math.floor(pre / 8), mo = Number(T.ip(mask).split(".")[idx]), block = 256 - mo, v = Number(ipS.split(".")[idx]), start = v - (v % block), size = Math.pow(2, 32 - pre),
        net = (host & mask) >>> 0, bc = net + size - 1, ord = ["first", "second", "third", "fourth"][idx], count = [], n;
    for (n = Math.max(0, start - 2 * block); n <= Math.min(255, start + block) && count.length < 5; n += block) count.push(n);
    function step(k, title, text, extra) { return h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: "Step " + k + " \u00b7 " + title }), h("p", { text: text }), extra || null]); }
    return h("div", { class: "panel stack" }, [h("p", { class: "qtext mono", text: ipS + " /" + pre }),
      step(1, "block size", "The mask for /" + pre + " is " + T.ip(mask) + ". The mask number that is not 255 or 0 is " + mo + ". 256 minus " + mo + " is " + block + "."),
      step(2, "find the block", "Count up in " + block + "s in the " + ord + " number: " + (count[0] > 0 ? "... " : "") + count.join(", ") + " ... The address has " + v + " there. The last one that is not bigger than " + v + " is " + start + ".", blockLine(block, v)),
      step(3, "network address", "The first address of that block: " + T.ip(net) + "."),
      step(4, "broadcast", "The next block starts at " + T.ip(net + size) + ". One address before that is " + T.ip(bc) + "."),
      h("div", { class: "notice ok", text: "Devices can use " + T.ip(net + 1) + " to " + T.ip(bc - 1) + ". That is " + (size - 2).toLocaleString("en-GB") + " addresses." })]);
  }

  /* One problem, one step at a time, with a hint on the first slip and the answer on the second. */
  function guided(gate, ipS, pre) {
    gate.need++;
    var host = T.parseIp(ipS), mask = T.maskOf(pre), idx = Math.floor(pre / 8), mo = Number(T.ip(mask).split(".")[idx]), block = 256 - mo, v = Number(ipS.split(".")[idx]), start = v - (v % block), size = Math.pow(2, 32 - pre),
        net = (host & mask) >>> 0, bc = net + size - 1, ord = ["first", "second", "third", "fourth"][idx], near = [], n, box = h("div", { class: "stack" }), i = 0;
    for (n = Math.max(0, start - 2 * block); n <= Math.min(255, start + block); n += block) near.push(n);
    var steps = [
      { q: "The mask for /" + pre + " is " + T.ip(mask) + ". Block size is 256 minus " + mo + ". What is it?", mode: "num", ok: function (x) { return Number(x) === block; }, hint: "Take " + mo + " away from 256.", ans: String(block) },
      { q: "Count up in " + block + "s in the " + ord + " number. Which multiple of " + block + " starts the block that " + v + " sits in?", mode: "num", ok: function (x) { return Number(x) === start; }, hint: "They go ... " + near.join(", ") + " ... Pick the last one that is not bigger than " + v + ".", ans: String(start) },
      { q: "So what is the network address of this subnet?", mode: "ip", ok: function (x) { return T.parseIp(x) === net; }, hint: "Put " + start + " in the " + ord + " number" + (idx < 3 ? " and 0 in the number after it." : "."), ans: T.ip(net) },
      { q: "The next subnet starts at " + T.ip(net + size) + ". The broadcast is the very last address before that. What is it?", mode: "ip", ok: function (x) { return T.parseIp(x) === bc; }, hint: "One address before " + T.ip(net + size) + ".", ans: T.ip(bc) }];
    function paint(done) {
      var kids = [h("p", { class: "qtext", text: "Find the subnet of " + ipS + " /" + pre })];
      done.forEach(function (d) { kids.push(h("div", { class: "rv ok" }, [h("span", { class: "small", text: d[0] }), h("strong", { class: "mono", text: d[1] })])); });
      if (i >= steps.length) { kids.push(h("div", { class: "notice ok", text: "That is the whole method. Devices can use " + T.ip(net + 1) + " to " + T.ip(bc - 1) + ": " + (size - 2).toLocaleString("en-GB") + " addresses." })); A.setKids(box, kids); gate.done(); return; }
      var st = steps[i], tries = 0, msg = h("div"), inp = h("input", { class: "answer", type: "text", inputmode: "decimal", autocomplete: "off", "aria-label": "Your answer", placeholder: st.mode === "ip" ? "0.0.0.0" : "number" });
      kids.push(h("form", { class: "stack", onsubmit: function (e) { e.preventDefault(); if (!inp.value.trim()) return;
        if (st.ok(inp.value)) { done.push([st.q, st.ans]); i++; paint(done); return; }
        tries++; if (tries === 1) A.setKids(msg, [h("div", { class: "notice", text: "Not quite. Hint: " + st.hint })]);
        else { done.push([st.q, st.ans + "  (shown to you)"]); i++; paint(done); } } },
        [h("p", { text: "Step " + (i + 1) + " of " + steps.length + ". " + st.q }), inp, msg, h("button", { class: "btn ghost", type: "submit", text: "Check" })]));
      A.setKids(box, kids);
    }
    paint([]);
    return h("div", { class: "panel stack ask" }, [h("span", { class: "eyebrow", text: "Your turn, one step at a time" }), box]);
  }

  /* ---------- the subnetting course ---------- */
  var SUBNET = [
    { t: "Why split a network at all?", make: function (g) { return [
      p("Picture a site with one big network: 250 devices all plugged into the same flat network. It works, but it has three problems."),
      ul(["Noise. Devices regularly shout to everyone at once (a broadcast), for example to ask \"who has this address?\". On one big network every shout reaches all 250 devices.", "No walls. The CCTV, the tills and the guest Wi-Fi can all see each other.", "One fault hits everyone. A loop or a faulty device flooding the network takes the whole site down."]),
      sitePicture(),
      p("Subnetting is the fix. You cut the one big block of addresses into several smaller networks. Each small network is a subnet. Devices in the same subnet talk to each other directly. To reach a different subnet they must go through a router, and the router is where you control what is allowed."),
      key("You have already done this. Every VLAN you create in the Meraki dashboard gets its own subnet, and the address you give the MX for that VLAN is the router for it. Subnetting is simply the maths behind that screen."),
      ask(g, "A till in the Tills subnet needs to reach a camera in the CCTV subnet. What must its traffic pass through?", ["A router (its default gateway)", ["Nothing. Devices on the same site reach each other directly", "Being on the same site is not enough. Different subnets are different networks."], ["Another switch port", "A switch only moves traffic inside one network."]],
        "Different subnets are different networks, and only a router (or a Layer 3 switch doing the routing) moves traffic between networks. That is what the default gateway setting on a device points at.")]; } },
    { t: "An address has two parts", make: function (g) { return [
      p("An IP address such as 192.168.10.77 looks like one thing, but it is really two things joined together, like a postal address: a street and a house number."),
      ul(["The network part is the street. Everyone in the same subnet shares it.", "The host part is the house number. It is different for every device on that street."]),
      p("Where does the street end and the house number begin? The address on its own does not say. Move the dividing line and watch what changes:"),
      partsDemo(),
      ask(g, "Put the line after the SECOND number (/16). Which of these is on the same network as 172.16.5.9?", ["172.16.200.1", ["172.17.5.9", "The second number differs (17, not 16), so the street is different."], ["10.16.5.9", "The first number differs, so it is a different street entirely."]],
        "With /16 the street is the first two numbers: 172.16. Anything starting 172.16 is a neighbour, whatever the last two numbers are.")]; } },
    { t: "The mask draws the line", make: function (g) { return [
      p("The thing that says where the line goes is the subnet mask. It is written in two ways that mean exactly the same."),
      table(["Short way", "Long way", "Street is the first..."], [["/8", "255.0.0.0", "1 number"], ["/16", "255.255.0.0", "2 numbers"], ["/24", "255.255.255.0", "3 numbers"]]),
      p("Read the long way like this: 255 means \"this whole number is part of the street name\". 0 means \"this number is house number\"."),
      p("The short way just counts. Each of the four numbers in an address is 8 bits (eight ones and zeros). /24 means the first 24 bits are street, and 24 is three lots of 8: three whole numbers."),
      key("An address is never complete without its mask. 10.1.1.5 on its own tells you nothing about who its neighbours are."),
      ask(g, "A PC has the address 10.20.30.40 with the mask 255.255.255.0. What is its street (network part)?", ["10.20.30", ["10", "That would be the mask 255.0.0.0."], ["10.20", "That would be the mask 255.255.0.0."]], "Three 255s, so the first three numbers are the street. The 40 is the house number."),
      ask(g, "What is 255.255.255.0 written the short way?", ["/24", ["/8", "/8 is one number of street: 255.0.0.0."], ["/16", "/16 is two numbers of street: 255.255.0.0."], ["/255", "The short way counts bits, and it never goes above 32."]], "Three numbers of 8 bits each: 24.")]; } },
    { t: "Two addresses you cannot use", make: function (g) { return [
      p("Take the network 192.168.10.0 with a /24 mask. The last number is the house number, so it can be anything from 0 to 255. That is 256 addresses."),
      p("But two of them are reserved, on every subnet of every size:"),
      ul(["The FIRST one (192.168.10.0) is the network address. It is the name of the street itself. Routers and configurations use it to mean \"this whole subnet\". No device may have it.", "The LAST one (192.168.10.255) is the broadcast address. Sending to it means \"everyone on this street\". No device may have it either."]),
      rangeBar(),
      key("So a /24 has 256 addresses but 254 you can give to devices. That \"minus 2\" applies to every subnet, and the exam asks about it constantly."),
      ask(g, "On the network 10.5.5.0/24, which of these can you give to a printer?", ["10.5.5.254", ["10.5.5.0", "That is the first address: the network address."], ["10.5.5.255", "That is the last address: the broadcast."], ["10.5.6.1", "The third number changed, so that is a different street."]], "254 is the last usable address. Everything from .1 to .254 is fine.")]; } },
    { t: "Cutting a network in half", make: function (g) { return [
      p("A /24 is not always the right size. A link between two routers needs 2 addresses, not 254. And one /24 may have to become four separate networks: tills, CCTV, office, guests."),
      p("The trick is to move the dividing line one step to the right. Every step cuts each network exactly in half. Try it, several times:"),
      halver(),
      p("Look at what happened. Each cut adds 1 to the slash number and halves the size. The sizes are always the same row of numbers:"),
      table(["Short way", "Block size", "Usable"], [["/25", "128", "126"], ["/26", "64", "62"], ["/27", "32", "30"], ["/28", "16", "14"], ["/29", "8", "6"], ["/30", "4", "2"]]),
      key("128, 64, 32, 16, 8, 4. Learn that row and you have learned most of subnetting."),
      ask(g, "You need a subnet for 50 devices. Which is the smallest that fits?", ["/26 (62 usable)", ["/27 (30 usable)", "30 is fewer than 50. Too small."], ["/25 (126 usable)", "It fits, but a smaller one does too. Wasting addresses loses marks."], ["/24 (254 usable)", "It fits, but it is far bigger than needed."]], "62 is the first size that holds 50. The next size down, 30, does not."),
      ask(g, "A /30 has how many usable addresses, and what is it for?", ["2. A link between two routers", ["4. A small office", "The block is 4, but two of those are the network and broadcast addresses."], ["30. A small office", "The 30 is the slash number, not a count of devices."]], "Block size 4, minus the network and the broadcast, leaves 2: one for each end of a link.")]; } },
    { t: "Where each subnet starts", make: function (g) { return [
      p("Cut 192.168.10.0/24 into /26 pieces and each piece is 64 addresses. So the pieces start at 0, 64, 128 and 192. You just count up in 64s."),
      blockLine(64, null),
      p("That 64 is called the block size. You can always get it from the mask: 256 minus the last mask number. A /26 mask is 255.255.255.192, and 256 minus 192 is 64."),
      p("Inside each block the rule from before still holds: the first address is the network address and the last is the broadcast. In the block 64 to 127 the network is .64, the broadcast is .127, and devices use .65 to .126."),
      ask(g, "The subnets are /26. Which block is the address 192.168.10.130 in?", ["128 to 191", ["64 to 127", "130 is bigger than 127."], ["192 to 255", "130 is smaller than 192."], ["0 to 63", "130 is well past 63."]], "Count up in 64s: 0, 64, 128, 192. The last one that is not bigger than 130 is 128."),
      ask(g, "So what is the broadcast address of that subnet?", ["192.168.10.191", ["192.168.10.255", "That would be the broadcast if the whole /24 were one network. Here it is cut into four."], ["192.168.10.128", "That is the first address of the block: the network address."], ["192.168.10.192", "That is where the NEXT subnet starts."]], "The last address in the block 128 to 191. One more and you are in the next subnet."),
      ask(g, "A /27 mask ends in .224. What is the block size?", ["32", ["224", "224 is the mask number. Take it away from 256."], ["27", "27 is the slash number."], ["64", "64 is the block size for /26."]], "256 minus 224 is 32. So /27 subnets start at 0, 32, 64, 96 and so on.")]; } },
    { t: "The four-step method", make: function (g) { return [
      p("You now have every piece. To find the subnet of any address, do the same four steps every time:"),
      ol(["Block size: 256 minus the mask number.", "Count up in blocks until you reach the block the address is in.", "The first address of that block is the network address.", "One below the start of the next block is the broadcast. Devices use everything in between."]),
      h("h2", { text: "Watch one being done" }), worked("192.168.10.77", 27),
      h("h2", { text: "Now you do one" }), guided(g, "192.168.1.100", 26),
      h("h2", { text: "And one more" }), guided(g, "10.1.1.200", 28)]; } },
    { t: "When the cut is in another number", make: function (g) { return [
      p("So far the dividing line has been inside the last number. For /17 to /23 it sits inside the THIRD number instead. Nothing else changes: the same four steps, one number to the left."),
      p("Take 172.16.37.200 with /20. The mask is 255.255.240.0. The mask number that is neither 255 nor 0 is the third one: 240. So the block size is 256 minus 240 = 16, counted in the third number: 0, 16, 32, 48... The address has 37 there, which sits in the 32 block."),
      p("Network: 172.16.32.0. The next block starts at 172.16.48.0, so the broadcast is the address just before it: 172.16.47.255. The last number runs all the way from 0 to 255, because it is entirely house number."),
      h("h2", { text: "The same thing, laid out as the four steps" }), worked("172.16.37.200", 20),
      h("h2", { text: "Your turn" }), guided(g, "10.10.70.9", 22)]; } },
    { t: "What goes wrong on site", make: function (g) { return [
      p("This is why the exam, and real life, care. A device uses its own address and mask to decide one thing: \"is the destination on my street, or do I hand it to the gateway?\" Give it the wrong mask or gateway and it decides wrongly."),
      ul(["Gateway outside the subnet. A PC on 192.168.10.130 /26 lives in the block 128 to 191. If its gateway is set to 192.168.10.1 it can never reach it. It talks to its own subnet and nothing else.",
          "Mask too wide. The PC believes a server in another subnet is a neighbour and tries to reach it directly instead of through the router. Everything else works, so the fault looks strange.",
          "A device given the network or broadcast address. It will not work, and a router refuses the command outright.",
          "Overlapping subnets. Two networks claiming the same addresses. A router refuses to configure the second one."]),
      ask(g, "A PC is 192.168.10.130, mask 255.255.255.192, gateway 192.168.10.126. It can reach the PCs beside it but not the internet. Why?", ["The gateway is in a different subnet: 126 is in the block 64 to 127, the PC is in 128 to 191",
        ["255.255.255.192 is not a real mask", "It is a real mask: /26, block size 64."], ["130 is a broadcast address", "In the block 128 to 191 the broadcast is 191. 130 is an ordinary host."]],
        "Block size 64. The PC sits in 128 to 191, the gateway in 64 to 127. A gateway must be on the same street as the device, otherwise the device has no way to hand traffic to it.")]; } },
    { t: "You can do this now", make: function () { return [
      p("That is subnetting. Everything in the exam is this, done faster:"),
      ul(["A subnet is a small network cut from a bigger block. Routers join subnets.", "The mask draws the line between street (network) and house number (host).", "Every subnet loses two addresses: the first (network) and the last (broadcast).", "Each step right halves the block: 128, 64, 32, 16, 8, 4.", "Block size = 256 minus the mask number. Count up in blocks to find where an address lives."]),
      p("Understanding it is the first half. Speed is the second, and speed only comes from repetition. Do a few questions a day, and when you get one wrong, tap \"Show me the picture\"."),
      h("button", { class: "btn", type: "button", text: "Drill 10 questions now", onclick: function () { A.runDrill("IPv4 mixed", A.genV4, 10, { backTo: A.learnMenu }); } }),
      h("button", { class: "btn ghost", type: "button", text: "Play with the bit-by-bit guide", onclick: function () { A.VISUALS[0].open(A.learnMenu); } }),
      key("Then tell Claude, in your own words, what a subnet mask does and why a /26 has 62 usable addresses. If you can explain it, you know it.")]; } }
  ];
  A.COURSES = [{ id: "subnet", title: "Subnetting from zero", sub: "What it is, why it exists and how to do it, one small step at a time", chapters: SUBNET }];
  A.courseDone = function (id) { return ((A.ST.learn.course || {})[id] || 0); };

  A.runCourse = function (id, at, backTo) {
    var course = A.COURSES.filter(function (c) { return c.id === id; })[0], exit = backTo || A.learnMenu, n = course.chapters.length;
    var i = at != null ? at : Math.min(A.courseDone(id), n - 1), ch = course.chapters[i], last = i === n - 1;
    var next = h("button", { class: "btn", type: "button", id: "course-next", text: last ? "Finish the course" : "Next: " + course.chapters[i + 1].t, onclick: function () {
      A.ST.learn.course = A.ST.learn.course || {};
      if (i + 1 > A.courseDone(id)) { A.ST.learn.course[id] = i + 1; A.touch("learn"); A.addHistory({ kind: "course", label: course.title + ", chapter " + (i + 1) + ": " + ch.t, total: gate.need, correct: gate.need }); }
      if (last) exit(); else A.runCourse(id, i + 1, backTo); } });
    var gate = { need: 0, got: 0, done: function () { gate.got++; paintGate(); } }, hint = h("p", { class: "small muted" });
    function paintGate() { var open = gate.got >= gate.need || i < A.courseDone(id); next.disabled = !open; hint.textContent = open ? "" : "Answer the question" + (gate.need > 1 ? "s" : "") + " above to carry on (" + gate.got + " of " + gate.need + " done)."; }
    var body = ch.make(gate);
    frame({ title: course.title, back: exit, backLabel: "Leave" }, [
      A.plate("Chapter " + (i + 1) + " of " + n, "", n, function (k) { return k < i ? "done" : k === i ? "now" : ""; }),
      h("h1", { text: ch.t }), h("div", { class: "stack course" }, body), hint,
      h("div", { class: "row" }, [i > 0 ? h("button", { class: "btn quiet", type: "button", text: "Back", onclick: function () { A.runCourse(id, i - 1, backTo); } }) : null, next])]);
    paintGate();
  };
})(window.CCNA);
