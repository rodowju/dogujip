/* 사다리타기 화면 (2026-11-20 UI·UX 개선판)
   - 사다리 모양·결과는 core.js(BD.buildLadder)가 정함. 이 파일은 화면만 담당하며 시드·배치 계산은 바꾸지 않음
   - 기존 공유 링크(#/ladder/play?d=...) 그대로 열림 */
(function () {
  'use strict';
  var h = UI.h, SVGNS = 'http://www.w3.org/2000/svg';
  var MIN = 2, MAX = 12, PCOUNT = 12;
  var LOSE_WORDS = ['꽝', '통과', '패스', '없음', '-', 'x', 'X'];

  function pc(i) { return 'var(--p' + (i % PCOUNT) + ')'; }
  function reduceMotion() { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function short(s, k) { s = String(s); return s.length > k ? s.slice(0, k) : s; }

  // ---------- 결과 프리셋 ----------
  var PRESETS = [
    { id: 'win', label: '당첨 뽑기', make: function (n, k) { return fill(n, k, '당첨', '꽝'); }, counted: true },
    { id: 'coffee', label: '커피 쏘기', make: function (n, k) { return fill(n, k, '커피 쏘기', '통과'); }, counted: true },
    { id: 'clean', label: '청소 당번', make: function (n, k) { return fill(n, k, '청소 당번', '통과'); }, counted: true },
    { id: 'order', label: '순서 정하기', make: function (n) { var a = []; for (var i = 1; i <= n; i++) a.push(i + '번'); return a; } }
  ];
  function fill(n, k, w, l) { var a = []; for (var i = 0; i < n; i++) a.push(i < k ? w : l); return a; }

  function splitNames(text) {
    return String(text || '').split(/[,\n，、]/).map(UI.cleanName).filter(Boolean);
  }

  // ---------- 만들기 화면 ----------
  // 기본: 결과는 '당첨'·'꽝' 고정, 당첨 개수만 −/+ 로 정함. 다른 결과는 접힌 '결과 직접 정하기'에서만
  function renderEditor(app, preset) {
    var names = preset ? preset.n.slice(0, MAX) : [];
    var mode = 'win', k = 1, custom = [];
    if (preset) {
      var wins = preset.r.filter(function (v) { return v === '당첨'; }).length;
      var loses = preset.r.filter(function (v) { return v === '꽝'; }).length;
      if (wins >= 1 && wins + loses === preset.r.length && loses >= 1) { k = wins; }
      else { mode = 'custom'; custom = preset.r.slice(); }
    }

    var chipBox = h('div', { class: 'lg-namebox' });
    var nameInput = h('input', { type: 'text', id: 'lg-name-in', maxlength: '12', placeholder: '이름 입력 후 엔터', 'aria-label': '참가자 이름 입력', enterkeyhint: 'enter', autocomplete: 'off' });
    var addBtn = h('button', { type: 'button', class: 'btn small lg-add', text: '추가' });
    var countEl = h('span', { class: 'lg-count' });
    var errEl = h('p', { class: 'error', role: 'alert' });
    var winBox = h('div', { class: 'lg-winbox' });
    var advNote = h('p', { class: 'lg-adv-note' });
    var presetBox = h('div', { class: 'lg-presets', role: 'radiogroup', 'aria-label': '결과 종류' });
    var resultGrid = h('div', { class: 'lg-results' });
    var adv = h('details', { class: 'lg-adv' }, [
      h('summary', { text: '결과 직접 정하기' }),
      h('p', { class: 'help', text: '당첨·꽝 대신 다른 결과를 쓰고 싶을 때만 바꾸세요.' }),
      presetBox, resultGrid
    ]);
    if (mode === 'custom') adv.open = true;
    var cta = h('button', { type: 'button', class: 'btn primary wide lg-cta-btn' });

    function nCount() { return Math.max(names.length, MIN); }
    function clampK() { k = Math.max(1, Math.min(nCount() - 1, k)); }
    function cur() { return PRESETS.filter(function (x) { return x.id === mode; })[0]; }
    function results() {
      var n = nCount();
      if (mode === 'custom') {
        var r = custom.slice(0, n);
        while (r.length < n) r.push('꽝');
        return r;
      }
      clampK();
      return cur().make(n, k);
    }

    function addFrom(text) {
      var added = 0;
      splitNames(text).forEach(function (nm) {
        if (names.length >= MAX) { UI.toast('최대 ' + MAX + '명까지 가능해요'); return; }
        if (names.indexOf(nm) >= 0) { UI.toast('이미 있는 이름이에요: ' + nm); return; }
        names.push(nm); added++;
      });
      if (added) { errEl.textContent = ''; draw(); }
      return added;
    }
    nameInput.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Enter') { e.preventDefault(); addFrom(nameInput.value); nameInput.value = ''; }
      else if (e.key === 'Backspace' && !nameInput.value && names.length) { names.pop(); draw(); }
    });
    nameInput.addEventListener('input', function () {
      if (/[,\n，、]/.test(nameInput.value)) {
        var parts = nameInput.value.split(/[,\n，、]/);
        var rest = parts.pop();
        addFrom(parts.join(','));
        nameInput.value = rest;
      }
    });
    addBtn.addEventListener('click', function () { addFrom(nameInput.value); nameInput.value = ''; nameInput.focus(); });
    chipBox.addEventListener('click', function (e) { if (e.target === chipBox) nameInput.focus(); });

    function drawNames() {
      chipBox.textContent = '';
      names.forEach(function (nm, i) {
        var chip = h('span', { class: 'lg-chip' }, [
          h('span', { class: 'lg-dot', 'aria-hidden': 'true' }), nm,
          h('button', { type: 'button', class: 'lg-x', 'aria-label': nm + ' 빼기', text: '×', onclick: function () { names.splice(i, 1); draw(); } })
        ]);
        chip.style.setProperty('--c', pc(i));
        chipBox.appendChild(chip);
      });
      chipBox.appendChild(nameInput);
      countEl.textContent = names.length + '명 / 최대 ' + MAX + '명';
    }

    // 기본 화면: 당첨 개수 −/+
    function drawWin() {
      winBox.textContent = '';
      var p = cur();
      if (!p || !p.counted) {
        winBox.hidden = true;
        advNote.hidden = false;
        advNote.textContent = '결과를 직접 정했어요: ' + results().join(', ');
        advNote.appendChild(h('button', { type: 'button', class: 'lg-link', text: '당첨·꽝으로 되돌리기', onclick: function () { mode = 'win'; k = 1; draw(); } }));
        return;
      }
      winBox.hidden = false; advNote.hidden = true;
      clampK();
      var n = nCount(), wl = p.make(2, 1);
      winBox.appendChild(h('div', { class: 'lg-win-row' }, [
        h('span', { class: 'lg-win-tag' }, [h('span', { class: 'lg-star', 'aria-hidden': 'true', text: '★' }), wl[0]]),
        h('button', { type: 'button', class: 'lg-step', 'aria-label': wl[0] + ' 한 개 줄이기', text: '−', disabled: k <= 1, onclick: function () { k--; draw(); } }),
        h('b', { class: 'lg-step-n', 'aria-live': 'polite', text: k + '개' }),
        h('button', { type: 'button', class: 'lg-step', 'aria-label': wl[0] + ' 한 개 늘리기', text: '+', disabled: k >= n - 1, onclick: function () { k++; draw(); } })
      ]));
      winBox.appendChild(h('p', { class: 'lg-win-sum' }, ['나머지 ' + (n - k) + '칸은 ', h('span', { class: 'lg-lose-tag', text: wl[1] })]));
    }

    // 고급 옵션: 결과 종류 + 칸별 직접 입력
    function drawAdv() {
      presetBox.textContent = '';
      PRESETS.concat([{ id: 'custom', label: '칸마다 직접' }]).forEach(function (p) {
        presetBox.appendChild(h('button', {
          type: 'button', role: 'radio', 'aria-checked': mode === p.id ? 'true' : 'false',
          class: 'lg-preset' + (mode === p.id ? ' on' : ''), text: p.label,
          onclick: function () {
            if (p.id === 'custom' && mode !== 'custom') custom = results();
            mode = p.id; draw();
          }
        }));
      });
      resultGrid.textContent = '';
      results().forEach(function (val, i) {
        var inp = h('input', { type: 'text', maxlength: '12', 'aria-label': '결과 ' + (i + 1), placeholder: '결과 ' + (i + 1) });
        inp.value = val;
        inp.addEventListener('input', function () {
          if (mode !== 'custom') { custom = results(); mode = 'custom'; drawAdvButtons(); }
          custom[i] = UI.cleanName(inp.value);
          drawWin();
        });
        resultGrid.appendChild(inp);
      });
    }
    function drawAdvButtons() {
      Array.prototype.forEach.call(presetBox.children, function (b) {
        var on = b.textContent === '칸마다 직접';
        b.classList.toggle('on', on); b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }

    function drawCta() {
      var ok = names.length >= MIN;
      cta.textContent = ok ? '사다리 만들기 · ' + names.length + '명' : '이름을 2명 이상 넣어 주세요';
      cta.classList.toggle('wait', !ok);
    }
    function draw() { drawNames(); drawWin(); drawAdv(); drawCta(); drawRecent(); }

    cta.addEventListener('click', function () {
      if (nameInput.value.trim()) { addFrom(nameInput.value); nameInput.value = ''; }
      if (names.length < MIN) { errEl.textContent = '참가자를 2명 이상 넣어 주세요'; nameInput.focus(); return; }
      var r = results().slice(0, names.length).map(function (x) { return UI.cleanName(x) || '꽝'; });
      var seed = new Uint32Array(1); crypto.getRandomValues(seed);
      UI.saveNames(names);
      location.hash = '#/ladder/play?d=' + BD.encode({ v: 1, n: names.slice(), r: r, s: seed[0] });
    });

    var recentWrap = UI.loadNames().length ? h('div', { class: 'chips lg-recent', 'aria-label': '최근 입력한 이름' }) : null;
    function drawRecent() {
      if (!recentWrap) return;
      recentWrap.textContent = '';
      var list = UI.loadNames().filter(function (nm) { return names.indexOf(nm) < 0; }).slice(0, 12);
      recentWrap.hidden = !list.length;
      if (!list.length) return;
      recentWrap.appendChild(h('span', { class: 'chips-label', text: '최근 이름' }));
      recentWrap.appendChild(UI.clearNamesButton(function () { recentWrap.remove(); recentWrap = null; }));
      list.forEach(function (nm) {
        recentWrap.appendChild(h('button', { type: 'button', class: 'chip', text: '+ ' + nm, onclick: function () { addFrom(nm); } }));
      });
    }

    app.appendChild(h('section', { class: 'panel lg-editor' }, [
      h('h1', { text: '사다리타기' }),
      h('p', { class: 'lead', text: '만든 사다리를 링크로 보내면 받은 사람 모두 똑같은 사다리와 결과를 봅니다.' }),
      h('div', { class: 'lg-label-row' }, [h('label', { class: 'field-label', for: 'lg-name-in', text: '참가자' }), countEl]),
      h('div', { class: 'lg-name-row' }, [chipBox, addBtn]),
      h('p', { class: 'help', text: '엔터나 쉼표로 한 명씩 추가 · 이름의 ×로 빼기' }),
      recentWrap,
      h('div', { class: 'field-label', text: '결과' }),
      winBox, advNote, adv,
      errEl,
      h('div', { class: 'lg-cta' }, [cta])
    ]));
    draw();
  }

  // ---------- 사다리 보기 화면 ----------
  function renderPlay(app, cfg) {
    var L = BD.buildLadder(cfg), n = L.n;
    var colW = 40, rowH = 26, H = (L.rows + 1) * rowH, W = n * colW;
    var dense = n >= 7;
    var url = UI.baseUrl() + '#/ladder/play?d=' + BD.encode(cfg);
    var ends = cfg.n.map(function (_, i) { return L.trace(i).end; });
    var gotBy = new Array(n).fill(-1); // 결과 칸 -> 사람
    var started = [], queue = [], busy = false, skipAll = false, current = null;

    // 특별한 결과(축하 대상) 판단: 다수 결과와 다른 칸, 또는 순서 정하기의 1번
    var counts = {};
    cfg.r.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    var maxCount = Math.max.apply(null, Object.keys(counts).map(function (v) { return counts[v]; }));
    function special(v) {
      if (LOSE_WORDS.indexOf(v) >= 0) return false;
      if (maxCount >= 2) return counts[v] < maxCount;
      return v === '1번' || /당첨/.test(v);
    }

    var svgPx = Math.round(Math.max(190, Math.min(L.rows * 24, (window.innerHeight || 700) - (dense ? 450 : 380))));
    function x(c) { return (c + 0.5) * colW; }
    function y(r) { return r < 0 ? 0 : r >= L.rows ? H : (r + 1) * rowH; }

    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('class', 'lg-svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.height = svgPx + 'px';
    function line(x1, y1, x2, y2, cls) {
      var l = document.createElementNS(SVGNS, 'line');
      l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
      l.setAttribute('class', cls); l.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(l);
    }
    for (var c = 0; c < n; c++) line(x(c), 0, x(c), H, 'rail');
    L.rungs.forEach(function (row, r) {
      row.forEach(function (on, g) { if (on) line(x(g), y(r), x(g + 1), y(r), 'rung'); });
    });
    var trailLayer = document.createElementNS(SVGNS, 'g');
    svg.appendChild(trailLayer);
    var stage = h('div', { class: 'lg-stage' }, [svg]);

    var cols = 'repeat(' + n + ', minmax(0, 1fr))';
    var topRow = h('div', { class: 'lg-ends lg-top' });
    var botRow = h('div', { class: 'lg-ends lg-bot' });
    topRow.style.gridTemplateColumns = botRow.style.gridTemplateColumns = cols;

    var nameBtns = cfg.n.map(function (nm, i) {
      var b = h('button', { type: 'button', class: 'lg-name', 'data-person': String(i), title: nm, 'aria-label': nm + ' 사다리 타기' },
        [h('span', { text: dense ? short(nm, 4) : nm })]);
      b.style.setProperty('--c', pc(i));
      b.addEventListener('click', function () { run([i]); });
      topRow.appendChild(b); return b;
    });
    var cards = L.bottom.map(function (res, j) {
      var front = h('span', { class: 'lg-face lg-front', 'aria-hidden': 'true', text: '?' });
      var back = h('span', { class: 'lg-face lg-back' }, [special(res) ? h('i', { class: 'lg-star', 'aria-hidden': 'true', text: '★' }) : null, h('span', { text: dense ? short(res, 5) : res })]);
      var card = h('div', { class: 'lg-card', title: '아직 비공개', 'aria-label': (j + 1) + '번째 칸 결과 비공개' }, [h('span', { class: 'lg-inner' }, [front, back])]);
      botRow.appendChild(card); return card;
    });

    var board = h('div', { class: 'lg-board' + (dense ? ' dense' : '') }, [topRow, stage, botRow]);
    var status = h('p', { class: 'lg-status', 'aria-live': 'polite', text: '이름을 누르면 공이 내려가요' });
    var allBtn = h('button', { type: 'button', class: 'btn primary', text: '전체 결과 보기' });
    var skipBtn = h('button', { type: 'button', class: 'btn', text: '건너뛰기', hidden: true });
    var summaryBox = h('div', { class: 'lg-summary-box', hidden: true });

    function lengthPx(pts) {
      var sx = stage.clientWidth / W || 1, sy = svgPx / H, len = 0, segs = [];
      for (var k = 1; k < pts.length; k++) {
        var dx = (x(pts[k][0]) - x(pts[k - 1][0])) * sx, dy = (y(pts[k][1]) - y(pts[k - 1][1])) * sy;
        var d = Math.abs(dx) + Math.abs(dy); segs.push(d); len += d;
      }
      return { len: len, segs: segs };
    }

    function animate(i, done) {
      var t = L.trace(i);
      var pts = t.pts.map(function (p) { return [x(p[0]), y(p[1])]; });
      var path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('class', 'trail'); path.setAttribute('vector-effect', 'non-scaling-stroke');
      path.style.stroke = pc(i);
      trailLayer.appendChild(path);
      var ball = h('span', { class: 'lg-ball', 'aria-hidden': 'true', text: cfg.n[i].charAt(0) });
      ball.style.setProperty('--c', pc(i));
      stage.appendChild(ball);
      nameBtns[i].classList.add('going');
      status.textContent = cfg.n[i] + ' 내려가는 중…';

      var m = lengthPx(t.pts);
      var dur = skipAll || reduceMotion() ? 0 : Math.max(1500, Math.min(2000, 1500 + m.len * 0.4));
      var finished = false, start = null, guard;

      function place(dist) {
        var acc = 0, k = 1;
        while (k < pts.length && acc + m.segs[k - 1] < dist) { acc += m.segs[k - 1]; k++; }
        var d = 'M' + pts[0][0] + ' ' + pts[0][1];
        for (var j = 1; j < k && j < pts.length; j++) d += ' L' + pts[j][0] + ' ' + pts[j][1];
        var px, py;
        if (k >= pts.length) { px = pts[pts.length - 1][0]; py = pts[pts.length - 1][1]; }
        else {
          var f = m.segs[k - 1] ? (dist - acc) / m.segs[k - 1] : 1;
          px = pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * f;
          py = pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * f;
          d += ' L' + px + ' ' + py;
        }
        path.setAttribute('d', d);
        ball.style.left = (px / W * 100) + '%';
        ball.style.top = (py / H * svgPx) + 'px';
      }
      function finish() {
        if (finished) return; finished = true; clearTimeout(guard);
        place(m.len); current = null;
        ball.classList.add('landed');
        setTimeout(function () { if (ball.parentNode) ball.parentNode.removeChild(ball); }, reduceMotion() ? 0 : 400);
        nameBtns[i].classList.remove('going'); nameBtns[i].classList.add('done');
        reveal(i, t.end);
        if (done) done();
      }
      current = { finish: finish };
      place(0);
      if (!dur) { finish(); return; }
      // 화면이 멈춰도(백그라운드 등) 결과는 열리게
      guard = setTimeout(finish, dur + 900);
      function frame(ts) {
        if (finished) return;
        if (start == null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        place(e * m.len);
        if (p < 1) requestAnimationFrame(frame); else finish();
      }
      requestAnimationFrame(frame);
    }

    function reveal(i, end) {
      gotBy[end] = i;
      var card = cards[end], res = L.bottom[end];
      card.style.setProperty('--c', pc(i));
      card.classList.add('flipped');
      card.title = cfg.n[i] + ': ' + res;
      card.setAttribute('aria-label', cfg.n[i] + ' 결과 ' + res);
      var sp = special(res);
      if (sp) card.classList.add('special');
      status.textContent = cfg.n[i] + ' → ' + res + (sp ? '!' : '');
      if (sp && !skipAll) celebrate(card);
      if (gotBy.indexOf(-1) < 0) showSummary();
    }

    function celebrate(card) {
      try { if (navigator.vibrate) navigator.vibrate([40, 30, 90]); } catch (e) { /* 지원 안 하면 무시 */ }
      if (reduceMotion()) return;
      var box = h('span', { class: 'lg-confetti', 'aria-hidden': 'true' });
      for (var k = 0; k < 18; k++) {
        var bit = h('i');
        var ang = (Math.PI * 2 * k) / 18 + Math.random() * 0.3;
        var dist = 40 + Math.random() * 40;
        bit.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px');
        bit.style.setProperty('--dy', Math.round(Math.sin(ang) * dist - 30) + 'px');
        bit.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg');
        bit.style.setProperty('--c', pc(k));
        box.appendChild(bit);
      }
      card.appendChild(box);
      setTimeout(function () { if (box.parentNode) box.parentNode.removeChild(box); }, 1300);
    }

    function run(list) {
      list.forEach(function (i) { if (started.indexOf(i) < 0) { started.push(i); queue.push(i); } });
      if (busy) return;
      (function next() {
        var i = queue.shift();
        if (i == null) { busy = false; skipBtn.hidden = true; return; }
        busy = true;
        animate(i, function () { setTimeout(next, skipAll || reduceMotion() ? 0 : 350); });
      })();
    }

    function resultText() {
      var lines = ['[도구집 사다리] 확인번호 ' + L.code];
      cfg.n.forEach(function (nm, i) { lines.push(nm + ' → ' + L.bottom[ends[i]]); });
      return lines.join('\n');
    }

    function showSummary() {
      summaryBox.textContent = '';
      var list = h('ol', { class: 'lg-summary' }, cfg.n.map(function (nm, i) {
        var res = L.bottom[ends[i]];
        var li = h('li', { class: special(res) ? 'special' : null }, [h('b', { text: nm }), h('span', { class: 'arr', text: ' → ' }), h('span', { class: 'res' }, [special(res) ? h('i', { class: 'lg-star', 'aria-hidden': 'true', text: '★ ' }) : null, res])]);
        li.style.setProperty('--c', pc(i));
        return li;
      }));
      summaryBox.appendChild(h('h2', { text: '결과 한눈에 보기' }));
      summaryBox.appendChild(list);
      summaryBox.hidden = false;
      allBtn.hidden = true; skipBtn.hidden = true;
      status.textContent = '모두 공개했어요.';
    }

    allBtn.addEventListener('click', function () {
      skipBtn.hidden = false;
      run(cfg.n.map(function (_, i) { return i; }));
    });
    skipBtn.addEventListener('click', function () {
      skipAll = true; skipBtn.hidden = true;
      if (current) current.finish();
    });

    app.appendChild(h('section', { class: 'panel lg-play' }, [
      h('div', { class: 'play-head' }, [
        h('h1', { text: '사다리타기' }),
        h('span', { class: 'code', title: '이름·결과·가로줄이 같으면 누구 화면에서나 같은 번호' }, ['확인번호 ', h('b', { text: L.code })])
      ]),
      h('p', { class: 'lg-lock' }, [h('span', { class: 'lg-lock-dot', 'aria-hidden': 'true' }), '가로줄 고정됨 · ' + n + '명']),
      board,
      status,
      h('div', { class: 'row-btns lg-actions' }, [allBtn, skipBtn]),
      summaryBox,
      h('p', { class: 'fixed-note' }, [h('b', { text: '가로줄 고정됨. ' }), '이 사다리 모양은 링크 안에 담겨 있어 결과를 열기 전에도, 누가 열어도 똑같습니다. 단톡방에서 확인번호가 같은지 비교해 보세요. 다만 만든 사람은 보내기 전에 결과를 미리 볼 수 있습니다.']),
      h('div', { class: 'share-box' }, [
        h('p', { class: 'share-title', text: '단톡방에 보내기' }),
        h('p', { class: 'help', text: '링크를 받은 사람도 같은 사다리를 보고 직접 결과를 열 수 있어요.' }),
        h('div', { class: 'row-btns' }, [
          h('button', { type: 'button', class: 'btn primary', text: '공유하기', onclick: function () {
            UI.share('도구집 사다리타기', '사다리 탔어요! 확인번호 ' + L.code + ' · 눌러서 결과 보기', url);
          } }),
          h('button', { type: 'button', class: 'btn', text: '링크 복사', onclick: function () { UI.copy(url, '링크를 복사했어요'); } }),
          h('button', { type: 'button', class: 'btn', text: '결과 복사', onclick: function () {
            if (gotBy.indexOf(-1) >= 0) { UI.toast('전체 결과를 먼저 열어 주세요'); return; }
            UI.copy(resultText() + '\n' + url, '결과와 링크를 복사했어요');
          } })
        ])
      ]),
      h('div', { class: 'row-btns minor' }, [
        h('a', { class: 'btn ghost', href: '#/ladder?d=' + BD.encode({ v: 1, n: cfg.n, r: cfg.r, s: 0 }), text: '이 구성으로 새 사다리' }),
        h('a', { class: 'btn ghost', href: '#/ladder', text: '처음부터' })
      ])
    ]));
  }

  function valid(cfg) {
    return cfg && Array.isArray(cfg.n) && Array.isArray(cfg.r) && cfg.n.length >= MIN && cfg.n.length <= MAX &&
      cfg.r.length === cfg.n.length && typeof cfg.s === 'number' &&
      cfg.n.concat(cfg.r).every(function (s) { return typeof s === 'string' && s.length <= 12; });
  }

  window.Ladder = {
    editor: function (app, params) {
      var d = params.get('d'), cfg = d ? BD.decode(d) : null;
      renderEditor(app, valid(cfg) ? cfg : null);
    },
    play: function (app, params) {
      var cfg = BD.decode(params.get('d') || '');
      if (!valid(cfg)) {
        app.appendChild(h('section', { class: 'panel' }, [
          h('h1', { text: '사다리를 열 수 없어요' }),
          h('p', { text: '링크가 잘렸거나 바뀐 것 같아요. 보낸 사람에게 링크를 다시 받아 주세요.' }),
          h('a', { class: 'btn primary', href: '#/ladder', text: '새 사다리 만들기' })
        ]));
        return;
      }
      renderPlay(app, cfg);
    }
  };
})();
