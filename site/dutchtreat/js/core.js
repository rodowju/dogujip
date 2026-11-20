/* 도구집 계산 로직 (화면과 분리: 사다리 생성, 더치페이 정산, 링크 인코딩) */
(function (root) {
  'use strict';

  // ---------- 링크 인코딩 (JSON -> UTF-8 -> base64url) ----------
  function encode(obj) {
    var bytes = new TextEncoder().encode(JSON.stringify(obj));
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str) {
    try {
      var b = String(str).replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var bin = atob(b);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) { return null; }
  }

  // ---------- 난수 (시드 고정) ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ---------- 사다리 ----------
  // cfg = { n: [이름...], r: [결과...], s: 시드(uint32) }
  function buildLadder(cfg) {
    var n = cfg.n.length;
    var rnd = mulberry32((cfg.s >>> 0) ^ (n * 2654435761));
    var rows = Math.max(9, n + 7);
    var rungs = [];
    var r, g;
    for (r = 0; r < rows; r++) {
      var row = [];
      for (g = 0; g < n - 1; g++) {
        var blocked = g > 0 && row[g - 1];
        row.push(!blocked && rnd() < 0.42);
      }
      rungs.push(row);
    }
    // 모든 칸 사이에 가로줄이 최소 1개는 있게
    for (g = 0; g < n - 1; g++) {
      var has = false;
      for (r = 0; r < rows; r++) if (rungs[r][g]) { has = true; break; }
      if (has) continue;
      var cand = [];
      for (r = 0; r < rows; r++) {
        if ((g > 0 && rungs[r][g - 1]) || (g < n - 2 && rungs[r][g + 1])) continue;
        cand.push(r);
      }
      if (cand.length) rungs[cand[Math.floor(rnd() * cand.length)]][g] = true;
      else {
        var extra = []; for (var k = 0; k < n - 1; k++) extra.push(k === g);
        rungs.push(extra); rows++;
      }
    }
    // 결과 칸 배치도 시드로 섞음 (입력 순서대로 놓이지 않게)
    var order = []; for (var i = 0; i < n; i++) order.push(i);
    for (i = n - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
    var bottom = order.map(function (o) { return cfg.r[o]; });

    function trace(start) {
      var c = start, pts = [[c, -1]];
      for (var rr = 0; rr < rows; rr++) {
        if (c > 0 && rungs[rr][c - 1]) { pts.push([c, rr]); c--; pts.push([c, rr]); }
        else if (c < n - 1 && rungs[rr][c]) { pts.push([c, rr]); c++; pts.push([c, rr]); }
      }
      pts.push([c, rows]);
      return { end: c, pts: pts };
    }
    return { n: n, rows: rows, rungs: rungs, bottom: bottom, trace: trace, code: ladderCode(cfg) };
  }
  // 사다리 확인 번호: 이름·결과·시드가 같으면 같은 번호
  function ladderCode(cfg) {
    var h = hashStr(JSON.stringify([cfg.n, cfg.r, cfg.s >>> 0]));
    var s = ('000000' + h.toString(36).toUpperCase()).slice(-6);
    return s.slice(0, 3) + '-' + s.slice(3);
  }

  // ---------- 더치페이 ----------
  function gcd(a, b) { while (b) { var t = a % b; a = b; b = t; } return a; }
  function lcm(a, b) { return a / gcd(a, b) * b; }

  // data = { p: [이름...], i: [{t:항목, a:금액(원), by:낸사람 번호, ex:[빠진 사람 번호]}], u: 올림 단위 }
  // 나누어떨어지지 않는 금액도 정확히 계산하려고 모든 금액에 L(참여 인원수들의 최소공배수)을 곱한 정수로 계산
  function settle(data) {
    var p = data.p || [], n = p.length, unit = data.u || 1;
    var items = (data.i || []).filter(function (it) {
      return it && it.a > 0 && it.by >= 0 && it.by < n && included(it, n).length > 0;
    });
    var L = 1;
    items.forEach(function (it) { L = lcm(L, included(it, n).length); });
    var paid = new Array(n).fill(0), owe = new Array(n).fill(0), total = 0;
    items.forEach(function (it) {
      var inc = included(it, n), a = Math.round(it.a);
      total += a;
      paid[it.by] += a * L;
      var share = a * L / inc.length; // 정수
      inc.forEach(function (k) { owe[k] += share; });
    });
    var net = paid.map(function (v, k) { return v - owe[k]; });
    var tr = minTransfers(net).map(function (t) {
      var exact = t.amt / L;
      var rounded = Math.ceil(t.amt / (L * unit)) * unit;
      return { from: t.from, to: t.to, exact: exact, amount: rounded };
    });
    var extraByPerson = new Array(n).fill(0);
    tr.forEach(function (t) { extraByPerson[t.to] += t.amount - t.exact; });
    var people = p.map(function (name, k) {
      return { name: name, paid: paid[k] / L, owe: owe[k] / L, net: net[k] / L, extra: extraByPerson[k] };
    });
    var extraTotal = tr.reduce(function (s, t) { return s + (t.amount - t.exact); }, 0);
    return { total: total, people: people, transfers: tr, extraTotal: extraTotal, unit: unit, itemCount: items.length };
  }
  function included(it, n) {
    var ex = it.ex || [], out = [];
    for (var k = 0; k < n; k++) if (ex.indexOf(k) < 0) out.push(k);
    return out;
  }

  // 최소 송금 횟수: (0이 아닌 사람 수) - (합이 0인 묶음으로 최대한 많이 나눈 개수)
  function minTransfers(net) {
    var idx = [], val = [];
    net.forEach(function (v, k) { if (v !== 0) { idx.push(k); val.push(v); } });
    var m = idx.length, out = [];
    if (!m) return out;
    var full = (1 << m) - 1;
    var sum = new Array(full + 1).fill(0), dp = new Array(full + 1).fill(0), par = new Array(full + 1).fill(-1);
    for (var mask = 1; mask <= full; mask++) {
      var low = mask & -mask, bit = 31 - Math.clz32(low);
      sum[mask] = sum[mask ^ low] + val[bit];
      var best = -1, bi = -1;
      for (var i = 0; i < m; i++) if (mask & (1 << i)) {
        var v = dp[mask ^ (1 << i)];
        if (v > best) { best = v; bi = i; }
      }
      dp[mask] = best + (sum[mask] === 0 ? 1 : 0);
      par[mask] = bi;
    }
    // 경로를 따라가며 합이 0인 묶음 복원
    var zeroMasks = [], cur = full;
    while (cur) { if (sum[cur] === 0) zeroMasks.push(cur); cur ^= 1 << par[cur]; }
    zeroMasks.reverse();
    var prev = 0;
    zeroMasks.forEach(function (zm) {
      var grp = zm & ~prev; prev = zm;
      var members = [];
      for (var i = 0; i < m; i++) if (grp & (1 << i)) members.push({ k: idx[i], v: val[i] });
      // 묶음 안에서는 가장 많이 보낼 사람 -> 가장 많이 받을 사람 순서로
      while (true) {
        members.sort(function (a, b) { return a.v - b.v; });
        var d = members[0], c = members[members.length - 1];
        if (!d || d.v >= 0 || c.v <= 0) break;
        var amt = Math.min(-d.v, c.v);
        out.push({ from: d.k, to: c.k, amt: amt });
        d.v += amt; c.v -= amt;
      }
    });
    return out;
  }

  root.BD = { encode: encode, decode: decode, buildLadder: buildLadder, ladderCode: ladderCode, settle: settle, minTransfers: minTransfers, hashStr: hashStr };
})(typeof window !== 'undefined' ? window : globalThis);
