# UI 및 코드 작성 규칙

> 상태: **초안 v0.1**. jQuery·Swiper·브레이크포인트 기준은 [결정], 나머지는 [제안]이다.

## 1. 주석 규칙 [결정]

코드 블록마다 **기능**과 **이유**를 남긴다. 카페24 의존성이 있으면 함께 적는다.

```js
/* ******************************************************
 * 헤더 스티키
 * 기능: 스크롤이 기준 높이를 넘으면 헤더를 고정한다
 * 이유: 스크롤마다 클래스를 다시 붙이면 진입 애니메이션이 반복된다.
 *       그래서 상태가 실제로 바뀔 때만 적용한다
 * 카페24: layout/basic/js/layout.js의 fixedHeader()가 #header를 찾는다
 ****************************************************** */
```

- 레퍼런스의 `[FRONT 수정]` 주석(novadeal)처럼 **원래 코드가 왜 문제였는지**를 남기는 방식은 유지한다.
- 날짜와 작성자를 남길 때는 `YYYY-MM-DD` 형식을 쓴다.

## 2. 디자인 토큰 [제안]

`skinkit/tokens/`에 3단으로 모은다 (구현됨, 아래는 처음 제안한 형태). novadeal `variables.css`를 바탕으로 정리했다.

| 파일 | 내용 | 쇼핑몰이 바꾸는가 |
|---|---|---|
| `primitives.css` | 회색 단계, 둥글기, 글꼴 목록, 시간 | 거의 안 바꾼다 |
| `semantic.css` | 주색, 글자색, 테두리, 배경, 상태, 글꼴, z-index, 브레이크포인트(JS용) | **주로 여기** |
| `components.css` | 버튼 유형·크기·상태, 입력, 체크, select, 수량, 페이지, 레이어, 게시판 … | 필요한 것만 |
| `legacy-alias.css` | `--main-color` 등 novadeal 이름 → 새 토큰 | 바꾸지 않는다 (선택 포함) |

쇼핑몰 값은 `{mall}/theme.css`에서 `:root`만 덮어쓴다. 전체 목록과 사용법은 `skinkit/README.md`.

```css
:root {
    /* 색상
       기능: 브랜드·상태 색
       이유: 쇼핑몰마다 바뀌는 값이라 한곳에 모아 교체하기 쉽게 한다 */
    --sk-color-main: #FB5800;
    --sk-color-text: #212121;
    --sk-gray-1: #F2F2F2;
    /* … --sk-gray-9 까지 … */

    /* 레이아웃 높이
       기능: JS(layout-metrics)가 실제 높이를 재서 덮어쓴다
       이유: JS가 실행되기 전에도 calc()가 무효가 되지 않도록 기본값을 둔다.
             novadeal은 --header-height 기본값이 없어 초기에 min-height가 빠졌다 */
    --sk-header-h: 0px;
    --sk-sub-header-h: 0px;
    --sk-footer-h: 0px;
    --sk-bottom-fixed-h: 0px;

    /* 컨테이너
       기능: 콘텐츠 최대 폭
       이유: 미디어쿼리 기준이 아니라 폭 제한 값이다. 브레이크포인트와 섞지 않는다 */
    --sk-max-container: 1200px;

    /* 브레이크포인트 (JS 읽기용)
       기능: JS가 matchMedia에 쓸 기준값
       이유: CSS 미디어쿼리는 var()를 못 쓰므로, JS만 이 값을 읽는다.
             CSS 쪽 숫자는 생성 시 같은 설정값에서 넣는다 (3장) */
    --sk-bp-layout: 1024;
    --sk-bp-small: 767;
}
```

- 변수 이름에 `--sk-` 접두사를 붙인다. 카페24나 외부 앱 변수와 겹치지 않게 하기 위해서다.

## 3. 브레이크포인트 [결정]

### 구간

| 이름 | 값 | 용도 |
|---|---|---|
| `layout` | **1024** (1080으로 바뀔 수 있음) | PC 레이아웃과 모바일 레이아웃 전환 |
| `small` | 767 | 작은 모바일 |

- novadeal CSS에는 1024가 26곳, 1080이 23곳, 그 밖에 768·1200·1280이 섞여 있었다. 표준에서는 위 두 값만 쓴다.
- 1200은 컨테이너 폭(`--sk-max-container`)으로 처리한다.
- 1280처럼 특정 컴포넌트에만 필요한 값은 그 컴포넌트 설정에 두고, 카탈로그에 기록한다.

### 값을 한곳에서 관리하는 방법

CSS 미디어쿼리 안에서는 `var()`를 쓸 수 없고, 카페24는 업로드한 파일을 그대로 쓴다. 그래서 **설정 파일 하나에서 CSS 숫자와 JS 값을 모두 만든다.**

```json
// skinkit.config.json
// 기능: 스킨 생성 시 쓰는 설정
// 이유: 1024 → 1080 변경을 여기 한 곳에서 끝내기 위해서다
{
  "breakpoint": { "layout": 1024, "small": 767 }
}
```

```css
/* 기능: 모바일 레이아웃 전용 스타일
   이유: 숫자 뒤에 bp 표시 주석을 단다. 빌드(skinkit/tools/build.mjs)가 skinkit.config.json의 값으로 숫자를 바꾼다.
         원본도 그대로 유효한 CSS라 빌드 없이 열어도 깨지지 않는다 (처음 제안한 {{bp.layout}} 자리표시자는 CSS 문법 오류라 바꿨다) */
@media (max-width: 1024px /*bp.layout*/) { /* … */ }

/* 기능: PC 레이아웃 전용 스타일
   이유: max-width 1024와 겹치지 않도록 1px 큰 값에서 시작한다. +1 표시를 달면 빌드가 설정값 + 1을 넣는다 */
@media (min-width: 1025px /*bp.layout+1*/) { /* … */ }
```

> 미결정: 지원 브라우저가 Safari 16.4 이상이면 범위 문법(`width <= 1024px`, `width > 1024px`)을 쓴다. 소수점 폭(1024.5px)에서 어느 쪽에도 해당하지 않는 구간이 생기지 않는다. 결정 전까지는 위 `max-width`/`min-width` 방식을 쓴다.

- **값을 바꿀 때**: `skinkit.config.json`을 바꾸고 `node skinkit/tools/build.mjs`를 실행한다. 설정에 없는 bp 이름을 쓰면 빌드가 멈춘다.
- **감사**: `audit-skin` 단계에서 설정에 없는 브레이크포인트 숫자를 찾아 경고한다.

## 4. z-index 단계 [제안]

novadeal은 헤더 `999999`, 하단바 `9999999`처럼 값이 계속 커졌다. 단계를 미리 정한다.

| 토큰 | 값 | 대상 |
|---|---|---|
| `--sk-z-sticky` | 100 | 스티키 탭, 서브 헤더 |
| `--sk-z-header` | 200 | 고정 헤더 |
| `--sk-z-floating` | 300 | 탑버튼, 하단 고정바 |
| `--sk-z-dim` | 900 | 모달 배경 |
| `--sk-z-modal` | 1000 | 모달, 바텀시트 |
| `--sk-z-toast` | 1100 | 토스트 |

> [확인 필요] 카페24 기본 레이어(`#capp-shop-new-product-optionselect-layer` 등)와 외부 앱 위젯의 z-index를 조사해서 위 단계와 겹치지 않는지 확인한다.

## 5. 클래스·속성 이름 규칙 [제안]

| 대상 | 규칙 | 예 |
|---|---|---|
| skinkit 컴포넌트 | `sk-` 접두사 + BEM | `sk-tab`, `sk-tab__btn`, `sk-tab__panel` |
| 상태 | `is-*` | `is-active`, `is-open`, `is-visible` |
| JS 연결 지점 | `data-sk-*` 속성 | `data-sk-tab`, `data-sk-accordion` |
| 카페24 기본 클래스 | **바꾸지 않는다** | `xans-*`, `ec-base-*`, `displaynone` |

- 스타일은 클래스로, JS는 `data-sk-*`로 연결한다. 디자인을 바꾸려고 클래스를 바꿔도 JS가 깨지지 않게 하기 위해서다.
- 레퍼런스에서는 같은 탭이 `.on`(heodakmkt)과 `.active`(novadeal)로 갈렸다. 상태 클래스는 `is-*`로 통일한다.

## 6. CSS 규칙

1. **카페24 기본 UI는 덮어쓰기로 고친다.** 기본 파일(`layout/basic/css/ec-base-*.css`)은 수정하지 않는다. insanga는 `layout.css`를 625줄 고쳤는데, 스킨 업데이트에 취약하다.
2. **적용 범위를 좁힌다.** novadeal `input.css`는 `body #contents input[type=checkbox]`처럼 전체에 적용되어 주문서·결제 영역까지 바뀐다. 공통 폼 스타일에서는 주문서 영역을 빼거나 범위를 클래스로 한정한다.
   ```css
   /* 기능: 체크박스 공통 모양
      이유: 주문서·PG 영역은 수정 범위가 제한되어 있어 제외한다
      [확인 필요] 주문서 루트 선택자 (예: .xans-order-form) 확인 */
   #contents :where(input[type="checkbox"]):not(.xans-order-form *) { /* … */ }
   ```
3. **`!important`는 카페24 인라인 스타일을 이겨야 할 때만** 쓰고, 이유를 주석으로 남긴다.
4. **행 순서(`nth-child`)로 카페24 표를 꾸미지 않는다.** isumembers는 상품 기본정보 표를 `tr:nth-child(4)`로 다뤘는데, 관리자에서 항목 순서를 바꾸면 깨진다.
5. **카페24 표를 블록으로 바꿀 때는 CSS로 한다.** novadeal 옵션 표처럼 `table/tbody/tr/td`에 `display:block`을 주면 표 구조는 남고 화면만 바뀐다.
6. 폰트는 `layout.html`에서 한 번만 불러온다. `* { font-family }` 같은 전체 선택자는 쓰지 않고 `body`에 지정한다.

## 7. JS 규칙

### 7-1. 기본 틀

```js
/* ******************************************************
 * 컴포넌트 이름
 * 기능: …
 * 이유: …
 ****************************************************** */
(function ($) {
    'use strict';

    // 기능: 같은 요소에 두 번 초기화하지 않게 막는다
    // 이유: 카페24는 모듈을 다시 그리는 경우가 있어 init이 여러 번 불릴 수 있다
    function init(root) {
        $(root).find('[data-sk-example]').each(function () {
            if (this.dataset.skReady) return;
            this.dataset.skReady = '1';
            // …
        });
    }

    $(function () { init(document); });
})(SkinKit.$); // 이유: 전역 $는 카페24의 구버전 jQuery다. skinkit은 격리한 3.7.1만 쓴다
```

### 7-2. jQuery [결정]

- skinkit 코드는 **반드시 `SkinKit.$`**를 쓴다. 전역 `$`, `jQuery`는 카페24 것이다.
- 레퍼런스 코드를 가져올 때는 7-1의 래퍼로 감싼다. 감싸지 않으면 카페24 jQuery에서 실행된다.
- jQuery 3이 필요한 플러그인은 `noConflict` 호출 전에 불러오거나 `SkinKit.$`에 붙인다.

### 7-3. 이벤트

```js
// 기능: 탭 버튼 클릭 처리
// 이유: 이벤트 위임을 써서 나중에 생긴 탭도 동작하게 한다.
//       '.sk' 네임스페이스를 붙여 skinkit 이벤트만 골라서 해제할 수 있게 한다
$(document)
    .off('click.skTab', '[data-sk-tab] [role="tab"]')
    .on('click.skTab', '[data-sk-tab] [role="tab"]', handler);
```

- 이벤트 이름에 `.sk*` 네임스페이스를 붙인다.
- `off` 없이 같은 이벤트를 다시 등록하지 않는다(중복 실행 방지).
- 전역 `preventDefault()`를 쓰지 않는다. 카페24 기본 동작(`onclick`, 링크)이 막힌다.
- 카페24 요소의 `onclick` 속성과 기존 핸들러를 지우지 않는다.

### 7-4. 카페24 폼 요소를 대신 보여줄 때 (프록시)

```js
// 기능: 커스텀 옵션 버튼을 누르면 숨긴 원래 select의 값을 바꾼다
// 이유: 옵션 선택·가격 계산·재고 확인은 카페24가 원래 select의 change 이벤트로 처리한다.
//       원래 요소를 지우거나 새로 만들면 이 계산이 멈춘다 (novadeal product.js 방식)
$originalSelect.val(value).trigger('change');
```

- 원래 요소는 **숨기기만** 하고 지우지 않는다.
- 값을 바꾼 뒤에는 반드시 `change`를 발생시킨다.
- [확인 필요] 카페24 옵션 스크립트가 jQuery 이벤트(`trigger`)와 네이티브 이벤트(`dispatchEvent`) 중 무엇을 듣는지 옵션 유형별로 확인한다. 카페24 jQuery와 `SkinKit.$`는 서로 다른 인스턴스라서, 카페24 jQuery로 등록한 핸들러가 `SkinKit.$`의 `trigger`를 받는지도 확인해야 한다.

### 7-5. 동적 DOM 감시

레퍼런스의 MutationObserver 수는 6 → 10 → 21 → **73**개로 늘었다. 대부분 `document.body` 전체를 감시했다.

규칙:

1. 컴포넌트가 직접 `new MutationObserver(...)`로 body 전체를 감시하지 않는다.
2. **`SkinKit.observe(selector, callback)`** 하나를 쓴다. 감시자는 하나만 두고, rAF로 묶어서 한 프레임에 한 번만 콜백을 실행한다.
3. 감시 범위는 가능한 한 **해당 모듈 루트**로 좁힌다.
4. `attributes: true`는 꼭 필요할 때만, `attributeFilter`와 함께 쓴다. Swiper처럼 style을 계속 바꾸는 요소가 있으면 콜백이 매 프레임 실행된다.
5. 크기 변화는 MutationObserver가 아니라 **ResizeObserver**로 잡는다.
6. 무한 반복 타이머(`setInterval`)로 요소를 기다리지 않는다.

```js
// 기능: 새로 추가된 요소 중 selector에 맞는 것에만 callback을 실행한다
// 이유: 컴포넌트마다 body 전체 감시자를 두면 DOM이 바뀔 때마다 수십 개 콜백이 돈다.
//       감시자 하나 + rAF 묶음으로 한 프레임에 한 번만 처리한다
SkinKit.observe('.xans-product-detail', function (addedRoots) {
    addedRoots.forEach(init);
});
```

### 7-6. 스크롤·리사이즈

```js
// 기능: 스크롤 처리를 한 프레임에 한 번으로 줄인다
// 이유: scroll 이벤트는 프레임보다 자주 발생한다. passive로 스크롤 성능을 지킨다
var ticking = false;
window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { update(); ticking = false; });
}, { passive: true });
```

- 화면 너비 판단은 `$(window).width()` 대신 `SkinKit.bp.isLayoutMobile()`(matchMedia)을 쓴다. CSS와 같은 기준을 쓰기 위해서다.

### 7-7. Swiper [결정]

- skinkit 슬라이드는 **`SkinKit.Swiper`(v11)**로 만든다. 전역 `Swiper`(v4.5.1)는 카페24 기본 슬라이드 전용이다.
- 루트 클래스는 v11 기준 `.swiper`를 쓴다. 카페24 v4 슬라이드는 `.swiper-container`다.
- 옵션은 슬라이드마다 반복해서 쓰지 않고 **프리셋**으로 만든다.

```js
// 기능: data-sk-swiper 값에 맞는 프리셋으로 슬라이드를 만든다
// 이유: novadeal은 슬라이드마다 옵션 블록을 반복했다(26곳). 프리셋으로 모아 수정 지점을 줄인다.
//       v11 breakpoints는 min-width 기준이다 (v4는 max-width 기준이라 거꾸로였다)
SkinKit.swiper.define('product-row', {
    slidesPerView: 3,
    spaceBetween: 12,
    breakpoints: { [SkinKit.bp.layout + 1]: { slidesPerView: 4, spaceBetween: 16 } }
});
```

- `observer`, `observeParents`, `observeSlideChildren` 옵션은 내용이 동적으로 바뀌는 슬라이드에만 켠다.

### 7-8. 금지 사항

| 금지 | 이유 (레퍼런스 근거) |
|---|---|
| 정해진 시간만큼 로딩 화면 유지 | novadeal은 DOM 준비 후 300ms를 일부러 기다렸다. 화면 표시가 늦어진다 |
| 페이지 경로 목록을 코드에 나열해 분기 | novadeal은 경로 13개를 하드코딩했다. 페이지 파일에서 `body[data-sk-page]`를 선언한다 |
| `td.html()`을 복사해 새 마크업 만들기 | insanga 방식. 복사본에는 이벤트가 없고 id가 중복된다 |
| 한글 라벨 문자열로 카페24 행 찾기 (설정 없이) | 관리자 설정에서 라벨이 바뀌면 깨진다. 꼭 필요하면 설정값으로 뺀다 |

## 8. 접근성 최소 기준 [제안]

- 탭: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, 좌우 방향키 이동
- 아코디언: 버튼에 `aria-expanded`, `aria-controls`
- 모달: `role="dialog"`, `aria-modal="true"`, ESC 닫기, 포커스 가두기, 닫으면 열었던 버튼으로 포커스 복귀
- 숨긴 버튼에 포커스가 가지 않게 한다 (`inert` 또는 `tabindex="-1"`). novadeal 탑버튼은 `aria-hidden`만 있어 포커스가 갔다
- `prefers-reduced-motion`이면 CSS와 JS 애니메이션을 모두 끈다
