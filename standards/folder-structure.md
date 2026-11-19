# 폴더 구조 표준

> 상태: **초안 v0.1**. 네임스페이스 이름 `skinkit`은 [결정], 나머지 구조는 [제안]이다.
> 근거: `references/` 4개 스킨 분석 (2026-11-17)

## 1. 레퍼런스 스킨의 폴더 구조 변화

| 스킨 | 커스텀 루트 | 특징 | 표준에 반영할 점 |
|---|---|---|---|
| isumembers | `isu_custom/` | `css/`, `js/`, `img/`와 HTML 조각 30여 개가 한 단계에 섞여 있다 | 반영하지 않는다 |
| insanga | `insanlifemall/` | 외부 라이브러리를 커스텀 폴더에 넣었다 | 라이브러리는 `vendor/`로 분리한다 |
| heodakmkt | `heodakmkt/` | `bottomSheet/`, `modal/` 같은 UI 조각을 HTML 파일로 나눴다 | 반영한다 → `partials/` |
| novadeal | `aisoul/assets/...`와 `pages/` | 역할별 계층, 헤더·푸터를 타입별 파일로 분리했다 | **기준으로 삼는다** |

### novadeal 구조에서 고칠 점

- `aisoul/assets/css/cafe24/ec-base/*`, `aisoul/assets/js/cafe24/ec-base/*`는 **어디서도 불러오지 않는 사본**이다. 표준에서는 사본을 두지 않는다.
- HTML 조각(`/pages/`)과 리소스(`/aisoul/`)가 다른 루트에 있다. 표준에서는 `skinkit/` 하나에 모은다.
- 빈 파일(`lnb.js`, `main.js`, `sale.js`, `table.css`, `aside.css`, `top_btn.html`)과 테스트 파일(`pages/main/test.html`)을 남기지 않는다.
- 쇼핑몰 전용 코드(SSO, 임직원, 폐쇄몰)가 공통 위치(`front/`)에 섞여 있다. 표준에서는 프로젝트 폴더로 뺀다.

## 2. 표준 구조

```
skin/                              ← 카페24 스킨 루트 (예: skin15)
├─ layout/basic/                   ← 카페24 기본. 수정 금지 (7장 패치 규칙 참고)
├─ css/, js/, product/, board/ …   ← 카페24 기본 페이지·모듈 파일
│
├─ skinkit/                        ← 모든 스킨 공통 (자동화 대상). 상세: skinkit/README.md
│  ├─ tokens/                      ← primitives → semantic → components → legacy-alias  [구현됨]
│  ├─ base/                        ← reset, typography, utility                          [구현됨]
│  ├─ components/                  ← 카페24 공통 UI: button, input, check, select, quantity, pagination  [구현됨]
│  ├─ cafe24/                      ← 카페24 화면 보정: layer, icons, empty, product-info, board, member, myshop  [구현됨]
│  ├─ adapters/                    ← 스타일용 DOM 변경 (옵트인): core, address-form, agreement-title, custom-select, address-book  [구현됨]
│  ├─ themes/                      ← theme.example.css (쇼핑몰이 복사해서 :root 값만 바꾼다)
│  ├─ examples/demo.html           ← 카페24 마크업 흉내 + 자동 검사
│  ├─ tools/build.mjs              ← 브레이크포인트 적용, 합치기, 토큰·경로 검사
│  ├─ dist/                        ← skinkit.css, skinkit.js (카페24에 실제로 올리는 파일)
│  ├─ skinkit.config.json          ← 브레이크포인트, 파일 순서
│  ├─ js/components/               ← catalog JS 컴포넌트 (header-sticky, floating-actions, tab, modal …)  [제안]
│  └─ partials/                    ← <!--@import--> 대상 HTML 조각 (layout/, components/, modal/, env/)  [제안]
│
└─ {mall}/                         ← 쇼핑몰 전용 (예: novadeal/). 자동화 대상 아님
   ├─ theme.css                    ← SkinKit 토큰 값 (themes/theme.example.css 복사)
   ├─ assets/css, assets/js        ← API 연동, SSO, 기획전 등 그 몰에서만 쓰는 코드
   └─ partials/
```

### 폴더를 나누는 기준

| 질문 | 예 → 위치 |
|---|---|
| 다른 쇼핑몰에도 그대로 들어가는가? | `skinkit/` |
| 특정 쇼핑몰의 API, 회원 체계, 디자인에 묶여 있는가? | `{mall}/` |
| 도메인, 인증 키, 추적 코드처럼 운영 환경에 따라 달라지는가? | `skinkit/partials/env/` (값은 쇼핑몰별로 채운다) |
| 카페24 기본 UI의 모양만 바꾸는가? | `skinkit/components/`(공통 UI) 또는 `skinkit/cafe24/`(화면별 보정) |
| 쇼핑몰마다 다른 디자인 값인가? | `{mall}/theme.css`의 토큰 |

## 3. SEO·운영 설정 분리

다음 항목은 공통 코드에 넣지 않고 **환경별 조각**으로 관리한다.

- canonical, robots, noindex, Open Graph, 사이트맵
- 검색엔진 인증 메타 (네이버, 구글)
- 추적 코드 (GTM, 네이버 로그 등), SDK 키 (Kakao 등)
- 도메인 리다이렉트, 운영 URL

```html
<!-- skinkit/partials/env/dev-head.html
     기능: 개발 스킨용 head 설정
     이유: 개발 스킨이 검색에 노출되지 않게 막는다.
           운영 인증 메타·추적 코드는 일부러 넣지 않는다 (복제 사고 방지) -->
<meta name="robots" content="noindex, nofollow">

<!-- skinkit/partials/env/prod-head.html
     기능: 운영 스킨용 head 설정 자리
     이유: 운영에만 필요한 값을 한곳에 모아 개발 스킨과 섞이지 않게 한다.
           실제 값은 쇼핑몰마다 채운다 -->
<!-- <meta name="google-site-verification" content="{쇼핑몰별 값}"> -->
```

> [확인 필요] 카페24에서 개발 스킨과 운영 스킨을 구분해 검색 노출을 막는 공식 설정이 있는지, 위 메타만으로 충분한지 검증해야 한다.

## 4. layout.html 호출 순서

순서가 바뀌면 jQuery와 Swiper 격리가 깨진다. 아래 순서를 지킨다.

```html
<!-- ① 카페24 기본 CSS
     기능: 카페24 기본 UI 스타일
     이유: 기본 스타일을 먼저 깔고, 뒤에서 skinkit이 덮어쓴다. 기존 선언을 그대로 둔다 -->
<!--@css(/layout/basic/css/common.css)-->
<!--@css(/layout/basic/css/ec-base-ui.css)-->
<!-- … 나머지 ec-base-*.css … -->
<!--@css(/layout/basic/css/swiper.min.css)-->

<!-- ② 카페24 기본 JS
     기능: 카페24 Swiper 4.5.1, 기본 레이아웃 스크립트
     이유: 카페24 detail.js(관련상품)와 main.js(메인 슬라이드)가 전역 Swiper 4를 쓴다.
           그래서 skinkit보다 먼저 불러서 전역 자리를 차지하게 둔다 -->
<!--@js(/layout/basic/js/swiper-bundle.min.js)-->
<!--@js(/layout/basic/js/basic.js)-->
<!--@js(/layout/basic/js/layout.js)-->
<!--@js(/js/common.js)-->

<!-- ③ jQuery 3.7.1 격리
     기능: skinkit 전용 jQuery를 SkinKit.$에 담고, 전역 $·jQuery는 카페24 것으로 되돌린다
     이유: 카페24 jQuery는 버전이 낮다. 그렇다고 전역을 바꾸면 카페24 스크립트가 깨질 수 있다.
     주의: noConflict(true)는 반드시 jQuery를 불러온 바로 다음 줄에서 호출한다.
           사이에 다른 스크립트가 끼면 그 스크립트가 잘못된 버전을 잡는다
     [확인 필요] 이 시점에 카페24 전역 jQuery가 있는지 (콘솔: jQuery.fn.jquery) -->
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script>
    window.SkinKit = window.SkinKit || {};
    SkinKit.$ = jQuery.noConflict(true);
</script>

<!-- ④ Swiper 11 격리
     기능: skinkit 전용 Swiper 11을 SkinKit.Swiper에 담고, 전역 Swiper는 4.5.1로 되돌린다
     이유: 최신 API(min-width 기준 breakpoints 등)를 쓰면서 카페24 기본 슬라이드를 깨뜨리지 않는다
     [확인 필요] 고정할 11.x 패치 버전, CSS 충돌 (.swiper-wrapper/.swiper-slide 공유 규칙) -->
<script>SkinKit._swiperLegacy = window.Swiper;</script>
<script src="https://cdn.jsdelivr.net/npm/swiper@11.x.x/swiper-bundle.min.js"></script>
<script>
    SkinKit.Swiper = window.Swiper;
    window.Swiper = SkinKit._swiperLegacy;
    delete SkinKit._swiperLegacy;
</script>

<!-- ⑤ 환경별 head 조각
     기능: SEO·운영 설정
     이유: 공통 코드와 분리해서 개발/운영 스킨에 각각 다른 파일을 연결한다 -->
<!--@import(/skinkit/partials/env/dev-head.html)-->

<!-- ⑥ skinkit CSS → 쇼핑몰 테마 → 쇼핑몰 전용 CSS
     기능: 공통 스타일, 쇼핑몰 토큰 값, 쇼핑몰 전용 스타일 순서
     이유: 테마(:root)는 skinkit 기본 토큰보다 뒤에 있어야 이긴다.
           skinkit은 빌드로 한 파일(dist/skinkit.css)이라 layout.html·popup.html에 같은 줄만 넣는다 -->
<!--@css(/skinkit/dist/skinkit.css)-->
<!--@css(/{mall}/theme.css)-->
<!--@css(/{mall}/assets/css/…)-->

<!-- ⑦ skinkit adapter → 쇼핑몰 전용 JS
     기능: 스타일용 DOM 변경(adapter). <html data-sk-adapters="…">로 켠 것만 실행된다
     이유: adapter는 jQuery 없이 동작해서 ③④의 격리 순서와 무관하다 -->
<!--@js(/skinkit/dist/skinkit.js)-->
<!--@js(/{mall}/assets/js/…)-->

<!-- ⑧ 카페24 EZ 초기화는 원래 위치를 유지한다
     이유: EZ 편집기와의 관계를 검증하지 않았다 [확인 필요] -->
<!--@js(/ez/init.js)-->
```

> [확인 필요] 네 스킨 모두 `sub_style.css`, `add_theme*.css`를 `</body>` 직전에 선언한다. 카페24가 `@css` 선언을 head로 모으는지, 선언 위치대로 불러오는지에 따라 skinkit CSS가 덮어써질 수 있다. 실제 페이지의 CSS 로딩 순서를 확인한 뒤 이 순서를 확정한다.

## 5. 파일 호출 규칙

- 경로는 **스킨 루트 기준 절대경로**로 쓴다. 예: `<!--@js(/skinkit/dist/skinkit.js)-->`
- 모든 페이지에 필요한 파일은 `layout.html`에서, 한 페이지에만 필요한 파일은 **그 페이지 파일 상단**에서 부른다.
- 같은 파일을 두 번 선언하지 않는다. novadeal에서는 폰트 CSS가 두 번 선언되어 있었다.
- 파일을 옮기면 다음을 모두 확인한다.
  - `@css`, `@js`, `@import` 선언 경로
  - CSS 안의 `url()` 경로
  - JS 안에서 만드는 경로 문자열
  - 실제 파일 존재 여부

### 카페24 경로 처리 주의 (novadeal 주석에서 확인)

- 카페24는 스킨 안의 `'/xxx.html'` 꼴 문자열을 경로로 보고 스킨 폴더를 덧붙여 내보낸다. JS에서 페이지 경로를 비교할 때는 **확장자를 빼고** 비교한다.
- 인라인 스크립트에서 역슬래시가 사라질 수 있다. 정규식이 필요한 코드는 외부 JS 파일에 둔다.

> [확인 필요] CSS `url()`의 상대경로를 카페24가 어떤 기준으로 해석하는지 확인한 뒤 이미지 경로 규칙(6장)을 확정한다.

## 6. 이미지 경로 [제안]

- 공통 아이콘: 이미지 파일을 쓰지 않는다. 카페24가 CSS 가상 요소로 그리는 아이콘(X, 화살표, +/−)은 색만 토큰으로 바꾸고(`skinkit/cafe24/icons.css`), 새 아이콘은 data URI 토큰으로 둔다(`--sk-select-arrow`, `--sk-check-mark`). CSS `url()` 상대경로 해석이 확인되지 않았기 때문이다
- 쇼핑몰 전용 이미지: `{mall}/assets/img/` 또는 카페24 이미지 호스팅
- JS와 CSS에 **몰 전용 이미지 URL을 직접 쓰지 않는다**. 레퍼런스에서는 `ecimg.cafe24img.com/pg.../` 하드코딩이 40~82곳 있었다. 꼭 필요하면 쇼핑몰 설정 객체나 CSS 변수로 뺀다.

## 7. 카페24 기본 파일 패치 규칙

원칙은 수정 금지다. 꼭 고쳐야 하면 다음을 모두 지킨다.

1. 수정한 위치에 `[SKINKIT PATCH]` 주석으로 **이유와 원래 코드**를 남긴다.
2. 이 문서 아래 패치 목록에 기록한다.
3. 스킨 업데이트 후 패치가 남아 있는지 다시 확인한다.

```js
// [SKINKIT PATCH] 2026-11-17
// 기능: #header가 없을 때 fixedHeader()를 그냥 빠져나가게 한다
// 이유: skinkit 헤더는 #custom-header를 쓴다. #header가 없으면 원본 코드가
//       scrollHeight에서 TypeError를 내고, load 핸들러 전체(handleNav, searchLayer 등)가 멈춘다
// 원본: var header_height = document.getElementById("header").scrollHeight + 'px';
if (!header || !fixed_margin) return;
```

### 패치 목록

| 파일 | 내용 | 출처 |
|---|---|---|
| `layout/basic/js/layout.js` | `fixedHeader()`에 `#header` null 체크 추가, `bottomNav()` 호출 주석 처리 | novadeal에서 확인 |
| `skin2/layout/basic/layout.html` | 프로모션·할인관·타임핫딜 미사용으로 `project.css`·`project.js`·`front/package_state.js` 호출과 모바일 헤더 숨김 경로 분기 삭제. 파일이 없는 `front/config.js`·`core.js`·`family_site.js` 호출 삭제 | skin2(단양더덕농산), 2026-11-17 |
| `skin2/layout/basic/js/layout.js` | 검색 미사용으로 load 핸들러의 `searchLayer()` 호출 주석 처리 (검색 레이어가 없으면 null 오류) | skin2(단양더덕농산), 2026-11-17 |
| `skin2/layout/basic/layout.html`, `popup.html` | 장바구니를 insanga 방식으로 교체하면서 노바딜 `basket.js` 호출 삭제 | skin2(단양더덕농산), 2026-11-17 |
| `skin2/layout/basic/popup.html` | `project.css`·`promo.css`·`sub_main.css`·`project.js` 호출 삭제 | skin2(단양더덕농산), 2026-11-17 |
| `skin4/layout/basic/layout.html`, `main.html` | onjangteo `reset.css` 앞에 `skinkit.css`·`onjangteo_custom/theme.css`·`skinkit.js` 호출 추가 (`[SKINKIT]` 주석) | skin4(onjangteo), 2026-11-19 |
| `skin4/layout/basic/popup.html` | `ec-base-layer.css` 뒤에 `skinkit.css`·`theme.css`, `popup.js` 뒤에 `skinkit.js` 호출 추가 | skin4(onjangteo), 2026-11-19 |
| `skin4/onjangteo_custom/css/comm.css` | `.btnSubmit` 배경·hover `!important`에 `:not(.disabled)` 추가, 라디오 선택 이미지 규칙을 SkinKit 토큰으로 대체 (원본은 `[SKINKIT]` 주석에 보관) | skin4(onjangteo), 2026-11-19 — 쇼핑몰 CSS라 카페24 기본 파일은 아니지만 함께 기록 |

> [제안] `#header`를 참조하는 카페24 함수가 깨지지 않게 하는 다른 방법(예: 빈 `#header` 요소 유지)도 검토해서 패치를 없앨 수 있는지 확인한다.

## 8. 파일 이름 규칙 [제안]

- 파일과 폴더 이름은 **kebab-case**로 쓴다. 예: `floating-actions.js`, `header-type01.html`
- 레퍼런스는 snake_case, camelCase, kebab-case가 섞여 있었다.
- 카페24 기본 파일 이름은 바꾸지 않는다.

## 9. novadeal → skinkit 위치 대응표

| novadeal | skinkit |
|---|---|
| `aisoul/assets/css/base/variables.css` | `skinkit/tokens/*` (3단 토큰) + `tokens/legacy-alias.css` |
| `aisoul/assets/css/base/reset.css`, `utility.css` | `skinkit/base/reset.css`, `typography.css`, `utility.css` |
| `aisoul/assets/css/cafe24/ec-base/*` (사본) | 버린다 (불러오는 곳이 없었다) |
| `aisoul/assets/css/components/button·input·quantity·pagenation` | `skinkit/components/*` |
| `aisoul/assets/css/components/modal·board·member·myshop` 일부 | `skinkit/cafe24/*` (카페24 기본 마크업 부분만) |
| `aisoul/assets/css/components/promo·project·products 대부분` | `{mall}/` |
| `aisoul/assets/js/components/dropdown.js` + `basket.js`(select) | `skinkit/adapters/custom-select.js` (통합) |
| `aisoul/assets/js/components/member.js`(우편번호·약관 제목) | `skinkit/adapters/address-form.js`, `agreement-title.js` |
| `aisoul/assets/js/components/myshop.js`(주소록) | `skinkit/adapters/address-book.js` + `skinkit/cafe24/myshop.css` |
| `aisoul/assets/js/components/product.js`(표 → dl) | 버린다. `skinkit/cafe24/product-info.css`(CSS 블록화)로 대체 |
| `aisoul/assets/js/base/common.js` | 기능별로 나눠 catalog JS 컴포넌트로 [제안] |
| `aisoul/assets/js/front/*` | `{mall}/assets/js/` (API·SSO·임직원 등) |
| `pages/layout/*` | `skinkit/partials/layout/*` |
| `pages/main/*`, `pages/promotion/*` 등 | `{mall}/partials/` |
