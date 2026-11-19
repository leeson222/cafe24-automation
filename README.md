# cafe24-automation

카페24 스마트디자인 스킨의 **초기 세팅, 공통 UI 개선, 반복 개발 작업을 자동화**하는 프로젝트입니다.

> **카페24의 기본 동작은 유지하고, UI와 코드 구조를 개선하며, 반복 작업만 자동화한다.**

코드를 짧게 만들거나 최신 문법으로 바꾸는 것 자체가 목적은 아닙니다. 안정성, 재사용성, 유지보수성, 성능, 작업 시간 단축을 함께 고려합니다.

현재 상태: **초안 v0.1** (2026-11)

---

## 무엇을 하나요

1. **레퍼런스 분석**: 이전에 제작한 스킨 4개를 비교해서 공통으로 쓸 수 있는 기능을 골라냅니다.
2. **공통 컴포넌트(`skinkit`)**: 골라낸 기능을 리팩토링해서 신규 스킨에 바로 넣을 수 있는 형태로 만듭니다.
3. **표준 문서**: 폴더 구조, 파일 호출 순서, CSS/JS 작성 규칙을 정리합니다.
4. **신규 스킨 적용**: 표준과 컴포넌트를 실제 스킨(`workspace/target-skin/`)에 적용하고 검증합니다.

## 폴더 구조

```
cafe24-automation/
├── references/          # 레퍼런스 스킨 4개 (로컬 전용, 업로드하지 않음)
├── workspace/
│   └── target-skin/     # 실제 쇼핑몰 작업 스킨 (로컬 전용, 업로드하지 않음)
├── skinkit/             # 공통 스타일 시스템 (구축 예정)
├── standards/           # 표준 문서
├── docs/                # 분석 보고서
├── templates/           # 자동화 템플릿 (준비 중)
├── cloude/              # Claude 규칙·스킬 초안
├── agents/              # 에이전트 초안
└── CLAUDE.md            # Claude Code 작업 규칙
```

## 문서

| 문서 | 내용 |
|---|---|
| [standards/folder-structure.md](standards/folder-structure.md) | 폴더 구조, `layout.html` 호출 순서, 카페24 기본 파일 패치 규칙 |
| [standards/ui-conventions.md](standards/ui-conventions.md) | 디자인 토큰, 브레이크포인트, CSS/JS 작성 규칙, 주석 규칙 |
| [standards/component-catalog.md](standards/component-catalog.md) | 자동화 대상 컴포넌트 목록, 마크업 계약, 검증 체크리스트 |
| [docs/skinkit-analysis.md](docs/skinkit-analysis.md) | SkinKit 1차 분석 보고서 (공통화 대상, 변수 설계, Style Adapter) |
| [CLAUDE.md](CLAUDE.md) | Claude Code가 따르는 작업 규칙 전체 |

> 고객사 스킨 원본(`references/`, `workspace/target-skin/`)은 로컬에서만 비교용으로 쓰고 저장소에는 올리지 않습니다.

## 핵심 규칙

카페24 기능이 깨지지 않도록 아래 항목은 반드시 지킵니다.

- `references/`의 스킨은 수정하지 않습니다.
- `module="..."` 속성과 `{$...}` 템플릿 변수는 지우거나 모듈 밖으로 옮기지 않습니다.
- `<!--@layout/@css/@js/@import-->`는 주석이 아니라 파일 호출 선언입니다.
- `layout/basic/` 같은 카페24 기본 파일은 수정하지 않습니다. 불가피하면 [패치 규칙](standards/folder-structure.md#7-카페24-기본-파일-패치-규칙)을 따릅니다.
- 카페24가 참조하는 id, class, `onclick`, 이벤트는 제거하거나 덮어쓰지 않습니다.
- 주문서 결제 로직, PG 위젯, 보안 영역은 공통 리팩토링에서 제외합니다.
- 외부 앱(리뷰, 상담, 스마트팝업 등)의 DOM을 강제로 바꾸는 코드는 공통 코드에 넣지 않습니다.
- SEO와 운영 환경 설정은 공통 코드와 분리합니다.

UI를 고칠 때는 **CSS → HTML 구조 변경 → JS DOM 조작** 순서로 검토하고, JS가 필요하면 원래 요소를 남겨 둔 채 조작합니다(프록시 방식).

## 주요 결정 사항

| 항목 | 내용 |
|---|---|
| 공통 네임스페이스 | `skinkit/` |
| jQuery | 카페24 jQuery는 그대로 두고, skinkit은 jQuery 3.7.1을 `noConflict(true)`로 격리해서 `SkinKit.$`로 사용 |
| Swiper | 전역 `Swiper`는 카페24 기본 4.5.1 유지, skinkit은 Swiper 11을 격리해서 `SkinKit.Swiper`로 사용 |
| 브레이크포인트 | 레이아웃 전환 기준 1024px (설정값 하나로 관리) |
| `data-ez*` 제거 | 옵트인. `<html data-sk-strip-ez>`가 있는 스킨에서만 동작 |

## 자동화 등급

컴포넌트마다 아래 등급을 붙여서 관리합니다. 컴포넌트별 등급은 [component-catalog.md](standards/component-catalog.md)에 있습니다.

| 등급 | 의미 |
|---|---|
| **A** | 안전하게 자동 적용 가능 → 신규 스킨에 기본 포함 |
| **B** | 조건 확인 후 자동화 가능 |
| **C** | 스킨별 검토 필요 → 선택형 모듈 |
| **D** | 카페24 관리자 설정 확인 필요 |
| **E** | 자동화 제외 |

## 진행 상황

- [x] 레퍼런스 스킨 4개 수집
- [x] 표준 문서 초안 (폴더 구조, UI 규칙, 컴포넌트 목록)
- [x] SkinKit 1차 분석 ([보고서](docs/skinkit-analysis.md))
- [ ] `skinkit` 공통 스타일 시스템 구축 (토큰, 컴포넌트, Style Adapter)
- [ ] 실제 쇼핑몰 스킨에 적용 및 검증
- [ ] `templates/` 자동화 템플릿 작성
