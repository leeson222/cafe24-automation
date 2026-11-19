#!/usr/bin/env node
/* ==========================================================================
   tools/preview/build-preview.mjs
   기능: 카페24 스킨을 서버 없이 VS Code Live Server로 볼 수 있는 정적 HTML로 만든다 (디자인 확인용)
         1) 스킨의 리소스(CSS·JS·이미지·폰트, .html 제외)를 preview/로 복사한다
         2) 페이지마다 @layout + @contents + @import를 결합하고, @css·@js를 <link>·<script>로 바꾼다
         3) module="…" 요소에 카페24 서버가 붙이는 xans-* class를 같은 규칙으로 붙인다
         4) {$변수}·{$form.*}를 위치에 맞는 샘플값으로 바꾼다 (sample-data.json)
         5) 없는 리소스(이미지·폰트·CSS·JS)와 외부 리소스를 찾아 보고서로 남긴다
         6) 생성 전후 원본 스킨 해시를 비교해서 원본이 바뀌지 않았는지 확인한다
   실행: npm run preview                     (preview.config.json의 skin, pages)
         npm run preview -- --skin workspace/target-skin/skin4 --pages main,product-list
         npm run preview -- --no-jquery      (카페24 대신 넣는 jQuery를 빼고 만든다)
   보기: Live Server 루트를 /preview로 두고 preview/index.html 열기 (또는 npm run preview:serve)
   원칙
     - 원본 스킨은 읽기만 한다. 결과는 preview/(Git 제외)에만 쓴다
     - 카페24 기능(로그인, 장바구니, 옵션, 결제, 게시판 쓰기 …)을 흉내 내지 않는다.
       템플릿 자리는 디자인 확인용 샘플로만 채우고, 입력 요소에는 name을 주지 않는다
     - class·id·DOM 구조는 원본 그대로 둔다 (추가하는 것: xans-* class, 샘플값, data-preview 표시,
       상태 토글용 <style data-preview>·<script data-preview>·.preview-bar)
   의존: Node 20 이상 (외부 패키지 없음)
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve, sep, posix } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const config = JSON.parse(readFileSync(join(HERE, 'preview.config.json'), 'utf8'));
const sample = JSON.parse(readFileSync(join(HERE, 'sample-data.json'), 'utf8'));

// ----------------------------------------------------------------
// 인자
// ----------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const SKIN = resolve(REPO, opt('skin', config.skin));
const OUT = resolve(REPO, config.out);
const JQUERY = args.includes('--no-jquery') ? '' : config.jquery;
const pageFilter = opt('pages', '');
const PAGES = pageFilter
    ? config.pages.filter((p) => pageFilter.split(',').includes(p.name))
    : config.pages;

function fail(message) {
    console.error(`오류  ${message}`);
    process.exit(1);
}
if (!existsSync(join(SKIN, 'layout', 'basic'))) fail(`카페24 스킨 폴더가 아닙니다 (layout/basic 없음): ${SKIN}`);
// 이유: 결과 폴더를 통째로 지우므로, 저장소 안의 preview 폴더가 아니면 멈춘다
if (relative(REPO, OUT).startsWith('..') || !/preview$/.test(OUT)) fail(`결과 폴더는 저장소 안의 preview여야 합니다: ${OUT}`);
if (relative(SKIN, OUT) === '' || !relative(SKIN, OUT).startsWith('..')) fail('결과 폴더가 스킨 안에 있으면 안 됩니다');

const toPosix = (p) => p.split(sep).join('/');
const SKIN_REL = toPosix(relative(REPO, SKIN));

// ----------------------------------------------------------------
// 원본 보호: 생성 전후 해시 비교
// ----------------------------------------------------------------
function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, out);
        else out.push(full);
    }
    return out;
}
function hashTree(dir) {
    const h = createHash('sha1');
    for (const f of walk(dir).sort()) h.update(toPosix(relative(dir, f))).update(readFileSync(f));
    return h.digest('hex');
}
const skinHashBefore = hashTree(SKIN);

// ----------------------------------------------------------------
// 1) 리소스 복사 (.html 제외)
// 이유: 원본 CSS가 url(/몰폴더/img/…)처럼 스킨 루트 기준 경로를 쓴다.
//       preview/를 Live Server 루트로 두면 복사본을 고치지 않고 그대로 쓸 수 있다
// ----------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });
let copied = 0;
for (const full of walk(SKIN)) {
    if (full.endsWith('.html')) continue;   // 이유: 템플릿은 결합해서 _preview/에 따로 만든다
    const target = join(OUT, relative(SKIN, full));
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(full, target);
    copied++;
}
mkdirSync(join(OUT, '_preview', 'assets'), { recursive: true });
// 기능: 상품·배너 이미지 자리표시 (회색 바탕에 "IMAGE")
writeFileSync(join(OUT, '_preview', 'assets', 'placeholder.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#EEEEEE"/><text x="300" y="310" font-family="sans-serif" font-size="40" fill="#AAAAAA" text-anchor="middle">IMAGE</text></svg>');

// ----------------------------------------------------------------
// 2) 템플릿 결합
// ----------------------------------------------------------------
const readSkin = (path) => {
    const file = join(SKIN, path.replace(/^\//, ''));
    return existsSync(file) ? readFileSync(file, 'utf8').replace(/^﻿/, '') : null;
};

function resolveImports(html, stack, report) {
    return html.replace(/<!--@import\(([^)]+)\)-->/g, (whole, path) => {
        path = path.trim();
        if (stack.includes(path)) {
            report.notes.push(`@import 순환 건너뜀: ${[...stack, path].join(' → ')}`);
            return `<!-- preview: @import 순환 ${path} -->`;
        }
        if (stack.length > 15) return `<!-- preview: @import 깊이 초과 ${path} -->`;
        const part = readSkin(path);
        if (part === null) {
            report.missing.add(`@import ${path}`);
            return `<!-- preview: @import 파일 없음 ${path} -->`;
        }
        return `<!-- preview: @import ${path} -->` + resolveImports(part, [...stack, path], report) + `<!-- preview: /@import ${path} -->`;
    });
}

function combine(page, report) {
    const src = readSkin(page.src);
    if (src === null) fail(`페이지가 없습니다: ${page.src}`);
    const layoutMatch = src.match(/<!--@layout\(([^)]+)\)-->/);
    let html;
    if (layoutMatch) {
        const layoutPath = layoutMatch[1].trim();
        const layout = readSkin(layoutPath);
        if (layout === null) fail(`${page.src}: 레이아웃이 없습니다 ${layoutPath}`);
        report.layout = layoutPath;
        const body = src.replace(layoutMatch[0], '');
        if (!layout.includes('<!--@contents-->')) report.notes.push(`${layoutPath}에 @contents가 없음`);
        html = layout.replace('<!--@contents-->', () => `<!-- preview: 페이지 ${page.src} 시작 -->${body}<!-- preview: 페이지 끝 -->`);
    } else {
        html = src;
        report.layout = '(없음)';
    }
    return resolveImports(html, [page.src], report);
}

// ----------------------------------------------------------------
// 3) @css·@js·@define 변환
// ----------------------------------------------------------------
function convertDirectives(html, report) {
    const seen = new Set();
    return html
        .replace(/<!--@define\([^)]*\)-->/g, '<!-- preview: @define 제거 (카페24 로그 선언) -->')
        .replace(/<!--@(css|js)\(([^)]+)\)-->/g, (whole, kind, path) => {
            path = path.trim();
            const key = `${kind}:${path}`;
            if (seen.has(key)) return `<!-- preview: 중복 @${kind} 생략 ${path} -->`;
            seen.add(key);
            report.assets.add(path);
            return kind === 'css' ? `<link rel="stylesheet" href="${path}">` : `<script src="${path}"></script>`;
        });
}

// ----------------------------------------------------------------
// 4) module → xans-* class
// 규칙 (카페24 출력에서 확인한 형태, 숫자 접미사 처리는 skin4 board.css 선택자로 확인):
//   module="product_listnormal" → xans-element- xans-product xans-product-listnormal
//   module="board_paging_9"     → … xans-board-paging-9 xans-board-paging xans-board-9
// [확인 필요] 모든 모듈이 이 규칙을 따르는지
// ----------------------------------------------------------------
function moduleClasses(name) {
    const parts = name.toLowerCase().split('_').filter(Boolean);
    const classes = ['xans-element-', `xans-${parts[0]}`, `xans-${parts.join('-')}`];
    const last = parts[parts.length - 1];
    if (parts.length > 2 && /^\d+$/.test(last)) {
        classes.push(`xans-${parts.slice(0, -1).join('-')}`, `xans-${parts[0]}-${last}`);
    }
    return [...new Set(classes)];
}

// ----------------------------------------------------------------
// 5) 템플릿 변수 → 샘플
// ----------------------------------------------------------------
const VAR = /\{\$([a-zA-Z0-9_.]+)((?:\|[^}]*)?)\}/g;
const textRules = sample.text.map((r) => ({ ...r, re: new RegExp(r.match, 'i') }));
const formRules = sample.form.map((r) => ({ ...r, re: new RegExp(r.match, 'i') }));

function textValue(name, report) {
    if (name.startsWith('form.')) {
        const field = name.slice(5);
        const rule = formRules.find((r) => r.re.test(field));
        report.forms++;
        return rule.html.replace(/\{name\}/g, field);
    }
    const rule = textRules.find((r) => r.re.test(name));
    if (rule) return rule.value;
    report.fallback.set(name, (report.fallback.get(name) || 0) + 1);
    return sample.fallbackText;
}

function attrValue(attr, name) {
    const a = attr.toLowerCase();
    if (a in sample.attr && a !== 'default') return sample.attr[a];
    if (a === 'value' && /qty|quantity/.test(name)) return '1';
    return sample.attr.default;
}

// 기능: 링크가 프리뷰로 만든 페이지 원본을 가리키면 그 프리뷰 페이지로 바꾼다
const pageLinks = new Map();
for (const p of config.pages) {
    pageLinks.set(`/${p.src}`, `/_preview/${p.name}.html`);
    if (p.src === 'index.html') pageLinks.set('/', `/_preview/${p.name}.html`);
}

// 기능: 관리자 전용 모듈 이름 규칙 (preview.config.json adminOnly, * = 아무 글자)
// 이유: 카페24는 운영자 로그인 때만 이 모듈을 출력한다. 프리뷰는 모두 보여 줘서 방문자 화면과 달라 보였다
const ADMIN_ONLY = (config.adminOnly || []).map((p) =>
    new RegExp(`^${p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`, 'i'));
const isAdminOnly = (name) => ADMIN_ONLY.some((re) => re.test(name));

function processTag(tag, report) {
    // 기능: module 속성 → xans-* class (원본 class 앞에 붙인다)
    const mod = tag.match(/\smodule="([^"]+)"/);
    if (mod) {
        const add = moduleClasses(mod[1]).join(' ');
        if (/\sclass="/.test(tag)) tag = tag.replace(/\sclass="/, ` class="${add} `);
        else tag = tag.replace(/^<([a-zA-Z0-9]+)/, `<$1 class="${add}"`);
        report.modules++;
        // 기능: 관리자 전용 모듈 표시 (숨김·보기는 finish()에서 넣는 CSS·토글이 맡는다)
        // 이유: 요소를 지우지 않고 속성만 붙인다. 숨겨도 DOM은 남아 스킨 JS가 실제와 같은 요소를 찾는다
        if (isAdminOnly(mod[1])) {
            tag = tag.replace(/^<([a-zA-Z0-9]+)/, `<$1 data-preview-admin="${mod[1]}"`);
            report.admin++;
        }
    }
    // 기능: 속성 값 안의 변수 → 속성별 값
    tag = tag.replace(/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(\s*=\s*)("[^"]*"|'[^']*')/g, (whole, attr, eq, quoted) => {
        if (!quoted.includes('{$')) return whole;
        report.vars++;
        return attr + eq + quoted.replace(VAR, (m, name) => attrValue(attr, name));
    });
    // 기능: 속성 밖에 놓인 변수 (예: <option {$selected}>) → 비움
    tag = tag.replace(VAR, () => { report.vars++; return ''; });
    // 기능: 링크가 프리뷰로 만든 페이지 원본을 가리키면 그 프리뷰 페이지로 바꾼다
    // 이유: 변수 치환 뒤에 한다. href="/product/list.html{$param}"도 /product/list.html#none이 된 뒤 바뀐다
    return tag.replace(/(\shref=")([^"]+)(")/, (whole, a, href, b) => {
        const path = href.split(/[?#]/)[0];
        return pageLinks.has(path) ? `${a}${pageLinks.get(path)}${b}` : whole;
    });
}

function fillTemplate(html, report) {
    // 이유: 주석·script·style·태그·글자를 나눠서 위치에 맞게 바꾼다
    //       script 안은 문법이 깨지지 않게 0, style 안은 빈 값 (글자 샘플이 들어가면 CSS가 깨진다)
    const TOKEN = /(<!--[\s\S]*?-->)|(<(script|style)\b[^>]*>[\s\S]*?<\/\3>)|(<[a-zA-Z/!][^>]*>)/gi;
    let out = '';
    let last = 0;
    for (const m of html.matchAll(TOKEN)) {
        out += fillText(html.slice(last, m.index), report);
        if (m[1]) out += m[1];
        else if (m[2]) {
            const tagName = m[3].toLowerCase();
            const open = m[2].match(/^<[^>]*>/)[0];
            const close = `</${m[2].slice(-(tagName.length + 1), -1)}>`;
            const body = m[2].slice(open.length, -close.length);
            const value = tagName === 'script' ? sample.script : '';
            out += processTag(open, report) + body.replace(VAR, () => { report.vars++; return value; }) + close;
        } else out += processTag(m[4], report);
        last = m.index + m[0].length;
    }
    return out + fillText(html.slice(last), report);
}

function fillText(text, report) {
    return text.replace(VAR, (m, name) => {
        report.vars++;
        return textValue(name, report);
    });
}

// ----------------------------------------------------------------
// 6) 페이지 마무리: 안내 주석, jQuery, 상태 토글
// ----------------------------------------------------------------

// 기능: 상태 토글 — 카페24가 상태에 따라 출력하는 영역을 프리뷰에서 숨기거나 보인다
// 이유: 프리뷰는 모든 상태를 한꺼번에 보여 준다. 방문자 화면에 가깝게 보려면 숨기고, 디자인을 확인할 때는 켠다.
//       <html data-preview-show="admin …">에 켜진 상태 이름을 둔다. 지금은 관리자 전용(admin)만 있다.
//       뒤에 로그인 전/후 같은 상태를 더할 때 PREVIEW_STATES에 항목을 늘린다
const PREVIEW_STATES = [
    { key: 'admin', label: '관리자 전용 영역', attr: 'data-preview-admin', count: (r) => r.admin },
];
const STATE_STORE = 'cafe24-preview:show';   // localStorage 키 (모든 프리뷰 페이지가 같은 값을 쓴다)

// 기능: <head>에 넣는 CSS + 처음 상태 적용
// 라벨은 영역 바깥 위(bottom: 100%)에 둔다. 안쪽에 두면 좁은 화면에서 버튼을 가렸다
// 이유: 본문을 그리기 전에 상태를 정해야 숨긴 영역이 잠깐 보였다 사라지지 않는다.
//       localStorage는 막힌 환경(시크릿 창 등)에서 오류가 나므로 try로 감싼다. ?preview-show=admin 으로도 켤 수 있다
function stateHead(states) {
    const css = states.map(({ key, attr }) => `
html:not([data-preview-show~="${key}"]) [${attr}] { display: none !important; }
html[data-preview-show~="${key}"] [${attr}] { outline: 2px dashed #E65100; outline-offset: -2px; position: relative; }
html[data-preview-show~="${key}"] [${attr}]::after { content: "${states.find((s) => s.key === key).label} · " attr(${attr}); position: absolute; bottom: 100%; right: 0; z-index: 2147483646; padding: 2px 6px; font: 11px/1.4 sans-serif; color: #fff; background: #E65100; pointer-events: none; }`).join('');
    return `
<!-- preview: 상태 토글 (프리뷰 전용, 원본에 없음). !important 이유: 스킨 CSS의 display 지정보다 항상 이겨야 한다 -->
<style data-preview>${css}
.preview-bar { position: fixed; left: 12px; bottom: 12px; z-index: 2147483647; display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border: 1px solid #ccc; border-radius: 8px; font: 12px/1.4 -apple-system, "Malgun Gothic", sans-serif; color: #212121; background: rgba(255,255,255,.95); box-shadow: 0 2px 8px rgba(0,0,0,.15); }
.preview-bar label { display: flex; align-items: center; gap: 6px; margin: 0; cursor: pointer; }
.preview-bar input { width: auto; height: auto; margin: 0; appearance: auto; -webkit-appearance: auto; }
</style>
<script data-preview>
(function () {
    var show = [];
    try { show = (localStorage.getItem('${STATE_STORE}') || '').split(' ').filter(Boolean); } catch (e) {}
    var q = new URLSearchParams(location.search).get('preview-show');
    if (q) show = q.split(',');
    document.documentElement.setAttribute('data-preview-show', show.join(' '));
})();
</script>`;
}

// 기능: </body> 앞에 넣는 토글 (체크박스). 그 페이지에 해당 영역이 있을 때만 줄을 만든다
function stateBar(states, report) {
    const rows = states.filter((s) => s.count(report) > 0);
    if (!rows.length) return '';
    const items = rows.map((s) => `<label><input type="checkbox" data-preview-toggle="${s.key}"> ${s.label} 보기 (${s.count(report)})</label>`).join('');
    return `
<!-- preview: 상태 토글 바 (프리뷰 전용, 원본에 없음) -->
<div class="preview-bar" data-preview>${items}</div>
<script data-preview>
(function () {
    var root = document.documentElement;
    var current = function () { return (root.getAttribute('data-preview-show') || '').split(' ').filter(Boolean); };
    document.querySelectorAll('[data-preview-toggle]').forEach(function (box) {
        var key = box.getAttribute('data-preview-toggle');
        box.checked = current().indexOf(key) > -1;
        box.addEventListener('change', function () {
            var show = current().filter(function (k) { return k !== key; });
            if (box.checked) show.push(key);
            root.setAttribute('data-preview-show', show.join(' '));
            try { localStorage.setItem('${STATE_STORE}', show.join(' ')); } catch (e) {}
        });
    });
})();
</script>
`;
}

function finish(html, page, report) {
    const notice = `<!-- PREVIEW (자동 생성 — npm run preview). 원본: ${SKIN_REL}/${page.src}, 레이아웃: ${report.layout}.
     디자인 확인용이다. 카페24 모듈·변수는 샘플로 채웠고 카페24 기능은 동작하지 않는다 (docs/preview.md) -->\n`;
    html = html.replace(/^(\s*<!doctype[^>]*>\s*)?/i, (m) => (m || '<!DOCTYPE html>\n') + notice);
    // 기능: 상태 토글 (CSS·초기 상태는 head 맨 앞, 토글 바는 body 끝)
    // 이유: 함수형 replace를 쓴다. 문자열 replace는 넣는 코드 안의 $&, $' 등을 특수 패턴으로 해석한다
    const head = stateHead(PREVIEW_STATES);
    html = html.replace(/<head[^>]*>/i, (m) => m + head);
    const bar = stateBar(PREVIEW_STATES, report);
    if (bar) {
        const at = html.toLowerCase().lastIndexOf('</body>');
        html = at > -1 ? html.slice(0, at) + bar + html.slice(at) : html + bar;
    }
    const hasJquery = /<script[^>]+jquery[^>]*><\/script>/i.test(html);
    if (JQUERY && !hasJquery) {
        html = html.replace(/<head[^>]*>/i, (m) => `${m}\n<!-- preview: 카페24가 자동으로 넣는 jQuery 대신 (버전 [확인 필요]) -->\n<script src="${JQUERY}"></script>`);
        report.notes.push('jQuery를 CDN에서 넣음 (카페24 자동 삽입 대체)');
    }
    return html;
}

// ----------------------------------------------------------------
// 7) 리소스 검사
// ----------------------------------------------------------------
const isExternal = (u) => /^(https?:)?\/\//i.test(u);
const isSkip = (u) => !u || /^(data:|#|javascript:|about:|mailto:|tel:)/i.test(u) || u.includes('{$');
// 기능: 카페24 서버에서만 생기는 경로 (스킨 파일이 아니라 로컬에 있을 수 없다)
const CAFE24_SERVER = /^\/(ind-script|web\/upload|exec|api|_wg|ec_)/;

const missing = new Map();   // 경로 → Set(어디서)
const external = new Map();
const checkedCss = new Set();

function note(map, key, from) {
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(from);
}

function checkUrl(url, baseDir, from) {
    url = url.trim().replace(/^['"]|['"]$/g, '');
    if (isSkip(url)) return null;
    if (isExternal(url)) { note(external, url.replace(/^\/\//, 'https://').split('?')[0], from); return null; }
    const clean = url.split(/[?#]/)[0];
    const abs = clean.startsWith('/') ? clean : posix.join(baseDir, clean);
    if (!existsSync(join(OUT, abs))) note(missing, abs, from);
    return abs;
}

function checkCss(abs, from) {
    if (checkedCss.has(abs)) return;
    checkedCss.add(abs);
    const file = join(OUT, abs);
    if (!existsSync(file)) return;
    const css = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const dir = posix.dirname(abs);
    for (const m of css.matchAll(/@import\s+(?:url\()?\s*['"]?([^'")\s;]+)/g)) {
        const next = checkUrl(m[1], dir, abs);
        if (next) checkCss(next, abs);
    }
    for (const m of css.matchAll(/url\(\s*([^)]+)\)/g)) checkUrl(m[1], dir, abs);
}

function checkPage(html, name) {
    const from = `_preview/${name}.html`;
    for (const m of html.matchAll(/<link\b[^>]*\bhref="([^"]+)"[^>]*>/gi)) {
        if (!/stylesheet/i.test(m[0])) continue;
        const abs = checkUrl(m[1], '/', from);
        if (abs) checkCss(abs, from);
    }
    for (const m of html.matchAll(/<(?:script|img|source|video|audio|iframe)\b[^>]*\bsrc="([^"]+)"/gi)) checkUrl(m[1], '/', from);
    for (const m of html.matchAll(/url\(\s*([^)]+)\)/gi)) checkUrl(m[1], '/', from);
}

// ----------------------------------------------------------------
// 실행
// ----------------------------------------------------------------
const results = [];
for (const page of PAGES) {
    const report = { layout: '', assets: new Set(), missing: new Set(), notes: [], vars: 0, forms: 0, modules: 0, admin: 0, fallback: new Map() };
    let html = combine(page, report);
    html = convertDirectives(html, report);
    html = fillTemplate(html, report);
    html = finish(html, page, report);
    writeFileSync(join(OUT, '_preview', `${page.name}.html`), html);
    checkPage(html, page.name);
    for (const m of report.missing) note(missing, m, `_preview/${page.name}.html`);
    results.push({ page, report });
}

// ----------------------------------------------------------------
// 보고서 (preview/index.html + preview/_preview/report.md)
// ----------------------------------------------------------------
const kind = (p) => /\.(woff2?|ttf|otf|eot)$/i.test(p) ? '폰트'
    : /\.(png|jpe?g|gif|svg|webp|ico)$/i.test(p) ? '이미지'
    : /\.css$/i.test(p) ? 'CSS' : /\.js$/i.test(p) ? 'JS' : /^@import/.test(p) ? 'HTML 조각' : '기타';
const missingRows = [...missing].map(([path, from]) => ({
    path, kind: kind(path), server: CAFE24_SERVER.test(path), from: [...from].slice(0, 3).join(', ') + (from.size > 3 ? ` 외 ${from.size - 3}` : '')
})).sort((a, b) => Number(a.server) - Number(b.server) || a.kind.localeCompare(b.kind) || a.path.localeCompare(b.path));

const skinHashAfter = hashTree(SKIN);
const unchanged = skinHashBefore === skinHashAfter;

const md = [];
md.push(`# 프리뷰 보고서`, '', `- 스킨: \`${SKIN_REL}\``, `- 생성: ${new Date().toISOString()}`,
    `- 복사한 리소스: ${copied}개 (.html 제외)`, `- jQuery: ${JQUERY || '넣지 않음'}`,
    `- 원본 스킨 변경: ${unchanged ? '없음 (생성 전후 해시 같음)' : '**있음 — 확인 필요**'}`, '',
    '## 페이지', '', '| 페이지 | 원본 | 레이아웃 | 모듈 | 관리자 전용 (기본 숨김) | 변수 | form 자리 | 규칙에 없어 "샘플"로 채운 변수 |', '|---|---|---|---|---|---|---|---|');
for (const { page, report } of results) {
    const top = [...report.fallback].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n, c]) => `${n}(${c})`).join(', ');
    md.push(`| [${page.title}](${page.name}.html) | \`${page.src}\` | \`${report.layout}\` | ${report.modules} | ${report.admin || '-'} | ${report.vars} | ${report.forms} | ${top || '-'} |`);
}
md.push('', `## 없는 리소스 (${missingRows.length}개)`, '', '| 종류 | 경로 | 카페24 서버 경로 | 참조한 곳 |', '|---|---|---|---|');
for (const r of missingRows) md.push(`| ${r.kind} | \`${r.path}\` | ${r.server ? '예' : ''} | ${r.from} |`);
md.push('', `## 외부 리소스 (${external.size}개, 인터넷 연결 필요)`, '');
for (const [url] of [...external].sort()) md.push(`- ${url}`);
const notes = [...new Set(results.flatMap(({ report }) => report.notes))];
if (notes.length) md.push('', '## 참고', '', ...notes.map((n) => `- ${n}`));
writeFileSync(join(OUT, '_preview', 'report.md'), md.join('\n') + '\n');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const index = `<!DOCTYPE html>
<!-- 자동 생성 (npm run preview) — 프리뷰 목록과 리소스 보고서 -->
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview · ${esc(SKIN_REL)}</title>
<style>
body{margin:0;padding:24px;font:14px/1.6 -apple-system,"Malgun Gothic",sans-serif;color:#212121;background:#fafafa}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px}
.meta{color:#666;margin-bottom:16px}.warn{color:#c62828;font-weight:700}
ul.pages{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;padding:0;list-style:none}
ul.pages a{display:block;padding:12px 14px;border:1px solid #ddd;border-radius:8px;background:#fff;color:inherit;text-decoration:none}
ul.pages a:hover{border-color:#999}ul.pages small{display:block;color:#888}
table{border-collapse:collapse;width:100%;background:#fff}th,td{border:1px solid #e5e5e5;padding:6px 8px;text-align:left;vertical-align:top;font-size:13px}
th{background:#f2f2f2}code{font-size:12px}
</style></head><body>
<h1>로컬 프리뷰 — ${esc(SKIN_REL)}</h1>
<div class="meta">디자인 확인용 정적 HTML입니다. 카페24 기능(로그인·장바구니·옵션·결제·게시판 등)은 동작하지 않습니다. 관리자 전용 영역은 기본으로 숨기며, 페이지 왼쪽 아래 토글로 볼 수 있습니다. 생성 ${esc(new Date().toLocaleString('ko-KR'))} · 원본 변경 <span class="${unchanged ? '' : 'warn'}">${unchanged ? '없음' : '있음'}</span></div>
<ul class="pages">${results.map(({ page }) => `<li><a href="/_preview/${page.name}.html">${esc(page.title)}<small>${esc(page.src)}</small></a></li>`).join('')}</ul>
<h2>없는 리소스 ${missingRows.length}개</h2>
<table><tr><th>종류</th><th>경로</th><th>카페24 서버 경로</th><th>참조한 곳</th></tr>
${missingRows.map((r) => `<tr><td>${r.kind}</td><td><code>${esc(r.path)}</code></td><td>${r.server ? '예' : ''}</td><td>${esc(r.from)}</td></tr>`).join('\n')}
</table>
<h2>외부 리소스 ${external.size}개 (인터넷 연결 필요)</h2>
<ul>${[...external.keys()].sort().map((u) => `<li><code>${esc(u)}</code></li>`).join('')}</ul>
<p>자세한 내용: <a href="/_preview/report.md">_preview/report.md</a> · 프리뷰와 원본의 차이: 저장소 docs/preview.md</p>
</body></html>
`;
writeFileSync(join(OUT, 'index.html'), index);

// ----------------------------------------------------------------
// 콘솔 요약
// ----------------------------------------------------------------
console.log(`프리뷰 생성: ${toPosix(relative(REPO, OUT))}/ (스킨 ${SKIN_REL}, 리소스 ${copied}개 복사)`);
for (const { page, report } of results) {
    console.log(`  ${page.name.padEnd(15)} ${page.src.padEnd(22)} 모듈 ${String(report.modules).padStart(3)} (관리자 전용 ${report.admin}) · 변수 ${String(report.vars).padStart(4)} · form ${String(report.forms).padStart(3)} · 샘플 대체 ${report.fallback.size}종`);
}
console.log(`없는 리소스 ${missingRows.length}개 (카페24 서버 경로 ${missingRows.filter((r) => r.server).length}개) · 외부 리소스 ${external.size}개 → preview/index.html, preview/_preview/report.md`);
console.log(`원본 스킨 변경: ${unchanged ? '없음' : '있음 — 확인 필요'}`);
console.log('보기: Live Server 루트를 /preview로 두고 preview/index.html (또는 npm run preview:serve)');
if (!unchanged) process.exit(2);
