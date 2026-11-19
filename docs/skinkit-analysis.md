# SkinKit 1차 분석 보고서

> 작성일 2026-11-19 · 분석 기준 `references/novadeal/skin15` (aisoul) · **코드 수정 없음**
> 표기: `[확인 필요]` = 실제 쇼핑몰에서 검증해야 하는 항목

---

## 0. 요약

| 항목 | 결과 |
|---|---|
| 분석한 CSS | aisoul 43개 파일, 11,083줄 |
| 공통화 가능 | base 4개 + button, input, select, qty, pagination, layer, board 목록, 빈 상태 (나머지 큰 파일은 블록 단위로 일부만) |
| 제외 | `front/common.css`(2,307줄, API·CMS 화면), `products.css` 대부분, promo/project/visual/header/footer/pages |
| 사용하지 않는 사본 | `aisoul/assets/css/cafe24/ec-base/` 13개 중 12개가 카페24 원본과 같고, **어디서도 불러오지 않는다** |
| 쇼핑몰 종속 이미지 | `etlandmall` 경로: CSS 32곳, JS 31곳. 그중 공통 컴포넌트에 쓰인 아이콘 10종 |
| Style Adapter 후보 | 14개 → **기본 포함 2 / 선택형 5 / 제외 7** |
| 중대한 위험 | ① 표→DL 교체 ② 커스텀 select가 주문서 select까지 바꿀 수 있음 ③ `MutationObserver` 71개(그중 `body` 감시 42개) |
| 민감정보 | 고객사 `CLIENT_ID` 4건, `MALL_ID`, GTM, 구글 인증, 카카오 앱키가 **이미 커밋됨** (저장소는 비공개) |

---

## A. 공통 CSS 추출 목록

분류: **A** 기본 포함 · **B** 조건부 · **C** 선택형 · **E** 제외

### A-1. base

| 원본 파일 | 선택자 | 분류 | 추출 | 처리 방법 |
|---|---|---|---|---|
| base/reset.css | meyer reset 전체 | A | O | 그대로 가져온다. `a { color:#000; font-size:16px }`는 토큰 참조로 바꾼다 |
| base/reset.css | `* { word-break: keep-all }` | A | O | 유지 |
| base/variables.css | `:root` 전체 | A | O | 3단 토큰으로 재구성하고, 기존 이름은 alias로 남긴다 (B-0) |
| base/utility.css | `.block .flex .flex-space-between .align-center .text-center` | A | O | 고정 utility. 선택자와 값 모두 유지 |
| base/utility.css | `.mt-30` | A | O | 고정 utility. mt/mb/pt/pb 숫자 세트로 확장 (F-3) |
| base/utility.css | `.inner` | A | O | `max-width: var(--sk-max-container)` |
| base/utility.css | `.title-m-b … .script-m-sb` (8종) | A | O | semantic utility. 크기·굵기를 토큰으로 바꾸고, 53번 반복된 `font-family … !important`를 없앤다 |
| base/utility.css | `.black .white .main-color .gray1~9` | A | O | semantic utility. 색 토큰 참조 |
| base/utility.css | `.cst-grid2`, `.sub-page-area`, `#container #contents{padding-bottom}`, `.normalpackage_box` | E | X | novadeal 레이아웃 값 |
| base/common.css | `.ec-base-prdEmpty`, `td.message` (빈 상태) | A | O | 카페24 공통 빈 상태. 토큰 참조 |
| base/common.css | `.br-mo` | A | O | utility로 옮긴다 (`.br-pc`도 함께 만든다) |
| base/common.css | `#capp-shop-new-product-optionselect-layer{z-index}` | B | O | `--sk-z-modal` 사용. `[확인 필요]` 카페24 레이어 z-index |
| base/common.css | `.section.path` (경로) | C | △ | 화살표 이미지가 etlandmall 경로. CSS 아이콘으로 바꾼 뒤 선택형 |
| base/common.css | `.floating-actions*` | — | — | component-catalog의 floating-actions(JS 포함)로 따로 다룬다 |
| base/common.css | `.horizontal-scroll-arrow*` | — | — | catalog 후보. 이번 범위 밖 |
| base/common.css | `#container.header-active`, `.titleArea`, `.custom-path`, `#wrap #contents > .section`, 1080 구간 normalmenu | E | X | 헤더 높이 95px 등 novadeal 레이아웃 |

### A-2. components

| 원본 파일 | 선택자 | 분류 | 추출 | 처리 방법 |
|---|---|---|---|---|
| button.css | `.btnNormal/.btnSubmit/(Fix)` × `.sizeS/M/L` | A | O | 유형·크기·상태 토큰으로 분리 (B-1) |
| button.css | `:disabled` 상태 | A | O | 카페24는 `.disabled` 클래스를 쓴다. **`.disabled`도 함께 적용** (E-2) |
| button.css | `.btnClose`, `.ec-base-prdInfo .btnDelete` | A | O | 이미지 대신 CSS로 X 아이콘을 그린다 |
| button.css | `.ec-base-fold.theme1 > .title:after` | A | O | CSS chevron |
| button.css | `.btn-col-wrap` | B | O | 버튼 그룹 정렬 (gap 토큰) |
| button.css | `.btn-small` | C | △ | 새 클래스. 카페24 클래스가 아니다. 선택형 |
| input.css | text/password/email/tel/number/search/url, textarea, select | A | O | 범위를 다시 잡는다 (E-5). 주문서는 제외 |
| input.css | checkbox / radio | A | O | 체크 이미지를 CSS로 바꾼다. 주문서는 제외 |
| input.css | `:has(~.error)`, `:has(~.txtComplete)` | A | O | 상태 토큰 (danger/success) |
| input.css | `.custom-select*` | B | O | `components/select.css`로 분리 (adapter와 짝을 이룬다) |
| input.css | `.password-input-*` | C | △ | password_toggle.js와 함께 선택형 |
| input.css | `.xans-product-normalmenu .function{overflow}` | E | X | novadeal 정렬 UI 전용 |
| modal.css | `.ec-base-layer > .header > h1/h3/h5` | A | O | 레이어 제목 토큰 |
| modal.css | `.ec-base-layer.gAlert`, `#detail_info_layer` | A | O | layer 유형별 토큰 (B-6) |
| modal.css | `.xans-product-basketadd .ec-base-layer.gAlert` | A | O | 장바구니 담기 알림 유형 |
| modal.css | `#ec-basketOptionModifyLayer …` | B | O | 장바구니 옵션 변경 유형. custom-select adapter 사용 시에만 |
| modal.css | `.couponDownResult` | B | O | 너비 토큰 |
| modal.css | `.modal`, `.modal-dim` (커스텀 모달) | C | △ | catalog의 modal 컴포넌트로 다룬다. z-index 9999999 → `--sk-z-modal` |
| modal.css | `.term-wrap.modal`, `.card-installment__item`, `.MsoNoSpacing` | E | X | novadeal 약관 모달, 할부 안내 |
| quantity.css | `.ec-base-qty` | A | O | up/down png → CSS +/− 아이콘. `!important` 8개 재검토 |
| tab.css | `.tab-menu`, `.tab-contents` | C | △ | 카페24 클래스가 아니다. `.active`를 쓰므로 표준(`is-*`)과 다르다. catalog tab으로 대체 |
| pagenation.css | `.ec-base-paginate.typeList` 전체 | A | O | 화살표 svg 4종을 SkinKit 에셋으로 옮긴다. 중복 규칙 정리 |
| board.css | 목록 `.ec-base-table.typeList th/td`, writer/date 색 | A | O | 토큰 참조 |
| board.css | `.boardSearch`, `.xans-board-search` | B | O | |
| board.css | 댓글, 이전/다음, 수정·삭제 버튼, 빈 상태 | B | O | 블록 단위로 검토해서 옮긴다 |
| board.css | `.xans-board-replysort:after:has(select)` | — | X | **잘못된 선택자**라 원래도 동작하지 않는다 (E-9) |
| board.css | 1080 이하 `td.thumb{display:none}` 등 | C | △ | 쇼핑몰 정책 |
| member.css | 로그인/가입/약관/아이디 찾기 | B | △ | 공통 폼 간격만 옮기고 나머지는 쇼핑몰 레이아웃 |
| myshop.css | 공통 탭, 주소록, 쿠폰 목록, 탈퇴 | B/C | △ | 843줄 중 ID 선택자 220개. 카페24 기본 구조 보정만 블록별로 옮긴다 |
| basket.css | 전체선택, 수량 변경, 빈 장바구니 | B | △ | sticky, 혜택 박스, 다품목은 제외 |
| products.css | 옵션 표 블록화(1275~1378), 툴팁 | B | △ | catalog 14번(옵션 표 CSS 블록화)과 연결 |
| products.css | 나머지 (타임딜, 프로모션, LNB, 필터, 공유, 가격 UI) | E | X | novadeal 디자인·데이터 |
| option.css | 옵션 칩 | C | △ | |
| order.css | 전체 | E | X | 주문서 영역 (절대 규칙 7) |
| cafe24/ec-base/*.css | 13개 | E | X | 12개는 원본과 같고 불러오는 곳이 없다. fold만 8줄 다르다 → 다른 줄만 cafe24/로 옮긴다 |

---

## B. 변수화 대상 목록

### B-0. 토큰 3단 구조와 기존 변수 매핑

```
primitives  (원색·숫자)          --sk-gray-3: #CCCCCC
   ↓ 참조
semantic    (역할)               --sk-color-border: var(--sk-gray-3)
   ↓ 참조
component   (컴포넌트·유형·크기)  --sk-btn-normal-border: var(--sk-color-border)
```

| 기존 변수 | 새 토큰 | 단계 | 기존 이름 유지 (alias) |
|---|---|---|---|
| `--main-color` #FB5800 | `--sk-color-primary` | semantic | `--main-color: var(--sk-color-primary)` |
| `--sub-color` #E04300 | `--sk-color-primary-hover` | semantic | O |
| `--black` #212121 | `--sk-color-text` | semantic | O |
| `--red` #FD3153 | `--sk-color-danger` | semantic | O |
| `--blue` #0083FF | `--sk-color-success` | semantic | O (txtComplete에 쓰임) |
| `--gray-1~9` | `--sk-gray-1~9` | primitive | O |
| `--max-container` 1200px | `--sk-max-container` | semantic | O |
| `--ai-bg` | — | 제외 | novadeal 전용 |
| `--sub-header-height`, `--custom-header-height` | `--sk-sub-header-h` 등 | semantic | layout-metrics JS가 덮어쓴다 |

> alias는 `tokens/legacy-alias.css` 한 파일로 따로 두어, 새 쇼핑몰에서는 빼도 되게 한다.

### B-1. 버튼

실제 사용 현황(novadeal HTML 전체):

| 유형 | 사용 수 | 크기 조합 | novadeal 스타일 |
|---|---|---|---|
| btnNormal | 364 | S 220 · M 40 · L 14 · **없음 66** · sizeQty 24 | O (크기 클래스가 있을 때만) |
| btnNormalFix | 157 | M 102 · S 38 · 없음 14 · L 3 | O |
| btnSubmit | 127 | M 55 · S 37 · L 20 · 없음 15 | O |
| btnSubmitFix | 123 | M 93 · S 13 · 없음 12 · L 5 | O |
| btnText | 62 | — | X (카페24 기본: 밑줄 텍스트) |
| btnEm | 6 | S 4 · 없음 2 | X |
| btnInfo | 4 | — | X |
| btnBasic | 3 | 없음 | X |
| btnStrong | 2 | 없음 | X (카페24 기본 정의도 tooltip 안에만 있다) |
| **btnMini** | **0** | — | **존재하지 않는다**. 만들지 않는다 |

- `Fix`는 유형이 아니라 **최소 너비 고정 수식어**다(카페24: S 96 / M 135 / L 160px). 그래서 색 토큰은 Normal/Submit과 같이 쓰고, `--sk-btn-fix-min-width-*`만 따로 둔다.
- `sizeQty`는 크기 수식어다(수량 변경 버튼).

| 선택자 | 기존 속성 | 기존 값 | 제안 변수명 |
|---|---|---|---|
| 버튼 공통 | border-radius | 8px | `--sk-btn-radius` |
| 버튼 공통 | min-width | 105px (실제로 적용되는 값) | `--sk-btn-min-width` |
| 버튼 공통 | transition | all .3s | `--sk-btn-transition` |
| .btnNormal | background / color / border-color | #fff / --black / --gray-3 | `--sk-btn-normal-bg` / `-color` / `-border` |
| .btnNormal:hover | background | --gray-1 | `--sk-btn-normal-hover-bg` |
| .btnSubmit | background / color / border-color | --main-color / #fff / --main-color | `--sk-btn-submit-bg` / `-color` / `-border` |
| .btnSubmit:hover | background | --sub-color | `--sk-btn-submit-hover-bg` |
| .btnEm | background / color | #737373 / #fff (카페24 기본) | `--sk-btn-em-bg` / `-color` / `-hover-bg` |
| .btnBasic | background / color / border | #f0f0f0 / #222 / #d1d1d1 (카페24 기본) | `--sk-btn-basic-bg` / `-color` / `-border` / `-hover-bg` |
| 비활성 (공통) | background / color | --gray-1 / --gray-4 | `--sk-btn-disabled-bg` / `-color` / `-border` |
| .sizeS | padding / font-size / font-weight / min-width | 9px 10px / 14px / 600 / 40px | `--sk-btn-s-py` `-px` `-fs` `-fw` `-min-w` |
| .sizeM | 〃 | 11px 12px / 16px / 700 / 70px | `--sk-btn-m-*` |
| .sizeL | 〃 | 13px 20px / 18px / 600 / 100px | `--sk-btn-l-*` |
| .sizeQty | padding / height / font-size | 9px 20px / 30px / 12px (카페24) | `--sk-btn-qty-*` |
| [class*=Fix].sizeS/M/L | min-width | 96 / 135 / 160px (카페24) | `--sk-btn-fix-min-w-s/m/l` |
| 공통 | line-height | 150% | `--sk-btn-lh` |

- 상태 토큰은 **실제로 쓰인 것만** 만든다: hover(Normal/Submit/Em/Basic), disabled(공통). focus-visible은 접근성 기본값 하나(`--sk-focus-ring`)만 둔다.
- 사용 위치별 예외(예: 게시판 목록의 `btnSubmitFix.sizeM` 65px)는 토큰을 바꾸지 않고 `cafe24/board.css`에 예외 규칙으로 둔다.

### B-2. 입력창

| 선택자 | 기존 속성 | 기존 값 | 제안 변수명 |
|---|---|---|---|
| text류, select | height | 54px (모바일 47px) | `--sk-input-h` (반응형 토큰) |
| 〃 | padding | 14px 16px 16px (모바일 12px 14px) | `--sk-input-py-top` `-py-bottom` `-px` |
| 〃 | font-size | 16px (모바일 14px) | `--sk-input-fs` |
| 〃 | border-color / radius | --gray-3 / 8px | `--sk-input-border` / `--sk-input-radius` |
| 〃 | color / background | --black / #fff | `--sk-input-color` / `--sk-input-bg` |
| ::placeholder | color | --gray-3 | `--sk-input-placeholder` |
| :hover | border-color | --gray-5 | `--sk-input-hover-border` |
| :focus | border-color | --black | `--sk-input-focus-border` |
| :disabled | color / background | --gray-3 / --gray-1 | `--sk-input-disabled-color` / `-bg` |
| 오류 (`:has(~.error)`) | border-color | --red | `--sk-input-error-border` → `--sk-color-danger` |
| 완료 (`:has(~.txtComplete)`) | border-color | --blue | `--sk-input-success-border` → `--sk-color-success` |
| textarea | min-height / padding | 120px / 14px | `--sk-textarea-min-h` / `--sk-textarea-p` |

### B-3. 체크박스·라디오

| 선택자 | 기존 속성 | 기존 값 | 제안 변수명 |
|---|---|---|---|
| checkbox, radio | width/height | 24px | `--sk-check-size` |
| 〃 | border / hover border | --gray-3 / --gray-5 | `--sk-check-border` / `-hover-border` |
| :checked | background, border | --main-color | `--sk-check-checked-bg` |
| checkbox | radius | 4px | `--sk-check-radius` |
| checkbox ::after | 체크 표시 | etlandmall `input-check.png` | `--sk-check-mark-color` (CSS로 그린다) |
| radio ::after | 점 크기 / 색 | 12px / #fff | `--sk-radio-dot-size` / `-color` |
| :checked:disabled | background | --gray-3 | `--sk-check-disabled-bg` |

### B-4. 커스텀 select

| 선택자 | 기존 속성 | 기존 값 | 제안 변수명 |
|---|---|---|---|
| .custom-select-default | padding | 10px 16px | `--sk-select-py` / `-px` |
| .custom-select-options | radius / border / max-height | 8px / --gray-3 / 300px | `--sk-select-list-radius` / `-border` / `-max-h` |
| .custom-select-options li | color | #999 (하드코딩) | `--sk-select-option-color` |
| li:hover, .selected | background | #f9f9f9 | `--sk-select-option-hover-bg` |
| .selected | color / weight | #212121 / 500 | `--sk-select-option-selected-color` |
| 아이콘 | 이미지 | etlandmall `select-ico.svg` | `--sk-select-icon` (CSS chevron, 색은 currentColor) |

### B-5. 수량·페이지네이션

| 선택자 | 기존 속성 | 기존 값 | 제안 변수명 |
|---|---|---|---|
| .ec-base-qty | border / radius / padding | --gray-2 / 4px / 8px 10px | `--sk-qty-border` / `-radius` / `-p` |
| .ec-base-qty a | 크기 / 아이콘 | 24px / etlandmall png | `--sk-qty-btn-size` / `--sk-qty-icon-color` |
| .ec-base-paginate li a | 크기 / radius | 32px / 4px | `--sk-page-size` / `-radius` |
| 〃 | font-size / weight / color | 14px / 600 / --black | `--sk-page-fs` / `-fw` / `-color` |
| a.this | background / color | --black / #fff | `--sk-page-active-bg` / `-active-color` |
| ol | gap | 8px | `--sk-page-gap` |
| 화살표 a | 이미지 4종 | etlandmall svg | SkinKit 에셋 + `--sk-page-arrow-color` |
| a.is-disabled | opacity | .25 | `--sk-page-disabled-opacity` |

### B-6. 레이어(팝업) — 유형별

| 유형 | 선택자 | 기존 값 | 제안 변수명 |
|---|---|---|---|
| 공통 | `.ec-base-layer` | radius 10 · border --gray-2 · shadow 0 0 4px rgba(0,0,0,.2) | `--sk-layer-radius` `-border` `-shadow` |
| 공통 제목 | `> .header > h1/h3/h5` | 16px / 700 | `--sk-layer-title-fs` / `-fw` |
| 알림 | `.gAlert` | radius 10 · border --gray-2 | 공통 토큰 사용 |
| 장바구니 담기 | `.xans-product-basketadd .gAlert` | max-width 500 · 본문 18px/700 | `--sk-layer-alert-max-w` / `-msg-fs` |
| 옵션 변경 | `#ec-basketOptionModifyLayer` | max-height 80dvh · 제목 18px | `--sk-layer-modal-max-h` / `-title-fs` |
| 쿠폰 결과 | `.couponDownResult` | 700px | `--sk-layer-wide-w` |
| 닫기 버튼 | `.btnClose` | 40px (모바일 30px) · etlandmall svg | `--sk-layer-close-size` (CSS X) |
| z-index | `.ec-base-layer-area` | 99999 | `--sk-z-modal` |

### B-7. 공통 기반 토큰

| 범주 | 토큰 |
|---|---|
| 글꼴 | `--sk-font-base` (기본: 시스템 글꼴 목록. 웹폰트는 쇼핑몰 테마에서 지정) |
| 글자 크기 | `--sk-text-title-m: 28px`, `--sk-text-title-s: 24px`, `--sk-text-body-l: 18px`, `--sk-text-body-m: 16px`, `--sk-text-body-s: 14px`, `--sk-text-script-m: 12px` |
| 둥글기 | `--sk-radius-s: 4px`, `--sk-radius-m: 8px`, `--sk-radius-l: 10px` |
| z-index | ui-conventions 4장의 `--sk-z-*` 단계 |
| 포커스 | `--sk-focus-ring` |

---

## C. Style Adapter 목록

| 원본 JS | 대상 DOM | 구조 변경 내용 | 포함 여부 | 위험도 |
|---|---|---|---|---|
| member.js | `#join_zipcode_wrap`, `#fmodify_zipcode_wrap` 안의 `#postcode1, #postBtn` | `span.addr-search-wrap`으로 감싼다 (`wrapAll`) | **기본 포함** (`address-form`) | 낮음. 노드를 옮기기만 해서 이벤트와 id가 남는다. 중복 검사가 있다 |
| member.js | `.agreeArea .title .check` | "(필수)/(선택)" 글자를 `<em class="required/optional">`로 분리 | **기본 포함** (`agreement-title`) | 낮음. label 안에 input이 없음을 확인했다. 한국어 문구에 의존한다. body 감시를 `.xans-member-join`으로 좁힌다 |
| dropdown.js | 모든 `select` | 원본 select를 숨기고 `ul.custom-select`를 만든다 | **선택형** (`custom-select`) | **높음**. 아래 C-2 |
| basket.js | `#ec-basketOptionModifyLayer select` | 같은 커스텀 select를 따로 구현 (`.active`, `hide()`) | 선택형 (dropdown과 하나로 합친다) | 높음 |
| myshop.js 1~278 | 배송 주소록 표 td | `.addr-value`로 감싸기(`wrapInner`), 모바일에서 수정 버튼 이동, 데스크톱에서 원래대로 | **선택형** (`address-book`) | 중간. 반응형 전환 때 DOM을 왕복한다. 원래 위치 복구 로직이 있다 |
| basket.js 162~ | 옵션 변경 레이어 | 레이어를 `body`로 옮긴다 | 선택형 | 중간. `[확인 필요]` 카페24가 부모 기준으로 레이어를 찾는지 |
| basket.js 93~ | 최종 금액 영역 | 1080 이하에서 하단 버튼 위로 옮기고, 넓어지면 복구 | 선택형 | 중간. CSS `order`/grid로 대체할 수 있는지 먼저 검토 |
| basket.js 309~ | 이용안내 h3 | 아코디언 제목으로 감싸기 | 선택형 (catalog accordion) | 낮음 |
| product.js 137~157 | `.xans-product-detaildesign table` | **표 전체를 `dl.product-info`로 교체** | **제외 → CSS로 대체** | **매우 높음**. 아래 C-1 |
| product.js 159~ | `.product-info` | 가격 추출·할인율 계산·HTML 생성 | 제외 | 비즈니스 로직 (가격 계산) |
| myshop.js 284~611 | `.xans-product-optionselectlayer` | 상품 옵션 레이어 DOM 조작 | 제외 | 옵션·가격 계산 영역 (절대 규칙 6) |
| myshop.js 749~ | 회원정보수정 표의 tr | 생년월일·성별 행 위치 이동, 섹션 테이블 새로 만들기 | 제외 (쇼핑몰별) | 중간. 노드를 옮기는 방식이라 form 값은 남는다. 그러나 레이아웃이 쇼핑몰마다 다르다 |
| myshop.js 733~ | `.pwc-form` 텍스트 | `&nbsp;` 제거 | 제외 | 쇼핑몰 전용 마크업 |
| member.js 탈퇴 | `[data-action=withdraw]` | 체크해야 버튼 활성화 + `body` 전체 감시 | 제외 | 기능 로직 |

### C-1. 표 → DL 교체 위험성 검증 (product.js 141~154)

```js
$dl.append($('<dt>').html($tr.find('th').html()), $('<dd>').html($tr.find('td').html()));
$table.replaceWith($dl);
```

1. **`tr`의 속성이 사라진다.** 카페24가 행에 붙이는 class(`displaynone` 등)와 `style`이 복사되지 않는다. 그래서 관리자에서 숨긴 항목이 보일 수 있다. `[확인 필요]` 실제 출력 마크업
2. **`.html()`은 새 노드를 만든다.** 안쪽 요소에 jQuery로 연결된 이벤트(쿠폰 다운로드, 툴팁 등)가 사라진다. inline `onclick`만 남는다.
3. **캐시된 참조가 끊긴다.** 카페24 `sale_price.js`는 `#span_product_price_text`, `#ec-product-price-info`를 다룬다. 이 스크립트가 교체 전에 요소를 변수에 담았다면 옵션 선택 때 가격이 화면에 반영되지 않는다. `[확인 필요]` 실행 순서
4. **표 의미가 사라진다.** `th`/`td`의 연결 관계가 없어진다. dl/dt/dd도 의미 구조이므로 접근성 손실은 크지 않다. 다만 1~3 때문에 교체할 이유가 없다.
5. 바로 다음 코드(159~)가 `.product-info`를 전제로 가격을 계산하므로 **분리할 수 없다.**

**결론**: Adapter로 넣지 않는다. 대신 `table/tbody/tr/th/td`에 `display:block|grid`를 주는 **CSS 블록화**로 같은 모양을 만든다. 이 방식은 standards/ui-conventions 6-5와 catalog 14번에 이미 정해 둔 방향이다.

### C-2. 커스텀 select 위험성

| 문제 | 내용 | 통합 컴포넌트에서 고칠 점 |
|---|---|---|
| 적용 범위 | `$('select')` 전체에 적용된다. 상품 옵션만 제외한다 | 기본값은 꺼짐. 대상 선택자 목록을 설정으로 받는다. 주문서·PG·상품 옵션은 **항상 제외** |
| 동기화 | 커스텀 → 원본 방향만 있다. 카페24가 값을 바꾸면(주소 불러오기, 옵션 다시 그리기) 화면이 따라가지 않는다 | 원본 `change` 이벤트와 option 변경을 감시해서 양방향으로 맞춘다 |
| 실행 시점 | DOMReady 한 번만 실행된다. 나중에 생기는 select는 처리하지 않는다 | adapter core의 범위 한정 감시로 처리 |
| 접근성 | `ul/li` 클릭만 된다. 키보드, `aria-*`, label 연결이 없다 | `button[aria-haspopup=listbox][aria-expanded]` + `role=listbox/option`, ↑↓/Enter/Esc |
| 중복 구현 | dropdown.js와 basket.js가 다르게 동작한다 (`is-open`+slide / `active`+hide) | 하나로 합치고 상태 클래스는 `is-open` |
| 아이콘 | etlandmall 이미지 | CSS chevron |
| 원본 숨김 | `$select.hide()` | 원본은 남겨 두고 시각적으로만 숨긴다. 폼 검증 메시지 위치를 확인 `[확인 필요]` |

### C-3. Adapter 공통 규칙 (설계안)

- 켜는 방법: `<html data-sk-adapters="address-form agreement-title">` (`data-sk-strip-ez`와 같은 옵트인 방식)
- `SkinKit.$` (격리된 jQuery 3.7.1)만 쓴다
- 실행할 때마다 대상이 있는지 먼저 확인하고, `data-sk-adapted="이름"`으로 다시 실행해도 결과가 같게 한다
- 감시는 **공유 observer 1개**, 범위는 adapter가 등록한 루트로 한정, `requestAnimationFrame`으로 묶어서 처리
- `name/id/value`와 form 소속은 바꾸지 않는다. 노드는 **복사하지 않고 옮긴다**(`wrap`/`append`). `.html()` 복사는 금지

---

## D. 제외 목록

| 대상 | 위치 | 제외 사유 |
|---|---|---|
| SSO·인증 | `js/front/auth.js`, `core.js`, `config.js` | 인증 로직, 고객사 CLIENT_ID |
| API 통신 | `js/front/*` (basket, product_detail, promotion…), axios | 백엔드 연동 |
| 가격·할인 계산 | `product.js` 159~, `sale.js` | 비즈니스 로직 |
| 주문서 | `order.css`, 주문서 안의 input/select 스타일 | 절대 규칙 7 |
| 장바구니 수량 확정 | `basket.js` 1~92 | 기능 변경 |
| 탈퇴 버튼 활성화 | `member.js` | 기능 로직 |
| API·CMS 스켈레톤 | `front/common.css` 2,307줄 | API 응답에 의존 |
| 프로모션·기획전·타임딜 | promo.css, project.css, products.css 일부, promo.js | 쇼핑몰 기능 |
| 슬라이더 | slide.js, visual.css | 범위 밖 (Swiper) |
| 헤더·푸터 | layout/header.css, footer.css, layout.js | 브랜드 고유 |
| 메인·서브·임직원 페이지 | pages/*.css, category_type_*.js | novadeal 전용 |
| 상품 목록 아이콘 교체 | product.js 13~80 | etlandmall 이미지, 쇼핑몰 디자인 |
| 웹폰트 | Paperlogy, Hakgyoansim, Open Sans 등 | 쇼핑몰 테마에서 지정 |
| 리뷰 앱 백업 CSS | alpha_review_style_backup.css | 외부 앱 (절대 규칙 8) |
| ec-base 사본 | aisoul/assets/css/cafe24/ec-base/ | 원본과 같고 불러오는 곳이 없다 |

---

## E. 문제 및 개선 사항

| # | 분류 | 내용 | 개선 |
|---|---|---|---|
| 1 | 우선순위 | `#wrap .btnNormal.sizeS`(1,2,0)가 `#wrap button.sizeS`(1,1,1)보다 강하다. 그래서 크기별 `min-width`(40/70/100)가 **한 번도 적용되지 않고** 항상 105px이다 | 공통 → 크기 순서가 보장되게 같은 명시도로 맞춘다 |
| 2 | 상태 누락 | 비활성을 `:disabled`로만 처리한다. 카페24는 `<a class="… disabled">`를 쓰므로 링크 버튼에는 비활성 모양이 나오지 않는다 | `:is(:disabled, .disabled)` |
| 3 | 누락 | 크기 클래스가 없는 btnNormal(66건), btnSubmit(15건)과 btnEm/Basic/Text는 카페24 기본 모양(#bcbcbc, 40px, 13px)이 그대로 나온다 | 유형 토큰을 크기와 따로 적용한다 |
| 4 | 범위 | 버튼 규칙이 `#wrap`에 묶여 있다. `popup.html`에는 `#wrap`이 없어서 팝업 창 버튼은 일부만 적용된다 | 범위 루트를 `:is(#wrap, body)`로 둔다. 명시도는 (1,x,x)로 유지하면서 팝업에서도 적용된다 `[제안]` |
| 5 | 범위 | input은 `body #contents`, textarea·select는 `body` 전체에 적용된다. 주문서도 빠져 있지 않다 | 같은 범위로 맞추고 주문서 루트를 제외한다 `[확인 필요]` 주문서 루트 선택자 |
| 6 | !important | 전체 471개 (products 117, myshop 83, board 51). input `:hover`에도 있다 | SkinKit에서는 카페24 inline style을 이겨야 할 때만 쓰고 주석을 단다 |
| 7 | 중복 | modal.css의 레이어 제목 굵기를 600으로 선언한 뒤 700으로 다시 선언한다. pagination `is-disabled` 규칙이 두 번 있다. 탈퇴 버튼 규칙이 myshop.css 432와 629에 나뉘어 있다 | 하나로 합친다 |
| 8 | 충돌 | board.css가 pagination 첫 화살표를 `page-left.png`로 덮고, pagenation.css는 svg를 쓴다 | 하나의 에셋으로 통일 |
| 9 | 오류 | `.xans-board-replysort:after:has(select)`는 잘못된 선택자(가상 요소 뒤 `:has`)라 규칙 전체가 무시된다 | `:has(select)::after`로 고친다 |
| 10 | 반응형 | 768(51) · 1200(28) · 1024(26) · 1080(23) · 1280(11) · 800 · 600 · 500이 섞여 있다 | 1024 / 767 두 개로 정리한다. 768 → 767은 1px 차이 `[확인 필요]` |
| 11 | 하드코딩 | 공통 컴포넌트 6개 파일(button, input, modal, quantity, tab, pagenation)에 hex 색 17곳 | 토큰으로 바꾼다 |
| 12 | 이미지 경로 | 공통 컴포넌트 아이콘 10종이 etlandmall 경로 (close, select, check, qty up/down, page ×4, path) | CSS 아이콘 6종 + SVG 에셋 4종 (F-2) |
| 13 | 폰트 | 같은 `font-family … !important`가 53번 반복된다 | `body { font-family: var(--sk-font-base) }` 한 번 |
| 14 | 성능 | `MutationObserver` 71개, 그중 42개가 `document.body` 전체를 감시한다 | adapter core 공유 observer 1개, 범위 한정 |
| 15 | 로딩 | `layout.html`과 `popup.html`이 CSS 목록을 각각 관리한다(popup에는 option.css가 있고 layout에는 없다) | 번들 1개(`skinkit.css`)로 합치고 두 레이아웃에서 같은 한 줄로 불러온다 |
| 16 | 이름 | `.align-center`가 `display:flex`까지 준다. `.tab-menu .active`는 표준의 `is-*`와 다르다 | 호환을 위해 그대로 두고 문서에 적는다 |
| 17 | DOM | 표→DL 교체 (C-1), 커스텀 select 단방향 동기화 (C-2) | C 참고 |

---

## F. 최종 SkinKit 구조 (제안)

### F-1. 폴더

```
skinkit/
├── tokens/
│   ├── primitives.css        원색·숫자 (gray, brand, radius, space)
│   ├── semantic.css          역할 (primary, text, border, danger …) + 반응형 토큰
│   ├── components.css        버튼·입력·레이어 등 컴포넌트 토큰 전체 (테마 작성자가 볼 목록)
│   └── legacy-alias.css      --main-color 등 기존 이름 (선택)
├── base/
│   ├── reset.css
│   ├── typography.css        body 글꼴, .title-*/.body-* semantic utility
│   └── utility.css           고정 utility(.flex, .mt-30 …) + 색 utility
├── components/               카페24 클래스에 입히는 공통 UI
│   ├── button.css            btnNormal/Submit/Em/Basic/Text × size × Fix × 상태
│   ├── input.css             text류, textarea, select(원본), 상태
│   ├── check.css             checkbox, radio
│   ├── select.css            .custom-select (adapter와 짝)
│   ├── quantity.css          .ec-base-qty
│   └── pagination.css        .ec-base-paginate
├── cafe24/                   카페24 화면별 보정
│   ├── layer.css             ec-base-layer 유형별 (gAlert, basketadd, optionModify, couponDownResult)
│   ├── board.css             게시판 목록·검색·댓글·빈 상태
│   ├── member.css            가입·로그인 폼 간격, 약관 제목
│   ├── myshop.css            주소록, 쿠폰 목록 등 기본 구조 보정
│   └── empty.css             .ec-base-prdEmpty, td.message
├── adapters/
│   ├── core.js               등록·옵트인·중복 방지·공유 observer
│   ├── address-form.js       (기본) 우편번호 묶기
│   ├── agreement-title.js    (기본) 필수/선택 분리
│   ├── custom-select.js      (선택) dropdown.js + basket.js 통합
│   └── address-book.js       (선택) 주소록 .addr-value
├── assets/icons/             page-prev/next/first/last.svg (mask-image로 색을 바꾼다)
├── themes/
│   └── theme.example.css     쇼핑몰이 복사해서 :root 값만 바꾸는 파일
├── dist/
│   └── skinkit.css           위 CSS를 순서대로 합친 결과 (카페24에 올리는 파일)
└── README.md
```

- 제안안에 있던 `examples/`는 `themes/`와 겹쳐서 하나로 합쳤다.
- `modal.css`(커스텀 모달)와 `tab.css`는 카페24 클래스가 아니어서 catalog 컴포넌트(JS 포함)로 넘긴다.
- 브레이크포인트 숫자는 `skinkit.config.json`에서 넣는다 (ui-conventions 3장).

### F-2. 아이콘 처리

| 아이콘 | 방식 | 이유 |
|---|---|---|
| 닫기 X, 삭제 X | CSS (`::before/::after` 두 선) | 색·굵기를 토큰으로 바꿀 수 있다 |
| select·fold chevron | CSS (border 회전) | 〃 |
| 체크 표시 | CSS (border 회전) | 〃 |
| 수량 +/− | CSS (선 두 개 / 하나) | 〃 |
| 페이지 화살표 4종 | SVG 에셋 + `mask-image` | 겹화살표(처음/끝)는 CSS로 그리기 번거롭다. mask를 쓰면 `background-color`로 색을 바꿀 수 있다 |
| 경로 화살표 | CSS chevron | |

### F-3. 고정 utility 숫자 세트 `[제안]`

`mt / mb / pt / pb` × `0 4 8 10 12 16 20 24 30 40 50 60 80 100` (총 56개). 이름이 값을 뜻하므로 모든 쇼핑몰에서 같다. 토큰을 쓰지 않는다.

### F-4. 의존 관계와 불러오는 순서

```
카페24 기본 CSS (layout/basic/css/*)
  └─ skinkit/dist/skinkit.css
       tokens(primitives → semantic → components → legacy-alias)
       → base(reset → typography → utility)
       → components → cafe24
  └─ {mall}/theme.css          :root 값만 덮어쓴다. 컴포넌트 CSS는 손대지 않는다
  └─ {mall}/assets/css/*        쇼핑몰 전용 예외

JS: 카페24 기본 → jQuery 3.7.1 격리(SkinKit.$) → adapters/core.js → 켠 adapter → 쇼핑몰 JS
```

`layout.html`과 `popup.html` 모두 아래 두 줄이면 된다.

```html
<!--@css(/skinkit/dist/skinkit.css)-->
<!--@css(/{mall}/theme.css)-->
```

### F-5. 카페24 적용 시 확인 필요

| 항목 | 상태 |
|---|---|
| `@css`로 불러온 파일 안의 CSS `@import`가 동작하는가 → 안 되면 dist 번들 필수 | `[확인 필요]` |
| `sub_style.css`, `add_theme*.css`가 `</body>` 앞에서 불러와질 때 SkinKit보다 뒤에 적용되는가 (sub_style에 `.ec-base-button [class^='btn'].sizeL` (0,3,0) 규칙이 있다) | `[확인 필요]` |
| 주문서 루트 선택자 (input·select 제외용) | `[확인 필요]` |
| 카페24 레이어·외부 앱 z-index | `[확인 필요]` |
| 상품 상세 표 tr에 붙는 class/style 실제 출력 | `[확인 필요]` |

---

## G. Git 정리 (승인 필요)

### G-1. 업로드 대상

| 경로 | 업로드 | 사유 |
|---|---|---|
| `skinkit/` | O | 공통 시스템 |
| `standards/`, `docs/`, `README.md`, `CLAUDE.md` | O | 문서 |
| `templates/`, `cloude/`, `agents/` | O | 자동화 도구 (빈 파일 정리 필요) |
| `references/` | **X** | 고객사 4곳 스킨 원본 |
| `workspace/target-skin/skin2/` | **X** | 고객사(단양더덕농산) 스킨 |
| `workspace/target-skin/base/` | **X** (제안) | 카페24 기본 스킨 사본이라 SkinKit에 필요 없다 |

### G-2. 이미 커밋된 민감정보 (`c65a6e8`)

| 파일 | 값 |
|---|---|
| references/novadeal/…/js/front/config.js | `MALL_ID`, `CLIENT_ID` |
| references/heodakmkt/…/heodakmkt/front/front.js | `MALL_ID`, `CLIENT_ID` |
| references/heodakmkt/…/shooook_/link*.html | `CLIENT_ID` |
| references/insanga/…/layout.html, product/detail.html | Kakao 앱키 |
| references/heodakmkt/…/layout.html 외 | GTM ID |
| references/isumembers/… | google-site-verification |

- 저장소는 **비공개**다(외부 조회 404). 위 값은 브라우저에 노출되는 프론트용 식별자라 바로 악용될 위험은 낮다. 하지만 고객사 정보이므로 기록에서도 빼는 것을 권한다.
- `git rm --cached`로 추적만 끊으면 **기존 커밋 기록에는 그대로 남는다.** 커밋이 2개뿐이므로 기록을 새로 시작하고(orphan 브랜치) force push하는 방법이 가장 간단하다.
