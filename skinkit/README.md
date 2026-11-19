# SkinKit

카페24 스마트디자인 스킨의 **기본 UI 스타일을 통일**하고, 쇼핑몰마다 다른 디자인을 **변수(토큰)만 바꿔서** 적용하는 공통 스타일 시스템입니다.

- 카페24 클래스명(`btnNormal`, `sizeS`, `ec-base-layer` …)을 그대로 씁니다. HTML을 고칠 필요가 없습니다.
- 컴포넌트 CSS는 값 대신 토큰(`var(--sk-…)`)만 씁니다. 쇼핑몰은 스킨 안 `skinkit/theme.css`에서 `:root` 값만 바꿉니다.
- 저장소 루트 `skinkit/`은 공통 원본, 스킨 폴더 안 `skinkit/`(`dist/` + `theme.css`)은 그 쇼핑몰 전용입니다. 스킨 값은 `theme.css`에만 씁니다. `dist/`는 설치할 때마다 지우고 다시 복사합니다 (`standards/folder-structure.md` 2-1).
- 파일은 **기능별·페이지별**로 나뉩니다. 공통은 모든 페이지에서, 페이지 전용은 그 페이지에서만 불러옵니다.
- **불러오면 켜집니다.** 선택 기능과 Adapter(스타일용 DOM 변경)는 파일을 불러온 페이지에서만 동작합니다.

---

## 1. 카페24에 적용하기

### 1) 구성

| 구분 | 파일 (`dist/` 기준) | 불러오는 곳 |
|---|---|---|
| **공통** | `tokens/` · `base/` · `components/`(버튼, 입력, 체크, 수량, 페이지) · `cafe24/`(레이어, 아이콘, 빈 상태) · `adapters/core.js` | 레이아웃 `<head>`에서 `head.html` 한 줄 |
| **페이지** | `pages/board.css` (목록·글 보기·댓글·이전/다음 글·관리자 도구) | `board/` 아래 모든 페이지 |
| | `pages/member.css` + `adapters/address-form.js`, `agreement-title.js` | `member/join.html`, `modify.html`, `agreement.html` |
| | `pages/myshop.css` + `adapters/address-book.js` | `myshop/addr/list.html` |
| | `pages/product.css` (기본정보 표 → "항목명 \| 값" 줄 목록) | `product/detail.html` |
| **공통 · custom-select** | `components/custom-select.css` + `.js` (원본 select → ul/li, 프록시). **필수**. 상품 옵션·주문서·목록형 select·`data-sk-native`는 원본 그대로 둔다 | `head.html` (모든 페이지) |
| **선택 기능** | `features/inner.css` (`.inner` 컨테이너) | 레이아웃 `<head>` — **쇼핑몰이 `.inner`를 직접 정의하면 쓰지 않는다** |

페이지 묶음과 대상 파일은 [`skinkit.config.json`](skinkit.config.json)에서 정합니다.

### 2) 설치 (자동)

페이지 수십 곳에 줄을 넣고 빼는 일은 설치 스크립트가 합니다.

```bash
node skinkit/tools/build.mjs        # dist 만들기 (원본을 고쳤을 때)

node skinkit/tools/install.mjs --skin workspace/target-skin/skin4 \
     --pages board --dry-run    # 미리보기
node skinkit/tools/install.mjs --skin workspace/target-skin/skin4 \
     --pages board              # 설치 (테마: skinkit/theme.css, 없으면 예시로 만든다)
```

| 옵션 | 뜻 |
|---|---|
| `--pages board,member,myshop,product` / `all` / `none` | 설치할 페이지 묶음 (기본 none) |
| `--features inner` | 선택 기능 |
| `--theme 경로` | 테마 위치를 바꿀 때만 (기본 `skinkit/theme.css`, 스킨 루트 기준. Git Bash에서는 앞에 `/`를 붙이지 않는다). 기본 위치에 파일이 없으면 `themes/theme.example.css`로 만들고, 있으면 덮어쓰지 않는다 |
| `--layouts …` | 레이아웃 파일 (기본: `layout.html`, `main.html`, `popup.html` 중 있는 것) |
| `--dry-run` | 파일을 쓰지 않고 바뀔 내용만 출력 |
| `--uninstall` | SkinKit 블록을 모두 지운다 (`skinkit/dist` 파일은 남긴다) |

설치 스크립트가 하는 일

1. `dist/`를 `<스킨>/skinkit/dist`로 복사한다 (예전 파일이 남지 않게 지우고 복사)
2. 레이아웃 `<head>` 안 카페24 기본 CSS(`ec-base-*`) 다음에 블록을 넣는다
3. 페이지 파일의 `@layout` 다음 줄에 그 페이지 블록을 넣는다 (`@layout`이 없는 조각 파일은 건너뛴다)
4. **FTP 업로드 목록**을 출력한다

`<!--[SKINKIT:…]-->` 표시 사이만 다루므로 몇 번 실행해도 결과가 같고(설치 = 지우고 다시 넣기), `--uninstall`하면 원본과 같아집니다. 파일마다 원래 줄바꿈(CRLF/LF)을 유지합니다.

설치 결과 예

```html
<!-- layout/basic/layout.html, popup.html … (head 안, 카페24 기본 CSS 다음) -->
<!--[SKINKIT:head]-->
<!--@import(/skinkit/dist/head.html)-->
<!--@css(/skinkit/theme.css)-->
<!--[/SKINKIT:head]-->

<!-- member/join.html (@layout 다음 줄) -->
<!--[SKINKIT:page member]-->
<!--@css(/skinkit/dist/pages/member.css)-->
<!--@js(/skinkit/dist/adapters/address-form.js)-->
<!--@js(/skinkit/dist/adapters/agreement-title.js)-->
<!--[/SKINKIT:page]-->
```

### 3) Adapter 설정 (선택)

Adapter는 파일을 불러오면 켜집니다. 설정은 그 파일보다 먼저 선언합니다.

```html
<script>
window.SkinKitConfig = {
    customSelect: {
        target: '#contents select',              // 적용할 select (기본: 본문·팝업·레이어)
        exclude: ['.xans-board-search select']   // 추가로 뺄 select
    },
    addressForm: { containers: ['#join_zipcode_wrap', '#fmodify_zipcode_wrap'] }
};
</script>
```

- 특정 select 하나만 빼려면 `<select data-sk-native>`를 붙입니다.
- Adapter 파일이 `core.js`보다 먼저 불려도 됩니다 (대기열에 맡겼다가 `core.js`가 실행). 카페24가 페이지 JS와 레이아웃 JS의 출력 순서를 보장하는지 확인하지 못해서 둔 장치입니다.
- 지금 켜진 Adapter 확인: 브라우저 콘솔에서 `SkinKit.adapters.list()`

---

## 2. 쇼핑몰 테마 만들기

설치하면 `<스킨>/skinkit/theme.css`가 `themes/theme.example.css`로 만들어집니다. 값만 바꿉니다. 위에서부터 바꾸고, 결과가 다를 때만 아래로 내려갑니다.

| 순서 | 바꾸는 곳 | 예 | 영향 |
|---|---|---|---|
| 1 | semantic 토큰 | `--sk-color-primary`, `--sk-font-base`, `--sk-max-container` | 버튼·체크박스·페이지 번호 등 함께 바뀐다 |
| 2 | component 토큰 | `--sk-btn-submit-bg`, `--sk-btn-m-py` | 그 컴포넌트만 바뀐다 |
| 3 | 사용 위치 예외 | 쇼핑몰 CSS에 선택자로 따로 | 토큰은 그대로 둔다 |

- 바꿀 수 있는 값 전체 목록: [`tokens/components.css`](tokens/components.css)
- 작은 화면 값은 `-sm` 토큰이 따로 있습니다 (`--sk-input-height-sm`). 기본값만 바꾸면 작은 화면은 그대로입니다.
- 기존 novadeal(aisoul) 변수명(`--main-color`, `--gray-1` …)을 새 토큰에 연결하는 [`tokens/legacy-alias.css`](tokens/legacy-alias.css)는 **공통에 넣지 않았습니다.** 쇼핑몰이 같은 이름을 직접 정의하면 덮어쓸 수 있기 때문입니다. 쇼핑몰이 그 이름을 정의하지 않을 때만 테마 파일 맨 아래에 붙여 씁니다.

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

1. 넣기 전 화면의 계산된 스타일을 측정해서 테마 값으로 옮긴다 (skin4 예: `workspace/target-skin/skin4/skinkit/theme.css`)
2. 쇼핑몰 CSS의 `!important`는 SkinKit보다 강하다. 그대로 두면 기존 모양이 유지된다
3. 페이지 묶음·선택 기능은 쇼핑몰 화면을 바꾸지 않는 것만 설치한다 (skin4: `board`만. `.inner`를 직접 정의하므로 `inner`는 설치하지 않음). 레이아웃 폭(`--sk-max-container`)도 테마에 맞춰 둔다
4. 쇼핑몰 CSS가 `!important`로 상태(비활성 등)까지 덮는 곳은 쇼핑몰 CSS 쪽을 고친다 (`[SKINKIT]` 주석으로 원본 보관)
5. 쇼핑몰 CSS에서 SkinKit 규칙을 덮어야 하면 같은 범위 루트(`:is(#wrap, body)`)를 붙인다. 클래스만으로는 ID 우선순위를 이기지 못한다

---

## 3. 폴더 구조

```
skinkit/
├─ tokens/        primitives(원색·숫자) → semantic(역할) → components(컴포넌트 값) · legacy-alias(선택, 공통 아님)
├─ base/          reset, typography(.title-*, .body-*), utility(.flex, .mt-30 …)
├─ components/    button, input, check, quantity, pagination                 ┐ 공통
├─ cafe24/        layer, icons, empty                                         │ (head.html)
├─ adapters/      core.js                                                     ┘
│                 address-form, agreement-title, address-book                 ← 페이지에서 불러온다
├─ pages/         board, member, myshop, product                              ← 페이지에서 불러온다
├─ features/      inner                                                       ← 선택 기능
├─ themes/        theme.example.css
├─ examples/      demo.html (카페24 마크업 흉내 + 자동 검사)
├─ tools/         build.mjs (빌드·검사), install.mjs (스킨에 설치)
├─ dist/          빌드 결과 — 원본과 같은 폴더 구조 + head.html (카페24에 올리는 파일)
└─ skinkit.config.json   브레이크포인트, 공통·페이지·선택 기능 묶음, 페이지 대상 파일
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

빌드가 하는 일 (Node 20 이상)

- 원본을 같은 폴더 구조로 `dist/`에 내보내고, 공통 선언 목록 `dist/head.html`을 만든다
- `skinkit.config.json`의 브레이크포인트를 CSS에 넣는다. 원본에는 `767px /*bp.small*/`처럼 숫자 뒤에 표시를 달아 둔다. 1024 → 1080으로 바꿀 때 설정 한 곳만 고친다
- `examples/demo.html`의 파일 목록을 설정에서 다시 만든다
- 오류 (빌드 중단): 정의되지 않은 토큰, 쇼핑몰 CDN 이미지 경로, data URI가 아닌 `url()`, 주석·중괄호 짝, 같은 파일이 두 묶음에 들어감, 테마가 없는 토큰을 덮어씀
- 경고: 컴포넌트 CSS의 하드코딩 색, 이유 주석 없는 `!important`, 쓰지 않는 component 토큰

### 화면 검사

`examples/demo.html`을 브라우저로 열면 맨 위에 자동 검사 결과(45개 항목)가 나옵니다. 데모는 모든 공통·페이지·선택 기능을 불러옵니다. 로컬에 `workspace/target-skin/base`(카페24 기본 스킨)가 있으면 카페24 기본 CSS와 함께 검사합니다.

---

## 5. 포함하지 않은 것

SSO·인증, API, 가격·할인 계산, 주문·결제 로직, 장바구니 처리, 프로모션, 슬라이더, 헤더·푸터, 쇼핑몰 전용 페이지, SEO. 자세한 분류는 [docs/skinkit-analysis.md](../docs/skinkit-analysis.md)에 있습니다.

## 6. 실제 쇼핑몰에서 확인할 것

| 항목 | 상태 |
|---|---|
| `@import`한 `head.html` 안의 `@css`·`@js`가 선언 순서대로 나오는지 (레퍼런스 heodakmkt header.html에서 같은 방식 사용 중) | 미검증 |
| 페이지 파일 상단 `@css`가 `<head>`로 나오는지, body 안에 나오는지 (body면 첫 화면에서 잠깐 기본 모양이 보일 수 있다) | 미검증 |
| `sub_style.css`, `add_theme*.css`가 `</body>` 앞에서 불려 SkinKit 뒤에 적용되는지 | 미검증 |
| 새 주문서(ec-jigsaw 등)를 쓰는 쇼핑몰의 주문서 루트 선택자 | 미검증 |
| `.couponDownResult` 너비를 카페24가 inline style로 넣는지 (`!important` 필요 여부) | 미검증 |
| 상품 기본정보 표에 관리자 글자색·크기가 `<span style>`로 나오는지 | 미검증 |
| 카페24 레이어·외부 앱 위젯 z-index와 `--sk-z-*` 단계 충돌 | 미검증 |
| 배송지 등록 팝업 등 다른 화면의 우편번호 영역 id | 미검증 |
| `.disabled` 버튼 클릭으로 카페24 안내창이 뜨는 경우 | 미검증 (pointer-events를 막지 않았다) |
| iOS Safari (`:is`, `:where`, `:has`, 유형별 굵기의 `initial` 대체) | 미검증 |
