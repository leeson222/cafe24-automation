# 로컬 프리뷰

카페24 서버에 올리지 않고 VS Code Live Server에서 스킨의 **HTML·CSS 디자인**을 확인하는 도구입니다.
기능 확인용이 아닙니다. 카페24 기능은 동작하지 않으며, 동작하는 것처럼 꾸미지 않았습니다.

---

## 1. 사용법

```bash
npm run preview                                         # tools/preview/preview.config.json의 스킨·페이지로 생성
npm run preview -- --skin workspace/target-skin/skin4   # 스킨 지정
npm run preview -- --pages main,product-detail          # 일부 페이지만
npm run preview -- --no-jquery                          # jQuery를 넣지 않고 생성
```

보기

- **VS Code Live Server**: 웹 루트가 `preview/`여야 합니다. `.vscode/settings.json`에 `"liveServer.settings.root": "/preview"`를 두었습니다(로컬 전용, Git 제외). `preview/index.html`을 Live Server로 엽니다.
- **Live Server 없이**: `npm run preview:serve` → http://localhost:5510/

`preview/index.html`에 페이지 목록과 리소스 보고서가 있습니다. 자세한 내용은 `preview/_preview/report.md`에 있습니다.

> 루트를 `preview/`로 바꾸면 Live Server로 `skinkit/examples/demo.html`처럼 `preview/` 밖의 파일은 열 수 없습니다. 필요하면 설정을 잠시 지우거나 `npm run preview:serve`를 씁니다.

## 2. 구조

| 파일 | 역할 |
|---|---|
| `tools/preview/build-preview.mjs` | 생성기 (Node 20 이상, 외부 패키지 없음) |
| `tools/preview/preview.config.json` | 스킨, 결과 폴더, 페이지 목록, jQuery 주소 |
| `tools/preview/sample-data.json` | 템플릿 변수를 무엇으로 채울지 정하는 규칙 |
| `tools/preview/serve.mjs` | `preview/`를 루트로 하는 작은 정적 서버 |
| `preview/` | 결과 (Git 제외, 실행할 때마다 지우고 다시 만든다) |

```
preview/
├─ index.html              페이지 목록 + 없는 리소스 + 외부 리소스
├─ _preview/
│  ├─ main.html …          결합된 페이지
│  ├─ report.md            보고서
│  └─ assets/placeholder.svg
└─ (스킨 리소스 사본)        layout/, css/, js/, onjangteo_custom/, SkinImg/, skinkit/ … (.html 제외)
```

## 3. 생성 과정

| 단계 | 원본 | 프리뷰 |
|---|---|---|
| 리소스 | 스킨 폴더 | `.html`을 뺀 모든 파일을 `preview/`로 **복사** (내용 그대로). 원본 CSS의 `url(/몰폴더/…)` 경로를 고치지 않고 쓰기 위해 `preview/`를 웹 루트로 둔다 |
| `@layout` / `@contents` | 서버가 결합 | 레이아웃의 `@contents` 자리에 페이지 본문을 넣는다 |
| `@import` | 서버가 끼워 넣음 | 재귀로 끼워 넣는다. 순환·없는 파일은 주석으로 남기고 보고서에 적는다 |
| `@css` / `@js` | 서버가 묶어서 출력 | 선언한 자리에 `<link>` / `<script>`. 같은 파일 두 번째 선언은 생략 |
| `@define` | 로그 수집 선언 | 지운다 (화면 출력 없음) |
| `module="…"` | 서버가 `xans-*` class를 붙임 | 같은 규칙으로 class를 붙인다. `module` 속성은 그대로 둔다 |
| `{$변수}` | 실제 데이터 | `sample-data.json` 규칙의 샘플값 |
| `{$form.*}` | 카페24가 만든 입력 요소 | 이름으로 종류를 추정한 **빈 요소** (`name` 없음, `data-preview-form` 표시) |
| `{$…_selectbox}` | 카페24가 만든 `<select>` | 빈 `<select data-preview="selectbox">` (`name` 없음) |
| 관리자 전용 모듈 | 운영자 로그인 때만 출력 | `data-preview-admin` 표시를 붙이고 **기본으로 숨긴다**. 요소는 지우지 않는다 (아래 "상태 토글") |
| jQuery | 카페24가 자동 삽입 | CDN jQuery 1.12.4를 `<head>` 맨 앞에 넣는다 (버전 [확인 필요]) |
| 원본 보호 | — | 생성 전후 스킨 전체 해시를 비교한다. 다르면 실패(종료 코드 2) |

### 템플릿 변수 채우기

| 위치 | 값 |
|---|---|
| `<script>` 안 | `0` (JS 문법이 깨지지 않게) |
| `<style>` 안 | 빈 값 |
| `src` 속성 | `/_preview/assets/placeholder.svg` (회색 IMAGE) |
| `href`, `action` | `#none`. 단, 프리뷰로 만든 페이지 원본(`/product/list.html` 등)은 그 프리뷰 페이지로 연결 |
| 그 밖의 속성 (`class`, `id`, `style` …) | 빈 값 |
| 글자 | `sample-data.json`의 `text` 규칙 (예: 가격 `12,000`, 상품명 `샘플 상품명`, 날짜 `2026-11-19`). 규칙에 없으면 `샘플`. 아이콘 변수(`*_icon`)는 빈 값 |
| `{$…\|display}` | 빈 값 = **보임** |

규칙에 없어 `샘플`로 채운 변수는 보고서의 "규칙에 없어 샘플로 채운 변수"에 페이지별로 나옵니다. 화면이 어색하면 `sample-data.json`에 규칙을 더합니다.

### 상태 토글

카페24는 상태에 따라 영역을 골라서 출력하지만 프리뷰는 모두 보여 줍니다. 상태별 영역을 표시해 두고 페이지 **왼쪽 아래 토글**로 숨기거나 보입니다.

| 상태 | 대상 | 기본 |
|---|---|---|
| 관리자 전용 영역 | `preview.config.json`의 `adminOnly` 모듈 (`board_catemove_*`, `board_function_*`) | 숨김 |

- 켜면 영역에 주황 점선과 "관리자 전용 영역 · 모듈 이름" 라벨이 붙습니다.
- 선택은 브라우저에 저장되어 다른 프리뷰 페이지에도 이어집니다(localStorage). 주소에 `?preview-show=admin`을 붙여도 켜집니다.
- 숨김은 `display: none`만 씁니다. 요소는 그대로 있어서 스킨 JS는 실제 운영자 화면과 같은 요소를 찾습니다.
- 다른 관리자 전용 모듈은 [확인 필요]입니다. 찾으면 `adminOnly`에 더합니다 (`*` = 아무 글자).
- 로그인 전/후 같은 다른 상태는 `build-preview.mjs`의 `PREVIEW_STATES`에 항목을 더해 같은 방식으로 늘립니다.

### `xans-*` class 규칙

```
module="product_listnormal" → xans-element- xans-product xans-product-listnormal
module="board_paging_9"     → … xans-board-paging-9 xans-board-paging xans-board-9
```

숫자로 끝나는 모듈의 규칙은 skin4 `board.css`의 `.xans-board-paging-9.xans-board-paging.xans-board-9` 선택자로 확인했습니다. 모든 모듈이 이 규칙을 따르는지는 [확인 필요]입니다.

## 4. 원본과 프리뷰의 차이

| 항목 | 실제 카페24 | 프리뷰 |
|---|---|---|
| 데이터 | 관리자 등록 상품·게시글·회원 정보 | 고정 샘플 (`샘플 상품명`, `12,000`, 자리표시 이미지) |
| 반복 영역 | 상품 수만큼 반복 | 템플릿에 적힌 샘플 줄 수 그대로 (보통 2개) |
| 상태별 영역 | 로그인 전/후, 품절, 할인 여부 등에 따라 한쪽만 출력 (`\|display` → `displaynone`) | **모두 보인다** (예: 헤더에 로그인 전·후 아이콘이 함께 나옴). 관리자 전용 모듈만 토글로 숨긴다 |
| 관리자 전용 영역 | 운영자 로그인 때만 출력 | 기본 숨김, 토글로 보기 |
| 입력 요소 | `{$form.*}`이 카페24가 정한 input·select·라벨로 출력 | 이름으로 추정한 빈 요소. 라디오·체크박스 **라벨 글자는 나오지 않는다** |
| `<form>` | 모듈 출력 시 카페24가 감싼다 | 없다 (콘솔에 "Password field is not contained in a form") |
| `xans-record-` | 반복 줄에 서버가 붙인다 | 붙이지 않는다. 이 class로 꾸민 CSS는 프리뷰에 반영되지 않는다 |
| CSS·JS 출력 위치 | 카페24가 묶거나 head로 모을 수 있다 [확인 필요] | 선언한 자리 그대로 |
| 관리자 디자인 설정 | EZ 편집기·관리자 설정이 반영된 결과 | 스킨 파일에 적힌 값만 |
| 링크 | 실제 페이지 | 프리뷰로 만든 9개 페이지만 연결. 나머지는 `#none`이거나 없는 경로 |

## 5. 로컬에서 검증할 수 없는 기능

2026-11-19 skin4 9개 페이지의 브라우저 콘솔로 확인한 내용입니다 (headless Edge).

| 기능 | 이유 | 콘솔에서 본 것 |
|---|---|---|
| 가격 계산·할인·옵션 선택 | 카페24 전역 객체(`EC$`)와 상품 데이터가 없다. 흉내 내지 않는다 | `EC$ is not defined` (`/js/module/product/sale_price.js`) |
| 로그인·회원가입·장바구니·주문·결제 | 서버 처리. 입력 요소에 `name`이 없어 전송도 되지 않는다 | — |
| 게시판 쓰기·댓글·비밀글 | 서버 처리 | — |
| 슬라이드(Swiper) | 슬라이드 데이터 없이 샘플 구조만 있어 초기화가 실패하는 곳이 있다 | Swiper `Cannot read properties of undefined` |
| 네이버 지도 (팝업스토어) | 외부 API·도메인 등록이 필요하다 | `oapi.map.naver.com … reading 'destroy'` |
| 카페24 앱·위젯 (리뷰, 상담 등) | 카페24가 페이지에 넣는 스크립트라 스킨 파일에 없다 | — |
| 관리자 설정에 따른 노출 (진열, 아이콘, 배송비 문구) | 관리자 데이터 | — |
| 실제 반응형 이미지 비율 | 자리표시 이미지는 정사각형 하나뿐이다 | — |

디자인(레이아웃, 간격, 글꼴, 색, 버튼·입력 모양, SkinKit 토큰)은 확인할 수 있습니다.
JS로 구조를 바꾸는 화면(메뉴 열기, 탭, 아코디언 등)은 jQuery가 있으면 일부 동작하지만, 카페24 데이터에 의존하는 부분은 보장하지 않습니다.

## 6. 리소스 보고 (skin4, 2026-11-19 생성 기준)

없는 리소스 4개 — **모두 스킨 원본의 문제**이고 프리뷰 때문에 생긴 것이 아닙니다.

| 종류 | 경로 | 참조한 곳 |
|---|---|---|
| 이미지 | `/onjangteo_custom/img/sub-visual02.png` | `onjangteo_custom/css/comm.css` |
| 이미지 | `/onjangteo_custom/img/sub-visual03.png` | `onjangteo_custom/css/comm.css` |
| CSS | `/css/module/member/member_custom.css` | `member/login.html` |
| JS | `/insanlifemall/js/sale.js` | `product/detail.html` — **다른 쇼핑몰 폴더**를 참조 |

외부 리소스 73개(인터넷 필요): 카페24 이미지 서버 `img.echosting.cafe24.com` 56개, `ecimg.cafe24img.com` 8개, Google Fonts, Pretendard(jsdelivr), animate.css·wow.js(cdnjs), 네이버 지도, jQuery(프리뷰가 넣은 것) 등.

## 7. 원칙

- 원본 스킨은 읽기만 한다. 생성 전후 해시가 다르면 실패한다
- 결과는 `preview/`에만 쓴다 (`.gitignore`). 생성기는 저장소 안의 `preview` 폴더가 아니면 지우지 않는다
- 카페24 전용 문법을 일반 HTML로 바꾼 결과를 원본에 반영하지 않는다
- 카페24 기능을 흉내 내는 스크립트(`EC$` 대체, 가짜 장바구니 등)를 넣지 않는다
- 프리뷰가 더하는 요소는 표시가 있다: `data-preview*` 속성, `<style data-preview>`, `<script data-preview>`, `.preview-bar`
