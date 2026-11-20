/* 주소(#) 기반 화면 전환 - 이 사이트는 더치페이 전용(첫 화면이 바로 입력 화면) */
(function () {
  'use strict';
  function route() {
    var app = document.getElementById('app');
    var raw = location.hash.replace(/^#/, '') || '/';
    var q = raw.indexOf('?');
    var path = q >= 0 ? raw.slice(0, q) : raw;
    var params = new URLSearchParams(q >= 0 ? raw.slice(q + 1) : '');
    app.textContent = '';
    document.body.dataset.page = path;
    document.title = '더치페이 - 도구집'; Dutch.page(app, params);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
