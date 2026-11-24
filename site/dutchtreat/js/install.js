/* 홈 화면에 앱으로 추가(선택). 설치하지 않아도 그대로 쓸 수 있습니다. */
(function () {
  'use strict';
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if (standalone) return;

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var inApp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp/i.test(ua);
  var isAndroid = /Android/i.test(ua);
  var deferred = null;

  var top = document.querySelector('.top');
  if (!top) return;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'install-btn';
  btn.textContent = '앱으로 추가';
  btn.setAttribute('aria-label', '홈 화면에 앱으로 추가 (선택)');
  btn.hidden = true;
  top.appendChild(btn);

  function show() { btn.hidden = false; top.classList.add('can-install'); }
  function hide() { btn.hidden = true; top.classList.remove('can-install'); }

  var sheet = null;
  function guide(lines) {
    if (sheet) sheet.remove();
    sheet = document.createElement('div');
    sheet.className = 'install-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', '홈 화면에 추가하는 방법');
    var h = document.createElement('p'); h.className = 'install-title'; h.textContent = '홈 화면에 추가하는 방법';
    sheet.appendChild(h);
    var ol = document.createElement('ol');
    lines.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ol.appendChild(li); });
    sheet.appendChild(ol);
    var note = document.createElement('p'); note.className = 'install-note'; note.textContent = '추가하지 않아도 지금처럼 링크로 쓸 수 있어요.';
    sheet.appendChild(note);
    var close = document.createElement('button'); close.type = 'button'; close.className = 'btn'; close.textContent = '닫기';
    close.onclick = function () { sheet.remove(); sheet = null; btn.focus(); };
    sheet.appendChild(close);
    document.body.appendChild(sheet);
    close.focus();
  }

  btn.addEventListener('click', function () {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function (c) { if (c && c.outcome === 'accepted') hide(); deferred = null; }).catch(function () {});
      return;
    }
    if (inApp && isIOS) {
      guide(['오른쪽 아래(또는 위) 메뉴에서 "Safari로 열기"를 누르세요.', 'Safari 아래쪽 공유 버튼(네모에 위쪽 화살표)을 누르세요.', '"홈 화면에 추가"를 누르세요.']);
    } else if (inApp) {
      guide(['오른쪽 위 메뉴(⋮)에서 "다른 브라우저로 열기"를 누르세요.', '크롬 등에서 열린 화면의 "앱으로 추가" 버튼을 누르세요.']);
    } else if (isIOS) {
      guide(['아래쪽(또는 주소창 옆) 공유 버튼(네모에 위쪽 화살표)을 누르세요.', '목록에서 "홈 화면에 추가"를 누르세요.', '오른쪽 위 "추가"를 누르면 끝이에요.']);
    } else {
      guide(['브라우저 메뉴(⋮)를 여세요.', '"홈 화면에 추가" 또는 "앱 설치"를 누르세요.']);
    }
  });

  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; show(); });
  window.addEventListener('appinstalled', function () { hide(); deferred = null; if (window.UI && UI.toast) UI.toast('홈 화면에 추가했어요'); });

  if (isIOS || inApp) show();
  else if (isAndroid) setTimeout(function () { if (!deferred) show(); }, 4000);
})();
