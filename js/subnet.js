/* subnet.js: the timed subnetting drill (IPv4, VLSM, IPv6). Ported from trainer/subnet.py.
   IPv4 addresses are unsigned 32-bit numbers; IPv6 addresses are arrays of eight 16-bit groups. */
(function (A) {
  "use strict";
  var h = A.h, frame = A.frame, rnd = A.rnd, pick1 = A.pick1, range = A.range, same = A.same, pct = A.pct, GOAL = A.GOAL, GOAL_ACC = A.GOAL_ACC;

  function ip(n) { n = n >>> 0; return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join("."); }
  function maskOf(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
  function parseIp(t) { var m = String(t).trim().replace(/,/g, ".").split("/")[0].trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/); if (!m) return null;
    var p = m.slice(1).map(Number); return p.some(function (x) { return x > 255; }) ? null : ((p[0] * 16777216) + (p[1] << 16) + (p[2] << 8) + p[3]) >>> 0; }
  function parseNum(t) { t = String(t).trim().replace(/^\//, "").replace(/[ ,]/g, ""); return /^\d+$/.test(t) ? Number(t) : null; }
  var PREFIXES = [24, 25, 26, 27, 28, 29, 30, 24, 25, 26, 27, 28, 29, 30, 24, 25, 26, 27, 28, 29, 30, 17, 18, 19, 20, 21, 22, 23, 17, 18, 19, 20, 21, 22, 23, 9, 10, 12, 14, 16, 8];
  function randHost(prefix) {
    prefix = prefix || pick1(PREFIXES);
    var r = Math.random(), a, b;
    if (r < 0.3) { a = 10; b = rnd(256); } else if (r < 0.5) { a = 172; b = 16 + rnd(16); } else if (r < 0.7) { a = 192; b = 168; }
    else { do { a = 1 + rnd(223); } while ([10, 127, 169, 172, 192].indexOf(a) >= 0); b = rnd(256); }
    var value = ((a * 16777216) + (b << 16) + rnd(65536)) >>> 0, size = Math.pow(2, 32 - prefix), net = (value & maskOf(prefix)) >>> 0;
    return { prefix: prefix, mask: maskOf(prefix), net: net, bcast: net + size - 1, host: net + 1 + rnd(size - 2), size: size };
  }
  function shown(s) { return Math.random() < 0.5 ? ip(s.host) + "/" + s.prefix : ip(s.host) + " with mask " + ip(s.mask); }
  function working(s) {
    var out = "/" + s.prefix + " = " + ip(s.mask) + ". ";
    if (s.prefix % 8 !== 0) { var i = Math.floor(s.prefix / 8), block = 256 - Number(ip(s.mask).split(".")[i]), v = Number(ip(s.host).split(".")[i]), start = v - (v % block);
      out += "Block size in octet " + (i + 1) + " is " + block + ". " + v + " sits in " + start + " to " + (start + block - 1) + ". "; }
    else out += "The mask ends on an octet boundary. ";
    return out + "Network " + ip(s.net) + ", broadcast " + ip(s.bcast) + ", hosts " + ip(s.net + 1) + " to " + ip(s.bcast - 1) + " (" + (s.size - 2).toLocaleString("en-GB") + " usable).";
  }
  function hintFor(s) { if (s.prefix % 8 === 0) return "The mask " + ip(s.mask) + " ends on an octet boundary. No block maths needed.";
    var i = Math.floor(s.prefix / 8), block = 256 - Number(ip(s.mask).split(".")[i]); return "Mask is " + ip(s.mask) + ". Work in octet " + (i + 1) + " with a block size of " + block + ": list the multiples of " + block + " and find the block your address sits in."; }
  function one(mode, label) { return [{ mode: mode, label: label || "Your answer" }]; }
  function ipQ(kind, prompt, target, s, extra) { return { kind: kind, prompt: prompt, vis: { host: s.host, prefix: s.prefix }, fields: one("ip"), answer: ip(target), check: function (v) { return parseIp(v[0]) === (target >>> 0); }, work: working(s), hint: hintFor(s) + (extra || "") }; }

  var GEN = {
    network: function () { var s = randHost(); return ipQ("network", "What is the NETWORK address of " + shown(s) + "?", s.net, s); },
    broadcast: function () { var s = randHost(); return ipQ("broadcast", "What is the BROADCAST address of " + shown(s) + "?", s.bcast, s); },
    first: function () { var s = randHost(); return ipQ("first", "What is the FIRST usable host in the subnet of " + shown(s) + "?", s.net + 1, s, " First host = network + 1."); },
    last: function () { var s = randHost(); return ipQ("last", "What is the LAST usable host in the subnet of " + shown(s) + "?", s.bcast - 1, s, " Last host = broadcast - 1."); },
    hosts: function () { var s = randHost(), t = s.size - 2, bits = 32 - s.prefix; return { kind: "hosts", prompt: "How many USABLE host addresses are in the subnet of " + shown(s) + "?", fields: one("num"), answer: t.toLocaleString("en-GB"),
      check: function (v) { return parseNum(v[0]) === t; }, work: "Host bits = 32 - " + s.prefix + " = " + bits + ". Usable hosts = 2^" + bits + " - 2 = " + t.toLocaleString("en-GB") + ".", hint: "Usable hosts = 2^(host bits) - 2. Host bits = 32 - prefix length." }; },
    which: function () { var s, a, major; do { s = randHost(pick1([18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30])); a = s.host >>> 24; major = a < 128 ? 8 : a < 192 ? 16 : 24; } while (s.prefix <= major);
      var q = ipQ("which", "Network " + ip(s.host & maskOf(major)) + "/" + major + " has been subnetted using /" + s.prefix + " (" + ip(s.mask) + "). Which subnet does host " + ip(s.host) + " belong to? Give the subnet's network address.", s.net, s); q.answer += "/" + s.prefix; return q; },
    mask: function () { var p = 8 + rnd(23), m = maskOf(p);
      if (Math.random() < 0.5) return { kind: "mask", prompt: "Write the mask " + ip(m) + " as a prefix length. Type the number after the slash.", fields: one("num"), answer: "/" + p, check: function (v) { return parseNum(v[0]) === p; },
        work: "Count the one-bits: " + ip(m) + " = /" + p + ".", hint: "Each 255 is 8 bits. Then 128=1, 192=2, 224=3, 240=4, 248=5, 252=6, 254=7 bits." };
      return { kind: "mask", prompt: "Write /" + p + " as a dotted-decimal subnet mask.", fields: one("ip"), answer: ip(m), check: function (v) { return parseIp(v[0]) === m; }, work: "/" + p + " = " + ip(m) + ".", hint: "Full octets are 255. The partial octet is one of 128, 192, 224, 240, 248, 252, 254." }; },
    wildcard: function () { var p = 8 + rnd(23), m = maskOf(p), w = (~m) >>> 0; return { kind: "wildcard", prompt: "What is the WILDCARD mask for " + (Math.random() < 0.5 ? "/" + p : ip(m)) + "? (used in ACLs and OSPF)", fields: one("ip"), answer: ip(w),
      check: function (v) { return parseIp(v[0]) === w; }, work: "Wildcard = 255.255.255.255 minus the subnet mask " + ip(m) + " = " + ip(w) + ".", hint: "Subtract each octet of the subnet mask from 255." }; },
    need: function () { var n = pick1([2, 5, 6, 10, 12, 14, 20, 25, 28, 30, 40, 50, 60, 62, 90, 100, 120, 126, 200, 250, 254, 300, 500, 510, 600, 1000, 1022, 2000, 4000]), bits = 2; while (Math.pow(2, bits) - 2 < n) bits++;
      return { kind: "need", prompt: "A subnet must support " + n + " hosts. What is the LONGEST prefix (smallest subnet) that fits them? Type the number after the slash.", fields: one("num"), answer: "/" + (32 - bits), check: function (v) { return parseNum(v[0]) === 32 - bits; },
        work: "Need 2^h - 2 >= " + n + ", so h = " + bits + " host bits (" + (Math.pow(2, bits) - 2) + " usable). Prefix = 32 - " + bits + " = /" + (32 - bits) + ".", hint: "Find the smallest power of 2 that is at least hosts + 2. Its exponent is the number of host bits." }; },
    same: function () { var t = randHost(pick1([20, 21, 22, 23, 25, 26, 27, 28, 29])), other;
      if (Math.random() < 0.5) { do { other = t.net + 1 + rnd(t.size - 2); } while (other === t.host); } else other = t.host + (Math.random() < 0.5 ? -1 : 1) * (Math.floor(t.size / 2) + rnd(Math.floor(t.size / 2) + 3));
      other = other >>> 0; var yes = other >= t.net && other <= t.bcast;
      return { kind: "same", prompt: "Are " + ip(t.host) + " and " + ip(other) + " in the SAME subnet when the mask is /" + t.prefix + " (" + ip(t.mask) + ")?", choices: ["Yes, same subnet", "No, different subnets"], answer: yes ? "Yes" : "No",
        check: function (v) { return (v[0] === 0) === yes; }, work: ip(t.host) + " is in " + ip(t.net) + "/" + t.prefix + ". " + ip(other) + " is in " + ip(other & t.mask) + "/" + t.prefix + ".", hint: hintFor(t) }; },
    vlsm: function () {
      for (;;) {
        var bp = pick1([24, 24, 24, 23, 22, 25]), r = Math.random(), raw = r < 0.4 ? (192 * 16777216 + (168 << 16) + (rnd(256) << 8)) : r < 0.7 ? (172 * 16777216 + ((16 + rnd(16)) << 16) + (rnd(256) << 8)) : (10 * 16777216 + rnd(16777216));
        var base = (raw & maskOf(bp)) >>> 0, cap = Math.pow(2, 32 - bp), needs = [], k, n = 3 + rnd(2);
        for (k = 0; k < n; k++) needs.push(pick1([5, 6, 10, 12, 14, 20, 25, 28, 30, 45, 50, 60, 100, 110, 120, 200]));
        needs.sort(function (a, b) { return b - a; }); needs.push(2);
        var bitsList = needs.map(function (x) { var b = 2; while (Math.pow(2, b) - 2 < x) b++; return b; });
        if (bitsList.reduce(function (a, b) { return a + Math.pow(2, b); }, 0) > cap) continue;
        var cur = base, plan = needs.map(function (x, i) { var e = { need: x, net: cur, prefix: 32 - bitsList[i] }; cur += Math.pow(2, bitsList[i]); return e; });
        var names = plan.map(function (_, i) { return i === plan.length - 1 ? "WAN link" : "LAN " + String.fromCharCode(65 + i); }), pk = 1 + rnd(plan.length - 1), t = plan[pk];
        return { kind: "vlsm", prompt: "VLSM: you have " + ip(base) + "/" + bp + ". Allocate subnets largest first, back to back with no gaps, each as small as possible.\nRequirements: " + plan.map(function (e, i) { return names[i] + " = " + e.need + " hosts"; }).join(", ") + ".\nWhich subnet does " + names[pk] + " get?",
          fields: [{ mode: "ip", label: "Network address" }, { mode: "num", label: "Prefix length (after the slash)" }], answer: ip(t.net) + "/" + t.prefix,
          check: function (v) { return parseIp(v[0]) === (t.net >>> 0) && parseNum(v[1]) === t.prefix; },
          work: plan.map(function (e, i) { return names[i] + " (" + e.need + " hosts): " + ip(e.net) + "/" + e.prefix + "."; }).join("  "),
          hint: "Work down the list in order. For each one find the block size (smallest power of 2 that is at least hosts + 2) and add it to the running start address." };
      }
    }
  };

  /* ---------- IPv6 ---------- */
  function hx(n) { return n.toString(16); }
  function v6full(g) { return g.map(function (x) { return ("000" + hx(x)).slice(-4); }).join(":"); }
  function v6short(g) {
    var best = -1, len = 0, i = 0;
    while (i < 8) { if (g[i] === 0) { var j = i; while (j < 8 && g[j] === 0) j++; if (j - i > len) { best = i; len = j - i; } i = j; } else i++; }
    if (len < 2) return g.map(hx).join(":");
    return g.slice(0, best).map(hx).join(":") + "::" + g.slice(best + len).map(hx).join(":");
  }
  function v6parse(text) {
    var t = String(text).trim().toLowerCase(); if (!t || !/^[0-9a-f:]+$/.test(t) || (t.match(/::/g) || []).length > 1 || /:::/.test(t)) return null;
    function part(s) { if (s === "") return []; var p = s.split(":"); return p.every(function (x) { return /^[0-9a-f]{1,4}$/.test(x); }) ? p.map(function (x) { return parseInt(x, 16); }) : null; }
    if (t.indexOf("::") >= 0) { var halves = t.split("::"), a = part(halves[0]), b = part(halves[1]); if (!a || !b || a.length + b.length > 7) return null;
      var mid = []; while (a.length + mid.length + b.length < 8) mid.push(0); return a.concat(mid, b); }
    var g = part(t); return g && g.length === 8 ? g : null;
  }
  function v6rand() {
    var g = [0x2001, 0x0db8], i; for (i = 0; i < 6; i++) g.push(rnd(65536));
    for (i = 2; i < 8; i++) if (Math.random() < 0.35) g[i] &= pick1([0x00ff, 0x0fff, 0x000f]);
    var start = 2 + rnd(5), run = 1 + rnd(4); for (i = start; i < Math.min(8, start + run); i++) g[i] = 0;
    if (Math.random() < 0.4) g[2 + rnd(6)] = 0;
    if (g[7] === 0 && Math.random() < 0.7) g[7] = 1 + rnd(65535);
    return g;
  }
  var V6TYPES = ["Global unicast", "Unique local", "Link-local", "Multicast", "Loopback", "Unspecified"];
  GEN.v6short = function () { var g = v6rand(), a = v6short(g); return { kind: "v6short", prompt: "Write this IPv6 address in its SHORTEST form:\n" + v6full(g), fields: one("hex"), answer: a, check: function (v) { return v[0].trim().toLowerCase() === a; },
    work: "Drop leading zeros in every group, then replace the longest run of all-zero groups (two or more) with :: once. Result: " + a, hint: "Two rules: remove leading zeros in each group; use :: once, for the longest run of zero groups (the leftmost if there is a tie)." }; };
  GEN.v6full = function () { var g = v6rand(), a = v6full(g); return { kind: "v6full", prompt: "Write this IPv6 address in FULL (8 groups of 4 hex digits):\n" + v6short(g), fields: one("hex"), answer: a, check: function (v) { return v[0].trim().toLowerCase() === a; },
    work: ":: stands for enough zero groups to make 8 groups in total. Pad every group to 4 digits. Result: " + a, hint: "Count the groups you can see. :: fills in the missing ones with 0000." }; };
  GEN.v6prefix = function () { var g = v6rand(), plen = pick1([64, 64, 64, 64, 48, 56, 60, 52]), net = g.map(function (x, i) { var bits = Math.max(0, Math.min(16, plen - 16 * i)); return bits === 16 ? x : bits === 0 ? 0 : x & (0xffff << (16 - bits)) & 0xffff; }), a = v6short(net) + "/" + plen;
    return { kind: "v6prefix", prompt: "Which subnet (prefix) does this address belong to?\n" + v6short(g) + "/" + plen, fields: one("hex"), answer: a,
      check: function (v) { var parts = v[0].trim().split("/"), pg = v6parse(parts[0]); return !!pg && same(pg, net) && (parts.length === 1 || Number(parts[1]) === plen); },
      work: "/" + plen + " keeps the first " + (plen / 4) + " hex digits. Everything after becomes zero. Result: " + a, hint: "Each hex digit is 4 bits and each group is 16 bits. /" + plen + " = " + (plen / 4) + " hex digits." }; };
  GEN.v6type = function () { var c = pick1([0, 0, 1, 1, 2, 2, 3, 3, 4, 5]), r = function () { return hx(1 + rnd(65535)); }, addr, why;
    if (c === 0) { addr = pick1(["2001", "2a02", "2600", "3ffe", "2c0f"]) + ":" + r() + ":" + r() + "::" + r(); why = "Global unicast addresses are in 2000::/3, so they start with 2 or 3."; }
    else if (c === 1) { addr = pick1(["fd", "fd", "fc"]) + ("0" + hx(rnd(256))).slice(-2) + ":" + r() + ":" + r() + "::" + r(); why = "Unique local addresses are in fc00::/7, so they start with fc or fd (fd in practice)."; }
    else if (c === 2) { addr = "fe80::" + r() + ":" + r() + ":" + r(); why = "Link-local addresses are in fe80::/10. They are never routed off the link."; }
    else if (c === 3) { addr = pick1(["ff02::1", "ff02::2", "ff02::5", "ff02::6", "ff05::1:3", "ff02::1:2", "ff02::1:ff" + ("0" + hx(rnd(256))).slice(-2) + ":" + r()]); why = "Multicast addresses are in ff00::/8, so they start with ff."; }
    else if (c === 4) { addr = "::1"; why = "::1 is the loopback address (like 127.0.0.1)."; } else { addr = "::"; why = ":: is the unspecified address (all zeros), used as a source before a host has an address."; }
    return { kind: "v6type", prompt: "What type of IPv6 address is this?\n" + addr, choices: V6TYPES, answer: V6TYPES[c], check: function (v) { return v[0] === c; }, work: why, hint: "Look at the first hex digits: 2 or 3, fc/fd, fe80, ff." }; };
  GEN.v6eui = function () { var mac = range(6).map(function () { return rnd(256); }); mac[0] &= 0xfe;
    var pre = [0x2001, 0x0db8, 1 + rnd(65535), rnd(256)], b0 = mac[0] ^ 2, g = pre.concat([(b0 << 8) | mac[1], (mac[2] << 8) | 0xff, 0xfe00 | mac[3], (mac[4] << 8) | mac[5]]);
    var m = mac.map(function (x) { return ("0" + hx(x)).slice(-2); }).join(""), shownMac = Math.random() < 0.5 ? m.slice(0, 4) + "." + m.slice(4, 8) + "." + m.slice(8) : m.match(/../g).join(":"), a = v6short(g);
    return { kind: "v6eui", prompt: "An interface with MAC " + shownMac + " uses modified EUI-64 in prefix " + v6short(pre.concat([0, 0, 0, 0])) + "/64. What is its full IPv6 address?", fields: one("hex"), answer: a,
      check: function (v) { var pg = v6parse(v[0].trim().split("/")[0]); return !!pg && same(pg, g); },
      work: "Split the MAC in half and insert fffe. Flip the 7th bit of the first byte: " + m.slice(0, 2) + " becomes " + ("0" + hx(b0)).slice(-2) + ". Address: " + a, hint: "Three steps: split the MAC in half, insert fffe, flip the 7th bit of the first byte (add or subtract 2 from the second hex digit)." }; };
  GEN.v6count = function () { var p = pick1([[48, 64], [56, 64], [60, 64], [52, 64], [48, 56], [48, 52], [32, 48], [52, 56]]), t = Math.pow(2, p[1] - p[0]);
    return { kind: "v6count", prompt: "How many /" + p[1] + " subnets can you make from one /" + p[0] + " prefix?", fields: one("num"), answer: t.toLocaleString("en-GB"), check: function (v) { return parseNum(v[0]) === t; },
      work: "Subnet bits = " + p[1] + " - " + p[0] + " = " + (p[1] - p[0]) + ". 2^" + (p[1] - p[0]) + " = " + t.toLocaleString("en-GB") + ".", hint: "Subnets = 2^(new prefix - old prefix)." }; };

  var V4MIX = ["network", "network", "network", "broadcast", "broadcast", "broadcast", "first", "first", "last", "last", "hosts", "hosts", "which", "which", "which", "mask", "wildcard", "need", "need", "same"];
  var V6MIX = ["v6short", "v6short", "v6short", "v6full", "v6full", "v6prefix", "v6prefix", "v6prefix", "v6type", "v6type", "v6eui", "v6eui", "v6count"];
  A.genV4 = function () { return GEN[pick1(V4MIX)](); };
  A.genV6 = function () { return GEN[pick1(V6MIX)](); };
  A.genAll = function () { var r = Math.random(); return r < 0.65 ? A.genV4() : r < 0.8 ? GEN.vlsm() : A.genV6(); };
  A.KIND = { network: "Network address", broadcast: "Broadcast address", first: "First host", last: "Last host", hosts: "Number of hosts", which: "Which subnet", mask: "Mask conversion", wildcard: "Wildcard mask",
    need: "Prefix for N hosts", same: "Same subnet?", vlsm: "VLSM design", v6short: "IPv6 shorten", v6full: "IPv6 expand", v6prefix: "IPv6 prefix", v6type: "IPv6 address type", v6eui: "IPv6 EUI-64", v6count: "IPv6 subnet count" };
  A._subnet = { GEN: GEN, parseIp: parseIp, ip: ip, maskOf: maskOf, v6parse: v6parse, v6short: v6short, v6full: v6full };

  A.subnetRecent = function () {
    var times = [], marks = [], recs = A.hist("subnet");
    for (var i = recs.length - 1; i >= 0 && times.length < 50; i--) { times = (recs[i].times || []).concat(times); marks = (recs[i].marks || []).concat(marks); }
    times = times.slice(-50); marks = marks.slice(-50);
    if (!times.length) return { n: 0, accuracy: 0, avg: 0 };
    return { n: times.length, accuracy: pct(marks.reduce(function (a, b) { return a + b; }, 0), marks.length), avg: times.reduce(function (a, b) { return a + b; }, 0) / times.length };
  };

  A.subnetMenu = function () {
    var rec = A.subnetRecent();
    frame({ title: "Subnetting", tab: "subnet" }, [
      h("div", { class: "stack tight" }, [h("h1", { text: "Subnetting drill" }), h("p", { class: "muted", text: "Every answer is timed. Exam target: under " + GOAL + " seconds with " + GOAL_ACC + "%+ correct." })]),
      rec.n ? h("div", { class: "stats" }, [
        h("div", { class: "stat" }, [h("span", { class: "num " + (rec.avg <= GOAL ? "t-ok" : ""), text: rec.avg.toFixed(1) + "s" }), h("span", { class: "lbl", text: "Avg speed" })]),
        h("div", { class: "stat" }, [h("span", { class: "num " + (rec.accuracy >= GOAL_ACC ? "t-ok" : ""), text: Math.round(rec.accuracy) + "%" }), h("span", { class: "lbl", text: "Accuracy" })]),
        h("div", { class: "stat" }, [h("span", { class: "num", text: String(rec.n) }), h("span", { class: "lbl", text: "Last answers" })])]) : null,
      A.modeList([
        { name: "IPv4 mixed drill", sub: "10 questions", go: function () { A.runDrill("IPv4 mixed", A.genV4, 10); } },
        { name: "IPv4 speed test", sub: "20 questions", go: function () { A.runDrill("IPv4 speed test", A.genV4, 20); } },
        { name: "VLSM design", sub: "5 questions", go: function () { A.runDrill("VLSM", GEN.vlsm, 5); } },
        { name: "IPv6 addressing and prefixes", sub: "10 questions", go: function () { A.runDrill("IPv6", A.genV6, 10); } },
        { name: "Everything mixed", sub: "15 questions", go: function () { A.runDrill("Everything mixed", A.genAll, 15); } }]),
      h("h2", { text: "Focus on one type" }),
      A.modeList([["Network, broadcast, first and last host", ["network", "broadcast", "first", "last"]], ["Which subnet does this host belong to", ["which"]], ["Host counts and prefix for N hosts", ["hosts", "need"]],
        ["Mask conversion and wildcard masks", ["mask", "wildcard"]], ["IPv6 shorten and expand", ["v6short", "v6full"]], ["IPv6 EUI-64", ["v6eui"]]].map(function (f) {
        return { name: f[0], sub: "10 questions", go: function () { A.runDrill("Focus: " + f[0], function () { return GEN[pick1(f[1])](); }, 10); } }; }))
    ]);
  };

  /* opts: noHints, noExit (placement test), onDone(record) instead of the normal results screen, backTo */
  A.runDrill = function (mode, gen, count, opts) {
    opts = opts || {};
    var items = [], started = Date.now(), exit = opts.backTo || A.subnetMenu;
    function done() {
      if (!items.length) { if (opts.onDone) return opts.onDone(null); return exit(); }
      var correct = items.filter(function (x) { return x.ok; }).length, avg = items.reduce(function (a, x) { return a + x.s; }, 0) / items.length, by = {};
      items.forEach(function (x) { var e = by[x.kind] || (by[x.kind] = { n: 0, correct: 0, time: 0 }); e.n++; e.correct += x.ok ? 1 : 0; e.time = Math.round((e.time + x.s) * 10) / 10; });
      var rec = A.addHistory({ kind: "subnet", mode: mode, total: items.length, correct: correct, avg_time: Math.round(avg * 10) / 10, times: items.map(function (x) { return x.s; }),
        marks: items.map(function (x) { return x.ok ? 1 : 0; }), by_type: by, duration_s: Math.round((Date.now() - started) / 1000) });
      if (opts.onDone) return opts.onDone(rec);
      var acc = pct(correct, items.length), met = avg <= GOAL && acc >= GOAL_ACC;
      frame({ title: "Results", tab: "subnet" }, [
        h("div", { class: "stack tight" }, [h("span", { class: "eyebrow", text: mode }), h("div", { class: "score", text: correct + " / " + items.length }), h("p", { class: "muted mono", text: Math.round(acc) + "% correct · " + avg.toFixed(1) + "s average" })]),
        h("div", { class: "notice " + (met ? "ok" : ""), text: met ? "That meets the exam target." : "Not at the exam target yet (under " + GOAL + "s and " + GOAL_ACC + "%+). Keep drilling: speed comes from repetition." }),
        h("div", { class: "panel tbl" }, [h("table", {}, [h("tr", {}, [h("th", { text: "Type" }), h("th", { class: "n", text: "Right" }), h("th", { class: "n", text: "Avg" })])].concat(
          Object.keys(by).sort(function (a, b) { return by[b].time / by[b].n - by[a].time / by[a].n; }).map(function (k) { return h("tr", {}, [h("td", { text: A.KIND[k] }), h("td", { class: "n", text: by[k].correct + "/" + by[k].n }), h("td", { class: "n", text: (by[k].time / by[k].n).toFixed(1) + "s" })]); })))]),
        h("div", { class: "row" }, [h("button", { class: "btn", text: "Again", onclick: function () { A.runDrill(mode, gen, count, opts); } }), h("button", { class: "btn ghost", text: "Done", onclick: exit })])]);
    }
    function step() {
      if (items.length >= count) return done();
      var q = gen(), begin = Date.now(), hinted = false, clock = h("div", { class: "clock", text: "0s" }), out = h("div", { class: "stack" }), hintBox = h("div"), entry, inputs = [];
      var hintBtn = opts.noHints ? null : h("button", { class: "linkbtn", id: "hint-btn", type: "button", text: "Give me a hint (the answer will not count)", onclick: function () { hinted = true; A.setKids(hintBox, [h("div", { class: "notice info", text: q.hint })]); hintBtn.hidden = true; } });
      function finish(values) {
        A.stopTick();
        var secs = Math.round((Date.now() - begin) / 100) / 10, right = !!q.check(values), credited = right && !hinted;
        items.push({ kind: q.kind, ok: credited, s: secs }); entry.hidden = true; hintBox.hidden = true; if (hintBtn) hintBtn.hidden = true;
        var last = items.length >= count, msg = credited ? "Correct in " + secs.toFixed(0) + " seconds." + (secs <= GOAL ? " Inside the " + GOAL + "s target." : " Right, but over the " + GOAL + "s target.")
          : right ? "Correct in " + secs.toFixed(0) + " seconds, but you used a hint, so it does not count." : "Not quite (" + secs.toFixed(0) + " seconds). Answer: " + q.answer;
        var picture = h("div");
        A.setKids(out, [h("p", { class: "verdict " + (credited ? "ok" : right ? "" : "bad"), text: msg }), right ? null : h("p", { class: "small muted", text: q.work }),
          !right && q.vis ? h("button", { class: "btn ghost", type: "button", id: "show-picture", text: "Show me the picture", onclick: function (e) { e.currentTarget.hidden = true; A.setKids(picture, [A.subnetVisual(q.vis.host, q.vis.prefix)]); } }) : null, picture,
          h("button", { class: "btn", id: "next", type: "button", text: last ? "See results" : "Next question", onclick: step })]);
        document.getElementById("next").focus();
      }
      if (q.choices) entry = h("div", { class: "stack" }, q.choices.map(function (c, i) { return h("button", { class: "btn" + (i ? " ghost" : ""), type: "button", text: c, onclick: function () { finish([i]); } }); }));
      else {
        q.fields.forEach(function (f, i) { var hexy = f.mode === "hex";
          inputs.push(h("input", { class: "answer", id: "sn-" + i, type: "text", inputmode: hexy ? "text" : "decimal", autocomplete: "off", autocapitalize: "none", autocorrect: "off", spellcheck: "false", enterkeyhint: "done",
            placeholder: f.mode === "ip" ? "0.0.0.0" : f.mode === "num" ? "number" : "2001:db8::", "aria-label": f.label })); });
        entry = h("form", { class: "stack", onsubmit: function (e) { e.preventDefault(); var vals = inputs.map(function (x) { return x.value; }); if (vals.some(function (v) { return !v.trim(); })) return; finish(vals); } },
          q.fields.map(function (f, i) { return q.fields.length > 1 ? h("label", { class: "fld" }, [f.label, inputs[i]]) : inputs[i]; }).concat([h("button", { class: "btn", type: "submit", text: "Submit" })]));
      }
      var n = items.length;
      frame({ title: mode, back: opts.noExit ? null : done, backLabel: "Finish" }, [
        A.plate("Question " + (n + 1) + " of " + count, n ? "avg " + (items.reduce(function (a, x) { return a + x.s; }, 0) / n).toFixed(0) + "s" : "timed", count, function (k) { return k < n ? (items[k].ok ? "done" : "bad") : k === n ? "now" : ""; }),
        h("div", { class: "stack tight" }, [clock, h("p", { class: "qtext", text: q.prompt })]), entry, hintBox, out, hintBtn]);
      A.tick(function () { var s = Math.floor((Date.now() - begin) / 1000); clock.textContent = s + "s"; clock.className = "clock" + (s > GOAL ? " over" : ""); }, 250);
      if (inputs[0]) inputs[0].focus();
    }
    step();
  };
})(window.CCNA);
