/* 화면 공용 도우미: 요소 만들기, 알림, 복사·공유, 최근 이름 기억 */
(function () {
  'use strict';
  var UI = {};

  UI.h = function (tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') el.style.cssText = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  };

  var toastTimer;
  UI.toast = function (msg) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  };

  UI.copy = function (text, okMsg) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      UI.toast(ok ? (okMsg || '복사했어요') : '복사가 막혀 있어요. 길게 눌러 직접 복사해 주세요');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { UI.toast(okMsg || '복사했어요'); }, fallback);
    } else fallback();
  };

  // 휴대폰 공유창(카카오톡 등). 지원하지 않으면 링크 복사로 대신함
  UI.share = function (title, text, url) {
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        UI.copy(url, '공유창을 못 열어 링크를 복사했어요');
      });
    } else UI.copy(url, '이 브라우저는 공유창이 없어 링크를 복사했어요');
  };

  UI.baseUrl = function () { return location.href.split('#')[0]; };

  // 최근 이름 기억 (localStorage, 실패해도 무시)
  var KEY = 'dogujip.recentNames';
  UI.loadNames = function () {
    try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }).slice(0, 20) : []; }
    catch (e) { return []; }
  };
  UI.saveNames = function (names) {
    try {
      var merged = names.concat(UI.loadNames()).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).slice(0, 20);
      localStorage.setItem(KEY, JSON.stringify(merged));
    } catch (e) { /* 저장 못 해도 동작에는 지장 없음 */ }
  };

  UI.clearNames = function () {
    try { localStorage.removeItem(KEY); return true; } catch (e) { return false; }
  };
  // '최근 이름' 옆 지우기 버튼 (이 기기 브라우저에 저장된 이름 삭제)
  UI.clearNamesButton = function (after) {
    return UI.h('button', { type: 'button', class: 'chip clear', text: '지우기', 'aria-label': '이 기기에 저장된 최근 이름 지우기', onclick: function () {
      UI.toast(UI.clearNames() ? '저장된 최근 이름을 지웠어요' : '브라우저 설정 때문에 지우지 못했어요');
      if (after) after();
    } });
  };

  UI.won = function (v) { return Math.round(v).toLocaleString('ko-KR') + '원'; };

  UI.cleanName = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 12); };

  window.UI = UI;
})();
