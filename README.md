# 도구집 (dogujip.com)

설치·가입 없이 링크 하나로 모임에서 바로 쓰는 웹 도구 모음입니다.

| 사이트 | 주소 | 폴더 |
|---|---|---|
| 도구집 소개 | https://dogujip.com/ | `site/dogujip_root/` |
| 사다리타기 | https://laddergame.dogujip.com/ | `site/laddergame/` |
| 더치페이 | https://dutchtreat.dogujip.com/ | `site/dutchtreat/` |

- 결과는 링크(# 뒤)에 담겨, 링크를 받은 사람 모두 같은 사다리·정산 결과를 봅니다.
- 공유 링크에는 입력한 이름·결과(더치페이는 항목·금액, 넣었다면 송금 아이디·링크와 '보냈어요' 표시)가 그대로 담깁니다. 송금은 토스·카카오페이 앱으로 연결만 하며 이 사이트는 돈·계좌 정보를 다루지 않습니다. 필요한 사람에게만 보내 주세요.

## 입력 내용이 서버로 가지 않는지 확인하는 방법
1. **코드**: 각 도구의 `js/` 폴더에 화면·계산 코드가 있습니다. 데이터를 보내는 코드(`fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`)가 없습니다.
2. **보안 정책(CSP)**: 각 `index.html`의 meta CSP와 `.htaccess` 헤더 모두 `connect-src 'none'`입니다. 소개 페이지는 `script-src 'none'`(스크립트 없음)입니다.
3. **링크의 # 뒷부분**: 공유 링크의 결과 데이터는 주소의 `#` 뒤에 있어 브라우저가 서버로 보내지 않습니다.
4. **개발자 도구**: 네트워크 탭에서 같은 사이트의 파일 읽기 외에 요청이 없는지 볼 수 있습니다.

## 구조
- `site/<폴더>/` — 각 사이트(하위 도메인) 폴더에 그대로 올리는 파일입니다. 빌드 과정이 없으며, 폴더끼리 서로 의존하지 않습니다(공통 코드는 각 폴더에 복사).
- 최근 입력한 이름만 이 기기 브라우저(localStorage)에 저장하며, 화면의 [지우기]로 지울 수 있습니다.

## 라이선스
이 저장소의 코드는 MIT 라이선스(`LICENSE`)입니다. 외부 라이브러리를 쓰지 않습니다.

---

**English (short)** — Small no-install, no-sign-up web tools: a ladder game (https://laddergame.dogujip.com/) and a bill splitter (https://dutchtreat.dogujip.com/), plus a hub page (https://dogujip.com/). Results live in the URL fragment (`#…`), which browsers do not send to the server; optional Toss/KakaoPay links are stored in the shared URL as well (the site only opens those apps and never handles money or account data). No network code; CSP `connect-src 'none'`. No third-party libraries. License: MIT.
