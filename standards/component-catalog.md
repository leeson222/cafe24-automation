# 자동화 대상 컴포넌트 목록

> 상태: **초안 v0.1**. 등급(A~E)과 마크업 계약은 [제안]이다. 구현은 사용자 승인 후 진행한다.
> 등급 정의는 [CLAUDE.md](../CLAUDE.md#6-자동화-분류)를 따른다.

## 1. 전체 목록

| # | 컴포넌트 | 등급 | 출처 (채택 순서 기준) | 상태 |
|---|---|---|---|---|
| 1 | core (네임스페이스, config, bp, observe) | A | 새로 설계 | 설계 |
| 2 | layout-metrics (헤더·푸터 높이 변수) | A | novadeal 리팩토링 + insanga 탑배너 대응 | 설계 |
| 3 | header-sticky | B | novadeal 리팩토링 + heodakmkt 스크롤 방향 숨김 | 설계 |
| 4 | floating-actions (탑버튼) | A | novadeal 리팩토링 | 설계 |
| 5 | tab | A | novadeal/heodakmkt 개선 | 설계 |
| 6 | accordion | A | 새로 설계 (공통 구현 없음) | 설계 |
| 7 | modal / bottom-sheet | A | novadeal 공유 팝업 + heodakmkt 바텀시트 통합 | 설계 |
| 8 | swiper 프리셋 | B | novadeal 리팩토링 | 설계 |
| 9 | ez-strip (`data-ez*` 제거, 옵트인) | B | novadeal 리팩토링 | 설계 |
| 10 | cafe24 레이어 CSS | A | novadeal `modal.css` | 설계 |
| 11 | cafe24 폼 CSS | B | novadeal `input.css` 범위 축소 | 설계 |
| 12 | 빈 상태(empty) 스타일 | A | novadeal | 설계 |
| 13 | 링크 없는 배너매니저 처리 | A | novadeal | 설계 |
| 14 | 상품 옵션 표 CSS 블록화 | B | novadeal `products.css` | 설계 |
| 15 | 상품 옵션 프록시 UI | C | novadeal `product.js` | 검토 필요 |
| 16 | custom-select (일반 select → ul/li) | A (필수, 공통) | novadeal `dropdown.js` + `basket.js` 통합 | 구현 (`components/custom-select`) |
| 17 | 상품 기본정보 표 재배치 | D | heodakmkt 방식 개선 | 검토 필요 |
| 18 | 상품 상세정보 더보기 | B | novadeal `prod_detail.js` | 설계 |
| 19 | FAQ 아코디언 | D | novadeal `faq.js` | 검토 필요 |
| 20 | 공유하기 | C | novadeal `common.js` | 검토 필요 |
| 21 | 장바구니 수량 배지 | A | novadeal `layout.js` (두 블록 통합) | 설계 |
| 22 | 게시판 관리자 도구 (분류 이동, 게시글 이동·복사) | B | novadeal `board.css` 개선 (마크업 변경 없이 CSS만) | 구현 (`pages/board.css`) |

### 제외 (E)

| 항목 | 이유 | 관리 위치 |
|---|---|---|
| SEO·운영 설정 (인증 메타, ld+json, og, robots, GTM, 네이버 로그, Kakao 키, 도메인 리다이렉트) | 환경마다 다르다 | `skinkit/partials/env/` |
| SSO, 임직원 모드, 폐쇄몰, 포인트, 기획전 API | 쇼핑몰 전용 | `{mall}/` |
| 외부 앱 DOM 수정 (스마트팝업, 리뷰 앱, AI 큐레이션 위젯) | 앱 업데이트로 깨진다 | 앱 설정 또는 `{mall}/` |
| 주문서 결제 로직, PG 위젯 | 수정 범위 제한 | 대상 아님 |

---

## 2. 컴포넌트 상세

각 항목: **목적 / 마크업 계약 / 설정 / 카페24 의존성 / 레퍼런스 대비 개선점 / 검증**

### 1) core

- **목적**: 모든 skinkit 코드가 쓰는 공용 기반
- **제공**
  - `SkinKit.$`: 격리한 jQuery 3.7.1
  - `SkinKit.Swiper`: 격리한 Swiper 11
  - `SkinKit.config`: 쇼핑몰별 설정
  - `SkinKit.bp`: 브레이크포인트 판단 (`isLayoutMobile()`, `isSmall()`, `onChange(fn)`)
  - `SkinKit.observe(selector, fn)`: 감시자 하나로 동적 DOM 대응
- **카페24 의존성**: 카페24 jQuery·Swiper 뒤에서 불러와야 한다 ([folder-structure.md 4장](folder-structure.md#4-layouthtml-호출-순서))
- **검증**: 전역 `jQuery.fn.jquery`가 카페24 버전 그대로인지, 전역 `Swiper`가 4.5.1인지

### 2) layout-metrics

- **목적**: 헤더, 서브헤더, 푸터, 하단 고정 영역의 높이를 CSS 변수로 제공
- **마크업 계약**
  ```html
  <!-- 기능: 높이를 잴 대상을 표시한다
       이유: 선택자를 코드에 박지 않고 마크업에서 선언해, 헤더 타입이 바뀌어도 JS를 고치지 않게 한다 -->
  <header data-sk-metric="header">…</header>
  <div class="sub-header" data-sk-metric="sub-header">…</div>
  <footer data-sk-metric="footer">…</footer>
  <nav class="mobile-nav" data-sk-metric="bottom-fixed">…</nav>
  ```
- **출력**: `--sk-header-h`, `--sk-sub-header-h`, `--sk-footer-h`, `--sk-bottom-fixed-h`
- **레퍼런스 대비 개선점**
  - novadeal은 헤더 높이를 `--header-height`, `--custom-header-height` 두 이름으로 따로 계산했다 → 하나로 통합
  - `--sub-header-height`를 두 블록에서 계산했다 → 하나로 통합
  - resize만 감지해 탑배너 닫기 같은 높이 변화를 놓쳤다 → ResizeObserver 사용
  - 푸터 여백을 JS가 4단계 조건으로 인라인 지정했다 → CSS `padding-bottom: var(--sk-bottom-fixed-h)`
  - insanga는 헤더 높이를 `--banner-h`라는 이름으로 넣었다 → 이름을 내용에 맞춤
- **검증**: 탑배너 닫기, 모바일 하단바 표시/숨김, 상품상세 하단 구매바에서 변수 값이 바뀌는지

### 3) header-sticky

- **목적**: 스크롤하면 헤더를 고정한다. 옵션으로 아래로 스크롤할 때 숨긴다.
- **마크업 계약**: `<header data-sk-sticky-header data-sk-hide-on-scroll-down>`
- **설정**: 기준 높이(기본값은 헤더 높이), 숨김 옵션 사용 여부
- **카페24 의존성**
  - `layout/basic/js/layout.js`의 `fixedHeader()`가 `#header`를 찾는다. 없으면 오류로 load 핸들러 전체가 멈춘다 (novadeal은 원본 파일을 패치했다)
  - 검색 레이어(`body.searchExpand`)가 열려 있는 동안은 헤더 상태를 바꾸지 않는다 (novadeal 방식 유지)
- **레퍼런스 대비 개선점**
  - 상태가 바뀔 때만 적용하는 novadeal 방식 유지
  - 기준값 `95px`/`60px` 하드코딩 → `var(--sk-header-h)` 사용
  - 스크롤 처리에 rAF와 passive 적용
  - heodakmkt의 스크롤 방향 숨김을 옵션으로 추가
- **B 조건**: 헤더가 `#header`인지 `#custom-header`인지 확인하고, 카페24 `fixedHeader()`와의 관계를 정한다
- **검증**: 상단 복귀 시 깜빡임 없음, 검색창 열고 닫기, 앵커 이동 시 헤더에 가려지지 않음

### 4) floating-actions (탑버튼)

- **목적**: 일정 스크롤 이후 탑버튼(과 선택적으로 공유 버튼)을 보여준다
- **마크업 계약**
  ```html
  <!-- 기능: 플로팅 버튼 묶음
       이유: 페이지 유형마다 노출 버튼이 다르므로 body의 data 속성으로 고른다 (novadeal 방식) -->
  <div class="sk-floating" data-sk-floating inert>
      <button type="button" class="sk-floating__btn" data-sk-scroll-top>TOP</button>
  </div>
  ```
- **설정**: 노출 기준 스크롤 값(기본 300)
- **카페24 의존성**: 카페24 기본 `bottomNav()`(`.bottom-nav__top`)와 겹친다. 둘 중 하나만 쓴다
- **레퍼런스 대비 개선점**
  - 숨김 상태에서 `aria-hidden`만 있어 포커스가 갔다 → `inert` 사용
  - `base/common.css`에 같은 규칙이 두 번 있었다 → 정리
  - jQuery `animate` → `window.scrollTo({ behavior })`, 모션 줄이기 설정이면 바로 이동
  - 마크업이 `layout.html`에 직접 있었다 → partial 분리
  - 하단바·구매바 회피를 MutationObserver 대신 `--sk-bottom-fixed-h`로 처리
- **검증**: 모바일 하단바 위로 올라가는지, 키보드로 숨김 상태 버튼에 포커스가 가지 않는지

### 5) tab

- **마크업 계약**
  ```html
  <!-- 기능: 탭
       이유: 순서(index)가 아니라 aria-controls로 패널을 연결해, 마크업 순서가 달라도 동작하게 한다 -->
  <div class="sk-tab" data-sk-tab>
      <div role="tablist">
          <button role="tab" aria-selected="true" aria-controls="tab-a">A</button>
          <button role="tab" aria-selected="false" aria-controls="tab-b">B</button>
      </div>
      <div role="tabpanel" id="tab-a">…</div>
      <div role="tabpanel" id="tab-b" hidden>…</div>
  </div>
  ```
- **레퍼런스 대비 개선점**: `index()` 연결 → `aria-controls` 연결, 키보드 이동 추가, 상태 클래스 통일(`.on`/`.active` → `aria-selected`), novadeal의 CSS(`.tab-contents`)와 JS(`.tab-contents-area` 자식) 불일치 해소

### 6) accordion

- **마크업 계약**: `[data-sk-accordion]` 안의 `button[aria-expanded][aria-controls]`
- **옵션**: 하나만 열기(`data-sk-accordion="single"`)
- **레퍼런스 대비 개선점**: 공통 구현 없이 `slideToggle`이 52곳에 흩어져 있었다 → 하나의 컴포넌트로 통합. 열고 닫는 효과는 CSS로 처리
- **사용처**: FAQ(19번), 푸터 사업자정보 토글(novadeal `.f-about-area`)

### 7) modal / bottom-sheet

- **목적**: 모달과 바텀시트를 같은 코어로 연다
- **마크업 계약**: `[data-sk-modal-open="id"]` 버튼, `<div class="sk-modal" id="id" role="dialog" aria-modal="true" hidden>`
- **변형**: `.sk-modal--sheet` (heodakmkt 바텀시트 모양)
- **레퍼런스 대비 개선점**
  - novadeal은 `modal.js`(ESC·포커스 없음)와 공유 팝업(ESC·aria 있음)이 따로 있었다 → 통합
  - 여러 모달이 겹칠 때 스크롤 잠금이 풀리는 문제 → 열린 개수를 세어 마지막에만 해제
  - 포커스 가두기와 닫은 뒤 포커스 복귀 추가
- **카페24 의존성**: 카페24 기본 레이어(`ec-base-layer`)는 이 코어로 열지 않는다. 모양만 10번 CSS로 바꾼다

### 8) swiper 프리셋

- **목적**: `data-sk-swiper="프리셋이름"`으로 슬라이드를 선언한다
- **카페24 의존성**: 카페24 `detail.js`(관련상품 `.relation_slide`)와 `main.js`(`.special_slide`)는 전역 Swiper 4.5.1을 쓴다. 이 둘은 건드리지 않는다
- **레퍼런스 대비 개선점**
  - heodakmkt는 Swiper 11을 전역으로 불러와 v4를 덮어썼다 → 격리
  - novadeal은 v4 breakpoints(max-width 기준)를 주석으로 설명하며 썼다 → v11(min-width 기준)으로 정리
  - 슬라이드마다 반복한 옵션 블록 → 프리셋
  - novadeal의 `isPageOwnedSwiper`(API로 목록을 바꾸는 영역은 페이지 스크립트가 맡는다) 개념은 유지 → `data-sk-swiper-owner="page"`
- **B 조건**: 고정할 11.x 버전 확인, 두 버전 CSS가 함께 있을 때 카페24 기본 슬라이드 모양 확인

### 9) ez-strip (옵트인)

- **목적**: `data-ez*` 속성을 제거한다
- **켜는 방법**: `<html data-sk-strip-ez>`. 속성이 없으면 아무것도 하지 않는다
- **레퍼런스 대비 개선점**
  - novadeal은 문서 전체의 모든 속성 변화를 감시했다(`attributes: true`). Swiper가 style을 바꿀 때마다 콜백이 돈다 → 처음 한 번 제거하고, 이후에는 새로 추가된 요소만 `SkinKit.observe`로 처리
- **B 조건 / [확인 필요]**: 카페24 디자인 편집기 미리보기에서 이 코드가 실행되면 편집 기능에 영향이 있는지. 영향이 있으면 미리보기에서는 실행하지 않는다

### 10) cafe24 레이어 CSS

- **대상**: `#ec-basketOptionModifyLayer`, `#detail_info_layer`, `.couponDownResult`, `#capp-shop-new-product-optionselect-layer` 등
- **방식**: CSS 덮어쓰기만. 카페24 기본 파일 수정 금지
- **[확인 필요]**: 쇼핑몰마다 쓰는 레이어 목록

### 11) cafe24 폼 CSS

- **대상**: checkbox, radio, select, input, textarea
- **레퍼런스 대비 개선점**: novadeal은 `#contents` 전체에 적용되어 주문서까지 바뀐다 → 주문서·PG 영역 제외
- **B 조건**: 주문서 루트 선택자 확인

### 14) 상품 옵션 표 CSS 블록화

- **방식**: `table[module="product_option"]`, `#totalProducts`의 `table/tbody/tr/th/td`를 CSS로 `display:block` 처리 (novadeal `products.css:1276-1336`)
- **원칙**: 표 마크업과 `module` 속성은 그대로 둔다
- **B 조건**: 옵션 유형(조합형/독립형/추가구성상품)별 화면 확인

### 15) 상품 옵션 프록시 UI (C)

- **방식**: 원래 `select`는 숨기고, 버튼 목록을 대신 보여준다. 버튼을 누르면 원래 select 값을 바꾸고 `change`를 발생시킨다
- **[확인 필요]**
  - 옵션 유형별 동작 (조합형 분리 선택, 품절 옵션, 추가 옵션 입력)
  - 카페24 jQuery와 `SkinKit.$`가 다른 인스턴스일 때 카페24 핸들러가 이벤트를 받는지
- **C인 이유**: 쇼핑몰마다 옵션 구성과 디자인이 크게 다르다

### 17) 상품 기본정보 표 재배치 (D)

- **레퍼런스 비교**
  - isumembers: `nth-child` 숨김 → 항목 순서가 바뀌면 깨진다
  - insanga: `td.html()` 복사로 새 목록 생성 → 이벤트 유실, id 중복
  - heodakmkt: 행을 새 표로 **옮김** → 이벤트는 유지되지만 카페24 스크립트가 원래 위치를 찾는지 [확인 필요]
- **권장**: CSS로 행을 블록·그리드로 바꾸는 것을 먼저 검토한다. 그룹 재배치가 꼭 필요하면 heodakmkt 방식(옮기기)에 **라벨 → 그룹 매핑을 설정값으로** 받는다
- **D인 이유**: 표시 항목과 라벨은 관리자의 "상품 상세 정보 표시 설정"에 따라 달라진다

### 19) FAQ 아코디언 (D)

- **레퍼런스**: novadeal `faq.js`는 FAQ 게시판 번호를 `'3'`으로 하드코딩했다
- **권장**: 게시판 번호를 `SkinKit.config.board.faq`로 받고, 아코디언은 6번 컴포넌트를 쓴다

### 20) 공유하기 (C)

- **C인 이유**: Kakao SDK 키, 공유 문구, 사용할 채널이 쇼핑몰마다 다르다. 키는 `env` 설정에서 받는다
- **개선점**: 팝업은 7번 모달 코어로 연다

### 21) 장바구니 수량 배지

- **목적**: 0이면 숨기고, 100 이상이면 `99+`로 표시한다
- **레퍼런스 대비 개선점**: novadeal은 같은 요소를 두 블록이 각각 감시했고, 그중 하나는 문서 전체의 텍스트 변화를 감시했다 → 하나로 합치고 `.EC-Layout-Basket-count` 요소만 감시
- **카페24 의존성**: `Layout_orderBasketcount` 모듈과 `.EC-Layout-Basket-count` 클래스

### 22) 게시판 관리자 도구 (B)

- **목적**: 운영자에게만 나오는 분류 이동(`board_catemove_*`), 게시글 이동·복사(`board_function_*`)를 작은 한 줄 도구로 정리한다
- **대상**: `board/*/list.html`(두 모듈), `board/*/read.html`(`board_function_*`). skin4 기준 7개 파일
- **출력 조건**: 운영자 로그인 때만 출력된다. 카페24 기본 스킨이 `<!-- Admin only -->`로 감쌌다. 부운영자 권한 등 정확한 조건은 [확인 필요]
- **마크업 계약**: **바꾸지 않는다.** 아래 요소만 있으면 래퍼 class(`gColumn`, `admin-only-*` 등)는 무엇이든 된다
  ```html
  <!-- 기능: 카페24 기본 마크업 그대로
       이유: CSS는 카페24 서버가 붙이는 .xans-board-catemove / .xans-board-function과 직계 span만 고른다 -->
  <div class="section" module="board_function_1002">
      <span class="gColumn">{$board_function_selectbox}</span>          <!-- select (카페24 출력) -->
      <span class="gColumn">
          <a href="#none" class="btnNormal sizeS" onclick="{$action_article_move}">{$article_move}</a>
          <a href="#none" class="btnNormal sizeS" onclick="{$action_article_copy}">{$article_copy}</a>
      </span>
      <span class="ec-base-help">{$board_function_help|replace:*,}</span>
  </div>
  ```
- **지키는 것**: `module` 속성, 변수 위치(모듈 안), `<a onclick="{$action_*}">`, select(`#board_category_move`, `#boardGroup`)
- **CSS** (`skinkit/pages/board.css`): flex 한 줄 + gap, select 높이 32px, 버튼은 글 보기 작은 버튼 크기, 도움말은 다음 줄, 분류 이동 바로 뒤의 게시글 이동·복사는 위 선을 없애 하나로 묶는다. 좌우 여백·폭은 쇼핑몰 레이아웃에 맡긴다
- **토큰**: `--sk-board-admin-{py, gap, border, fs, select-height, select-width, select-px, btn-p, btn-fs, help-color}`
- **레퍼런스 비교**
  - skin4: 카페24 기본 마크업·CSS 그대로 (`.gColumn { margin:10px }`, select 138px, 도움말 `top:4px`)
  - novadeal: class를 `admin-only-control/field/actions`로 바꾸고 `div.admin-only-wrap`을 더했다. 이름이 명확하고 폭을 래퍼가 맡는 점은 좋다
- **레퍼런스 대비 개선점**
  - novadeal은 마크업을 4개 파일에서 손으로 바꿨다 → 마크업은 그대로 두고 CSS만 쓴다. 기본 마크업과 novadeal 마크업 모두에서 동작한다
  - novadeal `function.css`에 더는 맞는 요소가 없는 `.gColumn` 규칙이 남았다, `catemove.css`는 비운 채 `@css` 호출은 남았다 → 해당 없음 (기본 CSS를 덮어쓴다)
  - novadeal 버튼은 `!important` 5개로 덮었다 → 우선순위 (1,3,0)으로 처리, `!important` 없음
- **B 조건**
  - [ ] 쇼핑몰 CSS가 이 영역을 `!important`로 꾸미는지 확인한다 (skin4 `onjangteo_custom/css/board.css`: `.xans-board-function .btnNormal { height: 4rem !important }` → 버튼 40px, select 32px로 높이가 어긋난다. 테마에서 `--sk-board-admin-select-height: 40px`로 맞추거나 쇼핑몰 규칙을 정리한다)
  - [ ] 래퍼 class `section`이 레이아웃을 잡는지 확인한다 (skin4는 `.sub-wrap #container .section`이 폭·가운데 정렬). 마크업을 바꾸지 않으므로 보통 영향 없음
  - [ ] custom-select(공통)로 이 select도 ul/li로 바뀐다. 이동·복사가 그대로 되는지 확인한다 (`pages/board.css`가 커스텀 select도 작은 크기로 맞춘다)
- **검증**: 운영자 계정으로 분류 이동, 게시글 이동, 게시글 복사를 한 번씩 실행한다. 비로그인·일반 회원 화면에 이 영역이 나오지 않는다. 로컬 프리뷰에서는 "관리자 전용 영역 보기" 토글로 모양을 확인한다 (2026-11-19 skin4 복사본에 설치해 PC 1440px·모바일 390px 확인)

---

## 3. 공통 검증 체크리스트

신규 스킨에 적용한 뒤 아래를 확인한다.

- [ ] 상품 옵션 선택, 수량 변경, 총 금액 계산이 적용 전과 같다
- [ ] 장바구니 담기, 바로구매, 관심상품이 동작한다
- [ ] 상품상세 관련상품 슬라이드(카페24 Swiper 4)가 동작한다
- [ ] 메인 기본 슬라이드(`.special_slide`)가 동작한다
- [ ] 콘솔 오류가 없다 (특히 `layout.js` load 핸들러)
- [ ] 콘솔에서 `jQuery.fn.jquery`, `Swiper` 버전이 카페24 것 그대로다
- [ ] 주문서 화면이 적용 전과 같다
- [ ] 카페24 디자인 편집기(EZ)에서 편집이 된다
- [ ] 1024px(또는 설정값) 경계에서 레이아웃이 한쪽으로만 바뀐다
- [ ] 개발 스킨에 운영 인증 메타·추적 코드가 들어가지 않았다
