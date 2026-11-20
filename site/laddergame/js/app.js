/* 주소(#) 기반 화면 전환 - 이 사이트는 사다리타기 전용(첫 화면이 바로 입력 화면) */
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
    if (path === '/ladder/play') { document.title = '사다리 결과 - 도구집'; Ladder.play(app, params); }
    else { document.title = '사다리타기 - 도구집'; Ladder.editor(app, params); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
