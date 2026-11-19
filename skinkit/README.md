# SkinKit

카페24 스마트디자인 스킨의 **기본 UI 스타일을 통일**하고, 쇼핑몰마다 다른 디자인을 **변수(토큰)만 바꿔서** 적용하는 공통 스타일 시스템입니다.

- 카페24 클래스명(`btnNormal`, `sizeS`, `ec-base-layer` …)을 그대로 씁니다. HTML을 고칠 필요가 없습니다.
- 컴포넌트 CSS는 값 대신 토큰(`var(--sk-…)`)만 씁니다. 쇼핑몰은 `theme.css`에서 `:root` 값만 바꿉니다.
- 스타일 때문에 꼭 필요한 DOM 변경만 **Style Adapter**로 두고, 쇼핑몰이 골라서 켭니다.

---

## 1. 카페24에 적용하기

### 1) 파일 올리기

스킨 루트에 `skinkit/` 폴더를 올립니다. 카페24에서 쓰는 파일은 `dist/` 두 개뿐입니다.

```
skin/
├─ skinkit/dist/skinkit.css
├─ skinkit/dist/skinkit.js
└─ {쇼핑몰}/theme.css        ← themes/theme.example.css를 복사해서 만든다
```

### 2) layout.html, popup.html에 선언

두 레이아웃 모두 **같은 줄**을 넣습니다. 카페24 기본 CSS보다 뒤에 둡니다.

```html
<!-- 카페24 기본 CSS (layout/basic/css/ec-base-*.css) 다음 -->
<!--@css(/skinkit/dist/skinkit.css)-->
<!--@css(/{쇼핑몰}/theme.css)-->

<!-- 카페24 기본 JS 다음 -->
<!--@js(/skinkit/dist/skinkit.js)-->
```

### 3) Adapter 켜기 (선택)

기본값은 모두 꺼져 있습니다. 필요한 것만 `<html>`에 적습니다.

```html
<html lang="ko" data-sk-adapters="address-form agreement-title custom-select">
```

| 이름 | 하는 일 | 구분 |
|---|---|---|
| `address-form` | 회원가입·정보수정 우편번호 입력칸과 검색 버튼을 한 줄로 묶는다 (`span.addr-search-wrap`) | 기본 권장 |
| `agreement-title` | 약관 제목의 (필수)/(선택)을 `<em class="required\|optional">`로 분리한다 | 기본 권장 |
| `custom-select` | 원본 select를 숨기고 ul/li 커스텀 select를 만든다. 원본 값과 양방향으로 맞춘다 | 선택 |
| `address-book` | 배송 주소록 표를 작은 화면에서 카드로 보이도록 칸에 이름을 붙인다 | 선택 |

Adapter 설정은 `skinkit.js`보다 먼저 선언합니다.

```html
<script>
window.SkinKitConfig = {
    customSelect: {
        target: '#contents select',              // 적용할 select (기본: 본문·팝업·레이어)
        exclude: ['.xans-board-search select']   // 추가로 뺄 select
    }
};
</script>
```

특정 select 하나만 빼려면 `<select data-sk-native>`를 붙입니다.

### 4) 레이아웃을 바꾸는 CSS 켜기 (선택)

화면 배치를 바꾸는 CSS는 기본으로 꺼져 있습니다. 이미 디자인된 스킨에 SkinKit을 넣었을 때 갑자기 바뀌지 않게 하기 위해서입니다.

```html
<html lang="ko" data-sk-features="prdinfo-grid">
```

| 이름 | 하는 일 |
|---|---|
| `prdinfo-grid` | 상품 상세 기본정보 표를 "항목명 \| 값" 줄 목록으로 바꾼다 (JS 없이 CSS만, 관리자에서 숨긴 행은 그대로 숨김) |

---

## 2. 쇼핑몰 테마 만들기

`themes/theme.example.css`를 복사해서 값만 바꿉니다. 위에서부터 바꾸고, 결과가 다를 때만 아래로 내려갑니다.

| 순서 | 바꾸는 곳 | 예 | 영향 |
|---|---|---|---|
| 1 | semantic 토큰 | `--sk-color-primary`, `--sk-font-base` | 버튼·체크박스·페이지 번호 등 함께 바뀐다 |
| 2 | component 토큰 | `--sk-btn-submit-bg`, `--sk-btn-m-py` | 그 컴포넌트만 바뀐다 |
| 3 | 사용 위치 예외 | 쇼핑몰 CSS에 선택자로 따로 | 토큰은 그대로 둔다 |

- 바꿀 수 있는 값 전체 목록: [`tokens/components.css`](tokens/components.css)
- 작은 화면 값은 `-sm` 토큰이 따로 있습니다 (`--sk-input-height-sm`). 기본값만 바꾸면 작은 화면은 그대로입니다.
- 기존 novadeal(aisoul) 변수명(`--main-color`, `--gray-1` …)은 [`tokens/legacy-alias.css`](tokens/legacy-alias.css)가 새 토큰에 연결합니다.

### 버튼 토큰 구조

유형(색)과 크기(여백)가 따로라서 어떤 조합이든 됩니다.

```
유형  btnNormal(Fix) · btnSubmit(Fix) · btnEm · btnBasic   → --sk-btn-{normal|submit|em|basic}-{bg|color|border|hover-bg}
      유형별 둥글기 · 굵기(선택)                             → --sk-btn-{normal|submit}-{radius|fw}
크기  sizeS · sizeM · sizeL · sizeQty                     → --sk-btn-{s|m|l|qty}-{py|px|fs|fw|min-width|min-height}
Fix   최소 너비만 고정                                      → --sk-btn-fix-{s|m|l}-min-width
상태  :disabled 와 카페24 .disabled 공통                     → --sk-btn-disabled-{bg|color|border}
```

- 굵기는 크기 토큰이 기본입니다. `--sk-btn-submit-fw: 700`처럼 유형 토큰에 값을 넣으면 그 유형만 크기와 상관없이 그 굵기가 됩니다 (기본값 `initial` = 지정 안 함).
- 높이가 정해진 시안(40px 등)은 `-min-height`를 쓰고 `-py`를 0으로 둡니다. 글자는 가운데 정렬됩니다.

### 이미 디자인된 스킨에 넣을 때

1. 넣기 전 화면의 계산된 스타일을 측정해서 테마 값으로 옮긴다 (skin4 예: `workspace/target-skin/skin4/onjangteo_custom/theme.css`)
2. 쇼핑몰 CSS의 `!important`는 SkinKit보다 강하다. 그대로 두면 기존 모양이 유지된다
3. 쇼핑몰 CSS가 `!important`로 상태(비활성 등)까지 덮는 곳은 쇼핑몰 CSS 쪽을 고친다 (`[SKINKIT]` 주석으로 원본 보관)
4. 쇼핑몰 CSS에서 SkinKit 규칙을 덮어야 하면 같은 범위 루트(`:is(#wrap, body)`)를 붙인다. 클래스만으로는 ID 우선순위를 이기지 못한다

---

## 3. 폴더 구조

```
skinkit/
├─ tokens/        primitives(원색·숫자) → semantic(역할) → components(컴포넌트 값) → legacy-alias(선택)
├─ base/          reset, typography(.title-*, .body-*), utility(.flex, .mt-30, .inner …)
├─ components/    button, input, check, select(커스텀), quantity, pagination
├─ cafe24/        layer, icons, empty, product-info, board, member, myshop
├─ adapters/      core + address-form, agreement-title, custom-select, address-book
├─ themes/        theme.example.css
├─ examples/      demo.html (카페24 마크업 흉내 + 자동 검사)
├─ tools/         build.mjs
├─ dist/          빌드 결과 (카페24에 올리는 파일)
└─ skinkit.config.json   브레이크포인트, 파일 순서
```

### 우선순위 규칙

| 대상 | 범위 루트 | 이유 |
|---|---|---|
| 버튼, 수량, 페이지, 게시판 | `:is(#wrap, body)` | `#wrap`이 없는 popup.html에서도 동작하면서 ID 우선순위(1,0,0)를 유지한다 |
| 입력, 체크박스 | `:is(#contents, #popup, .ec-base-layer)` | 헤더 검색창은 건드리지 않는다 |
| 주문서 | `:where(:not(:is(.xans-order-form, #mCafe24Order) *))` | 주문서·결제는 공통 스타일에서 뺀다 |
| 레이어 | `body:not(#popup)` | 팝업 창 안 레이어는 카페24가 테두리를 없앤다 |
| reset | `:where(…)` (0,0,0) | 카페24 클래스 규칙이 언제나 이긴다 |

---

## 4. 빌드와 검사

```bash
node skinkit/tools/build.mjs          # dist 생성 + 검사
node skinkit/tools/build.mjs --check  # 검사만
```

빌드가 하는 일

- `skinkit.config.json`의 브레이크포인트를 CSS에 넣는다. 원본에는 `767px /*bp.small*/`처럼 숫자 뒤에 표시를 달아 둔다. 1024 → 1080으로 바꿀 때 설정 한 곳만 고친다.
- 오류 (빌드 중단): 정의되지 않은 토큰 사용, 쇼핑몰 CDN 이미지 경로, 주석·중괄호 짝, 테마가 없는 토큰을 덮어씀
- 경고: 컴포넌트 CSS의 하드코딩 색, 이유 주석 없는 `!important`, 쓰지 않는 component 토큰

### 화면 검사

`examples/demo.html`을 브라우저로 열면 맨 위에 자동 검사 결과(44개 항목)가 나옵니다. 로컬에 `workspace/target-skin/base`(카페24 기본 스킨)가 있으면 카페24 기본 CSS와 함께 검사합니다.

---

## 5. 포함하지 않은 것

SSO·인증, API, 가격·할인 계산, 주문·결제 로직, 장바구니 처리, 프로모션, 슬라이더, 헤더·푸터, 쇼핑몰 전용 페이지, SEO. 자세한 분류는 [docs/skinkit-analysis.md](../docs/skinkit-analysis.md)에 있습니다.

## 6. 실제 쇼핑몰에서 확인할 것

| 항목 | 상태 |
|---|---|
| `sub_style.css`, `add_theme*.css`가 `</body>` 앞에서 불려 SkinKit 뒤에 적용되는지 | 미검증 |
| 새 주문서(ec-jigsaw 등)를 쓰는 쇼핑몰의 주문서 루트 선택자 | 미검증 |
| `.couponDownResult` 너비를 카페24가 inline style로 넣는지 (`!important` 필요 여부) | 미검증 |
| 상품 기본정보 표에 관리자 글자색·크기가 `<span style>`로 나오는지 | 미검증 |
| 카페24 레이어·외부 앱 위젯 z-index와 `--sk-z-*` 단계 충돌 | 미검증 |
| 배송지 등록 팝업 등 다른 화면의 우편번호 영역 id | 미검증 |
| `.disabled` 버튼 클릭으로 카페24 안내창이 뜨는 경우 | 미검증 (pointer-events를 막지 않았다) |
