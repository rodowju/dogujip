/* 더치페이 화면 */
(function () {
  'use strict';
  var h = UI.h;
  var MAXP = 15, MAXI = 30, MAXA = 100000000;
  var UNITS = [1, 10, 100, 1000];

  function fresh() {
    return { v: 1, p: [], i: [{ t: '1차', a: 0, by: 0, ex: [] }], u: 100, w: [], ok: [] };
  }
  // ---------- 송금 앱 연결 (돈은 다루지 않고 토스·카카오페이 앱으로 넘겨 주기만) ----------
  // 토스: 아이디만 저장하고 주소는 우리가 만듦. 영문·숫자·_·-·. 만 허용
  // 공식 문서에서 금액이 포함된 toss.me 주소 형식을 확인하지 못해 아이디 링크만 열고 금액은 복사 버튼으로 제공
  var TOSS_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{1,29}$/;
  var KAKAO_PREFIX = 'https://qr.kakaopay.com/';
  var KAKAO_RE = /^[A-Za-z0-9_-]{4,80}$/;
  function parseToss(raw) {
    var v = String(raw || '').trim();
    if (!v) return { ok: true, val: '' };
    v = v.replace(/^https:\/\/toss\.me\//i, '').replace(/^toss\.me\//i, '').replace(/\/$/, '');
    return TOSS_RE.test(v) ? { ok: true, val: v } : { ok: false, msg: '토스 아이디는 영문·숫자(및 . _ -)만 넣을 수 있어요' };
  }
  function parseKakao(raw) {
    var v = String(raw || '').trim();
    if (!v) return { ok: true, val: '' };
    if (v.indexOf(KAKAO_PREFIX) !== 0) return { ok: false, msg: 'https://qr.kakaopay.com/ 으로 시작하는 카카오페이 송금 링크만 넣을 수 있어요' };
    var code = v.slice(KAKAO_PREFIX.length).replace(/\/$/, '');
    return KAKAO_RE.test(code) ? { ok: true, val: code } : { ok: false, msg: '카카오페이 링크 모양이 올바르지 않아요' };
  }
  function tossUrl(id) { return 'https://toss.me/' + encodeURIComponent(id); }
  function kakaoUrl(code) { return KAKAO_PREFIX + encodeURIComponent(code); }
  function sentKey(t) { return t.from + '-' + t.to + '-' + t.amount; }

  function sanitize(d) {
    if (!d || !Array.isArray(d.p) || !Array.isArray(d.i)) return null;
    var p = d.p.filter(function (s) { return typeof s === 'string'; }).map(UI.cleanName).filter(Boolean).slice(0, MAXP);
    var items = d.i.slice(0, MAXI).map(function (it) {
      var a = Math.max(0, Math.min(MAXA, Math.round(Number(it && it.a) || 0)));
      var by = Number(it && it.by); if (!(by >= 0 && by < p.length)) by = 0;
      var ex = Array.isArray(it && it.ex) ? it.ex.filter(function (k) { return k >= 0 && k < p.length; }) : [];
      return { t: String((it && it.t) || '').slice(0, 20), a: a, by: by | 0, ex: ex };
    });
    var w = [];
    if (Array.isArray(d.w)) d.w.slice(0, p.length).forEach(function (x, k) {
      if (!x || typeof x !== 'object') return;
      var t = parseToss(x.t), c = typeof x.k === 'string' ? (KAKAO_RE.test(x.k) ? { ok: true, val: x.k } : { ok: false }) : { ok: false };
      var e = {};
      if (t.ok && t.val) e.t = t.val;
      if (c.ok && c.val) e.k = c.val;
      if (e.t || e.k) w[k] = e;
    });
    var ok = Array.isArray(d.ok) ? d.ok.filter(function (x) { return typeof x === 'string' && /^\d+-\d+-\d+$/.test(x); }).slice(0, 200) : [];
    return { v: 1, p: p, i: items.length ? items : fresh().i, u: UNITS.indexOf(d.u) >= 0 ? d.u : 100, w: w, ok: ok };
  }
  function fmtInput(a) { return a ? Number(a).toLocaleString('ko-KR') : ''; }
  function parseWon(s) { var v = parseInt(String(s).replace(/[^0-9]/g, ''), 10); return isNaN(v) ? 0 : Math.min(v, MAXA); }
  function approx(v) { return (Math.abs(v - Math.round(v)) > 1e-9 ? '약 ' : '') + UI.won(v); }

  function render(app, initial) {
    var st = initial || fresh();
    var root = h('section', { class: 'panel' });
    var peopleBox = h('div');
    var itemsBox = h('div', { class: 'items' });
    var resultBox = h('div', { class: 'result' });
    var unitBox = h('div', { class: 'seg', role: 'radiogroup', 'aria-label': '올림 단위' });
    var saveTimer;

    function packed() {
      var o = { v: 1, p: st.p, i: st.i, u: st.u };
      var w = st.w.slice(0, st.p.length).map(function (x) { return x && (x.t || x.k) ? x : 0; });
      if (w.some(Boolean)) o.w = w;
      if (st.ok.length) o.ok = st.ok;
      return o;
    }
    function link() { return UI.baseUrl() + '#/dutch?d=' + BD.encode(packed()); }
    function persist() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () {
        try { history.replaceState(null, '', '#/dutch?d=' + BD.encode(packed())); } catch (e) { /* 무시 */ }
      }, 250);
    }
    function changed(structural) {
      if (structural) { drawPeople(); drawItems(); drawPay(); }
      drawResult(); persist();
    }

    // --- 참가자 ---
    var nameInput = h('input', { type: 'text', maxlength: '12', placeholder: '이름 입력 후 추가', 'aria-label': '참가자 이름', enterkeyhint: 'done' });
    function addNames(text) {
      var added = 0;
      String(text).split(/[,\n，、]/).map(UI.cleanName).filter(Boolean).forEach(function (nm) {
        if (st.p.length >= MAXP) { UI.toast('최대 ' + MAXP + '명까지 가능해요'); return; }
        if (st.p.indexOf(nm) >= 0) { UI.toast('이미 있는 이름이에요: ' + nm); return; }
        st.p.push(nm); added++;
      });
      if (added) { UI.saveNames(st.p); changed(true); }
    }
    nameInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); addNames(nameInput.value); nameInput.value = ''; }
    });
    function removePerson(k) {
      st.p.splice(k, 1);
      st.w.splice(k, 1);
      st.ok = []; // 사람 번호가 바뀌므로 '보냈어요' 표시는 초기화
      st.i.forEach(function (it) {
        if (it.by === k) it.by = 0; else if (it.by > k) it.by--;
        it.ex = it.ex.filter(function (x) { return x !== k; }).map(function (x) { return x > k ? x - 1 : x; });
      });
      changed(true);
    }
    function drawPeople() {
      peopleBox.textContent = '';
      var chips = h('div', { class: 'chips people' }, st.p.map(function (nm, k) {
        return h('span', { class: 'chip person' }, [nm, h('button', { type: 'button', class: 'x', 'aria-label': nm + ' 빼기', text: '×', onclick: function () { removePerson(k); } })]);
      }));
      if (!st.p.length) chips.appendChild(h('span', { class: 'help', text: '아직 참가자가 없어요' }));
      peopleBox.appendChild(chips);
      var recent = UI.loadNames().filter(function (nm) { return st.p.indexOf(nm) < 0; }).slice(0, 10);
      if (recent.length) peopleBox.appendChild(h('div', { class: 'chips' }, [h('span', { class: 'chips-label', text: '최근 이름' }), UI.clearNamesButton(drawPeople)].concat(
        recent.map(function (nm) { return h('button', { type: 'button', class: 'chip', text: '+ ' + nm, onclick: function () { addNames(nm); } }); }))));
    }

    // --- 항목 ---
    function drawItems() {
      itemsBox.textContent = '';
      st.i.forEach(function (it, idx) {
        var title = h('input', { type: 'text', maxlength: '20', placeholder: '항목 (예: 고기)', 'aria-label': (idx + 1) + '번 항목 이름' });
        title.value = it.t;
        title.addEventListener('input', function () { it.t = title.value.slice(0, 20); changed(false); });
        var amt = h('input', { type: 'text', inputmode: 'numeric', placeholder: '금액', class: 'amount', 'aria-label': (idx + 1) + '번 항목 금액' });
        amt.value = fmtInput(it.a);
        amt.addEventListener('input', function () { it.a = parseWon(amt.value); changed(false); });
        amt.addEventListener('blur', function () { amt.value = fmtInput(it.a); });
        var payer = h('select', { 'aria-label': (idx + 1) + '번 항목 낸 사람' }, st.p.map(function (nm, k) {
          var o = h('option', { value: String(k), text: nm }); if (k === it.by) o.selected = true; return o;
        }));
        if (!st.p.length) payer.appendChild(h('option', { text: '참가자 먼저' }));
        payer.addEventListener('change', function () { it.by = parseInt(payer.value, 10) || 0; changed(false); });
        var who = h('div', { class: 'chips toggles' }, st.p.map(function (nm, k) {
          var on = it.ex.indexOf(k) < 0;
          var b = h('button', { type: 'button', class: 'chip toggle' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', text: nm });
          b.addEventListener('click', function () {
            var i = it.ex.indexOf(k);
            if (i >= 0) it.ex.splice(i, 1);
            else {
              if (st.p.length - it.ex.length <= 1) { UI.toast('최소 1명은 함께해야 해요'); return; }
              it.ex.push(k);
            }
            var nowOn = it.ex.indexOf(k) < 0;
            b.classList.toggle('on', nowOn); b.setAttribute('aria-pressed', nowOn ? 'true' : 'false');
            cnt.textContent = (st.p.length - it.ex.length) + '명이 나눔';
            changed(false);
          });
          return b;
        }));
        var cnt = h('span', { class: 'help', text: (st.p.length - it.ex.length) + '명이 나눔' });
        itemsBox.appendChild(h('div', { class: 'item' }, [
          h('div', { class: 'item-row' }, [title, amt,
            h('button', { type: 'button', class: 'x big', 'aria-label': (idx + 1) + '번 항목 삭제', text: '×', onclick: function () {
              if (st.i.length <= 1) { st.i = fresh().i; } else st.i.splice(idx, 1);
              changed(true);
            } })]),
          h('div', { class: 'item-row' }, [h('span', { class: 'mini', text: '낸 사람' }), payer]),
          h('div', { class: 'mini', text: '함께한 사람 (누르면 빠짐)' }),
          who, cnt
        ]));
      });
      itemsBox.appendChild(h('button', { type: 'button', class: 'btn wide', text: '+ 항목 추가', onclick: function () {
        if (st.i.length >= MAXI) { UI.toast('항목은 ' + MAXI + '개까지예요'); return; }
        st.i.push({ t: (st.i.length + 1) + '차', a: 0, by: 0, ex: [] }); changed(true);
      } }));
    }

    // --- 송금 링크 (선택) ---
    var payBox = h('div', { class: 'pay-list' });
    function drawPay() {
      payBox.textContent = '';
      if (st.p.length < 2) { payBox.appendChild(h('p', { class: 'help', text: '참가자를 먼저 넣어 주세요.' })); return; }
      var res = BD.settle(st);
      st.p.forEach(function (nm, k) {
        var cur = st.w[k] || {};
        var gets = res.transfers.some(function (t) { return t.to === k; });
        var err = h('p', { class: 'pay-err', role: 'alert' });
        function field(kind, label, ph, val) {
          var inp = h('input', { type: 'text', inputmode: 'url', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: ph, 'aria-label': nm + ' ' + label });
          inp.value = val ? (kind === 't' ? val : KAKAO_PREFIX + val) : '';
          inp.addEventListener('input', function () {
            var r = kind === 't' ? parseToss(inp.value) : parseKakao(inp.value);
            var e = st.w[k] || {};
            if (r.ok) { if (r.val) e[kind] = r.val; else delete e[kind]; err.textContent = ''; inp.removeAttribute('aria-invalid'); }
            else { delete e[kind]; err.textContent = r.msg; inp.setAttribute('aria-invalid', 'true'); }
            st.w[k] = (e.t || e.k) ? e : null;
            changed(false);
          });
          return h('label', { class: 'pay-field' }, [h('span', { class: 'mini', text: label }), inp]);
        }
        payBox.appendChild(h('div', { class: 'pay-person' + (gets ? ' gets' : ''), 'data-k': String(k) }, [
          h('div', { class: 'pay-name' }, [h('b', { text: nm }), h('span', { class: 'pay-badge', text: '받을 돈 있음' })]),
          field('t', '토스 아이디', '예: mytossid', cur.t),
          field('k', '카카오페이 송금 링크', 'https://qr.kakaopay.com/…', cur.k),
          err
        ]));
      });
    }
    var payHelp = h('details', { class: 'pay-help' }, [
      h('summary', { text: '어디서 찾나요?' }),
      h('ul', null, [
        h('li', null, [h('b', { text: '토스 아이디: ' }), '토스 앱에서 내 토스아이디(toss.me/아이디 모양)를 만들거나 확인한 뒤, 아이디만 적어 주세요.']),
        h('li', null, [h('b', { text: '카카오페이 송금 링크: ' }), '카카오페이의 송금 메뉴에서 송금받을 수 있는 링크(송금코드)를 복사해 붙여 넣으세요. https://qr.kakaopay.com/ 으로 시작하는 주소만 받습니다.']),
        h('li', { text: '앱 화면 이름은 업데이트에 따라 다를 수 있어요. 정확한 위치는 각 앱의 공식 안내를 확인해 주세요.' }),
        h('li', { text: '보내는 사람은 송금 앱에서 받는 사람 이름이 맞는지 꼭 확인하세요. 공유 링크는 누구나 고쳐서 다시 보낼 수 있어요.' }),
        h('li', { text: '토스·카카오페이는 각 회사의 상표이며, 도구집은 두 회사와 제휴 관계가 없습니다.' })
      ])
    ]);

    // 송금 앱 연결 칸: 아이디·링크가 이미 들어 있으면 펼쳐서 보여 줌
    var paySec = h('details', { class: 'pay-section' }, [
      h('summary', null, [h('span', { text: '송금 앱 연결 (선택)' }), h('span', { class: 'mini', text: '토스·카카오페이' })]),
      h('p', { class: 'help', text: '받을 사람이 토스 아이디나 카카오페이 송금 링크를 넣어 두면, 결과에서 바로 송금 앱을 열 수 있어요. 계좌번호는 받지 않습니다. 넣은 아이디·링크는 공유 링크에 담겨요. 공유 링크는 누구나 고쳐서 다시 보낼 수 있으니, 보내는 사람은 송금 앱에서 받는 사람 이름을 꼭 확인하세요.' }),
      payHelp, payBox
    ]);
    if (st.w.some(function (x) { return x && (x.t || x.k); })) paySec.open = true;
    function openPay() {
      paySec.open = true;
      var target = payBox.querySelector('.pay-person.gets input') || payBox.querySelector('input');
      paySec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (target) setTimeout(function () { target.focus({ preventScroll: true }); }, 350);
    }

    // --- 올림 단위 ---
    function drawUnits() {
      unitBox.textContent = '';
      UNITS.forEach(function (u) {
        var b = h('button', { type: 'button', role: 'radio', 'aria-checked': st.u === u ? 'true' : 'false', class: 'seg-btn' + (st.u === u ? ' on' : ''),
          text: u === 1 ? '1원(그대로)' : u.toLocaleString('ko-KR') + '원', onclick: function () { st.u = u; drawUnits(); changed(false); } });
        unitBox.appendChild(b);
      });
    }

    // --- 결과 ---
    function summaryText(res) {
      var lines = ['[도구집 더치페이] 총 ' + UI.won(res.total) + ' · ' + st.p.length + '명'];
      st.i.forEach(function (it) {
        if (!(it.a > 0)) return;
        var inc = st.p.length - it.ex.length;
        var out = it.ex.length ? ' / 빠짐: ' + it.ex.map(function (k) { return st.p[k]; }).join(', ') : '';
        lines.push('· ' + (it.t || '항목') + ' ' + UI.won(it.a) + ' (' + st.p[it.by] + ' 결제, ' + inc + '명' + out + ')');
      });
      lines.push('', '1인 부담');
      lines.push(res.people.map(function (pp) { return pp.name + ' ' + approx(pp.owe); }).join(' / '));
      lines.push('');
      if (!res.transfers.length) lines.push('보낼 돈 없음 (이미 정산 끝)');
      else {
        lines.push('이렇게 보내면 끝 (' + res.transfers.length + '번)');
        res.transfers.forEach(function (t) { lines.push(st.p[t.from] + ' → ' + st.p[t.to] + ' ' + UI.won(t.amount) + (st.ok.indexOf(sentKey(t)) >= 0 ? ' (보냄)' : '')); });
        if (res.unit > 1) lines.push('(' + res.unit.toLocaleString('ko-KR') + '원 단위 올림' + (res.extraTotal > 0.0001 ? ', 받는 사람에게 ' + approx(res.extraTotal) + ' 더 감' : '') + ')');
      }
      return lines.join('\n');
    }
    function drawResult() {
      resultBox.textContent = '';
      if (st.p.length < 2) { resultBox.appendChild(h('p', { class: 'help', text: '참가자를 2명 이상 넣으면 결과가 나옵니다.' })); return; }
      var res = BD.settle(st);
      if (!res.total) { resultBox.appendChild(h('p', { class: 'help', text: '항목 금액을 넣으면 결과가 나옵니다.' })); return; }

      var tbody = h('tbody', null, res.people.map(function (pp) {
        var bal = pp.net;
        var tag = Math.abs(bal) < 1e-9 ? h('span', { class: 'bal zero', text: '정산 끝' })
          : bal > 0 ? h('span', { class: 'bal plus', text: approx(bal) + ' 받음' })
          : h('span', { class: 'bal minus', text: approx(-bal) + ' 보냄' });
        return h('tr', null, [h('th', { scope: 'row', text: pp.name }), h('td', { text: UI.won(pp.paid) }), h('td', { text: approx(pp.owe) }), h('td', null, [tag])]);
      }));
      resultBox.appendChild(h('h2', { text: '결과 · 총 ' + UI.won(res.total) }));
      resultBox.appendChild(h('div', { class: 'table-wrap' }, [h('table', null, [
        h('thead', null, [h('tr', null, [h('th', { text: '이름' }), h('th', { text: '낸 돈' }), h('th', { text: '부담액' }), h('th', { text: '정산' })])]),
        tbody
      ])]));

      // 송금 링크 칸의 '받을 돈 있음' 표시 갱신 (입력 칸은 다시 그리지 않음)
      Array.prototype.forEach.call(payBox.querySelectorAll('.pay-person'), function (el) {
        var k = Number(el.getAttribute('data-k'));
        el.classList.toggle('gets', res.transfers.some(function (t) { return t.to === k; }));
      });
      // 지금 송금 목록에 없는 '보냈어요' 표시는 정리
      var keys = res.transfers.map(sentKey);
      st.ok = st.ok.filter(function (x) { return keys.indexOf(x) >= 0; });
      var tl = h('ol', { class: 'transfers' }, res.transfers.map(function (t) {
        var key = sentKey(t), sent = st.ok.indexOf(key) >= 0;
        var pay = st.w[t.to] || {};
        var acts = [];
        if (pay.t) acts.push(h('a', { class: 'btn pay-btn', href: tossUrl(pay.t), target: '_blank', rel: 'noopener noreferrer', text: '토스 열기' }));
        if (pay.k) acts.push(h('a', { class: 'btn pay-btn', href: kakaoUrl(pay.k), target: '_blank', rel: 'noopener noreferrer', text: '카카오페이 열기' }));
        // 피싱 방지: 어디로 가는지 작게 표시
        var dest = [];
        if (pay.t) dest.push('toss.me/' + pay.t);
        if (pay.k) dest.push('카카오페이 링크(끝\u00a0' + pay.k.slice(-4) + ')');
        if (acts.length) acts.push(h('button', { type: 'button', class: 'btn pay-btn', text: '금액 복사', onclick: function () {
          UI.copy(String(t.amount), UI.won(t.amount) + ' 금액을 복사했어요. 송금 앱에 붙여 넣으세요');
        } }));
        var cb = h('input', { type: 'checkbox' });
        cb.checked = sent;
        cb.addEventListener('change', function () {
          var i = st.ok.indexOf(key);
          if (cb.checked && i < 0) st.ok.push(key);
          if (!cb.checked && i >= 0) st.ok.splice(i, 1);
          changed(false);
        });
        return h('li', { class: sent ? 'sent' : null }, [
          h('div', { class: 'tr-line' }, [h('b', { text: st.p[t.from] }), h('span', { class: 'arrow', text: ' → ' }), h('b', { text: st.p[t.to] }), h('span', { class: 'amt', text: UI.won(t.amount) })]),
          acts.length ? h('div', { class: 'pay-acts' }, acts) : null,
          dest.length ? h('p', { class: 'pay-dest', text: '받는 곳: ' + dest.join(' · ') }) : null,
          h('label', { class: 'sent-check' }, [cb, h('span', { text: sent ? '보냈어요' : '보냈으면 체크' })])
        ]);
      }));
      resultBox.appendChild(h('h3', { text: res.transfers.length ? '이렇게 보내면 끝 · ' + res.transfers.length + '번' : '보낼 돈이 없어요' }));
      if (res.transfers.length) {
        resultBox.appendChild(tl);
        var anyPay = res.transfers.some(function (t) { var w = st.w[t.to]; return w && (w.t || w.k); });
        if (!anyPay) resultBox.appendChild(h('div', { class: 'pay-hint' }, [
          h('p', { text: '받을 사람이 토스 아이디나 카카오페이 송금 링크를 넣으면, 위 목록에 [토스 열기]·[카카오페이 열기] 버튼이 생겨요.' }),
          h('button', { type: 'button', class: 'btn small', text: '송금 버튼 붙이기', onclick: openPay })
        ]));
        resultBox.appendChild(h('p', { class: 'note', text: "송금 앱에서 받는 사람 이름이 맞는지 꼭 확인하고 보내세요. 공유 링크는 누구나 고쳐서 다시 보낼 수 있어요. '보냈어요'는 보낸 사람이 직접 누르는 표시일 뿐 실제 입금 확인이 아니에요. 체크 상태도 공유 링크에 담겨, 다시 공유하면 모두 같은 표시를 봅니다. 송금은 토스·카카오페이 앱에서 이루어지며 이 사이트는 돈이나 계좌 정보를 받지 않습니다. 토스·카카오페이는 각 회사의 상표이며, 도구집은 두 회사와 제휴 관계가 없습니다." }));
      }
      if (res.unit > 1 || res.extraTotal > 0.0001) {
        var extras = res.people.filter(function (pp) { return pp.extra > 0.0001; }).map(function (pp) { return pp.name + ' ' + approx(pp.extra); });
        resultBox.appendChild(h('p', { class: 'note' }, [
          res.unit > 1 ? res.unit.toLocaleString('ko-KR') + '원 단위로 올려 보냅니다. ' : '1원 단위 계산입니다. ',
          extras.length ? '올림 때문에 받는 사람에게 더 가는 돈: ' + extras.join(', ') + ' (총 ' + approx(res.extraTotal) + ').' : '올림으로 생기는 차액이 없어요.'
        ]));
      }
      resultBox.appendChild(h('div', { class: 'row-btns' }, [
        h('button', { type: 'button', class: 'btn primary', text: '공유하기', onclick: function () {
          UI.share('도구집 더치페이', summaryText(res), link());
        } }),
        h('button', { type: 'button', class: 'btn', text: '텍스트 복사', onclick: function () { UI.copy(summaryText(res) + '\n\n자세히: ' + link(), '단톡방에 붙여넣기 좋게 복사했어요'); } }),
        h('button', { type: 'button', class: 'btn', text: '링크 복사', onclick: function () { UI.copy(link(), '링크를 복사했어요'); } })
      ]));
    }

    root.appendChild(h('h1', { text: '더치페이' }));
    root.appendChild(h('p', { class: 'lead', text: '항목별로 낸 사람과 빠진 사람만 고르면, 누가 누구에게 얼마 보내면 끝나는지 알려 드려요.' }));
    root.appendChild(h('div', { class: 'field-label', text: '참가자 (2~' + MAXP + '명)' }));
    root.appendChild(h('div', { class: 'add-row' }, [nameInput, h('button', { type: 'button', class: 'btn small', text: '추가', onclick: function () { addNames(nameInput.value); nameInput.value = ''; nameInput.focus(); } })]));
    root.appendChild(peopleBox);
    root.appendChild(h('div', { class: 'field-label', text: '쓴 돈' }));
    root.appendChild(itemsBox);
    root.appendChild(h('div', { class: 'field-label', text: '보낼 금액 올림 단위' }));
    root.appendChild(unitBox);
    root.appendChild(paySec);
    root.appendChild(resultBox);
    root.appendChild(h('div', { class: 'row-btns minor' }, [h('button', { type: 'button', class: 'btn ghost', text: '모두 지우고 새로', onclick: function () {
      if (!confirm('입력한 내용을 모두 지울까요?')) return;
      st = fresh(); drawUnits(); changed(true);
    } })]));
    app.appendChild(root);
    drawPeople(); drawItems(); drawUnits(); drawPay(); drawResult();
  }

  window.Dutch = {
    page: function (app, params) {
      var d = params.get('d');
      var data = d ? sanitize(BD.decode(d)) : null;
      if (d && !data) UI.toast('링크가 잘려 내용을 불러오지 못했어요');
      render(app, data);
    },
    _sanitize: sanitize, _parseToss: parseToss, _parseKakao: parseKakao
  };
})();
