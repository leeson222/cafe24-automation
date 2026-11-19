#!/usr/bin/env node
/* ==========================================================================
   SkinKit · tools/install.mjs
   기능: 카페24 스킨 폴더에 SkinKit을 설치·재설치·제거한다
         1) dist/를 <스킨>/skinkit/dist로 복사
         2) 레이아웃 <head>: 카페24 기본 CSS(ec-base-*) 다음에 공통(head.html) + 선택 기능 + 테마 블록
         3) 페이지 파일: @layout 다음 줄에 그 페이지 전용 CSS·JS 블록 (adapter는 불러오면 켜진다)
         4) 바뀐 파일 목록(FTP 업로드 목록)을 출력
   실행
     node skinkit/tools/install.mjs --skin <스킨 폴더> [옵션]
       --pages board,member,myshop,product | all | none   페이지 묶음 (기본: none)
       --features custom-select,inner                     선택 기능 (기본: 없음)
       --theme 몰폴더/theme.css                            테마 파일 (스킨 루트 기준. Git Bash에서는 앞에 / 를 붙이지 않는다)
       --layouts layout/basic/layout.html,…              레이아웃 (기본: layout.html, main.html, popup.html 중 있는 것)
       --dry-run                                          파일을 쓰지 않고 바뀔 내용만 출력
       --uninstall                                        SkinKit 블록을 모두 지운다 (skinkit/dist 파일은 남긴다)
   이유: 페이지 전용 파일을 페이지 수십 곳에 손으로 넣고 빼면 빠뜨리거나 중복된다.
         <!--[SKINKIT:…]--> 표시 사이만 다루므로 몇 번 실행해도 결과가 같다 (설치 = 지우고 다시 넣기)
   안전: 표시 밖의 내용은 바꾸지 않는다. 파일마다 원래 줄바꿈(CRLF/LF)을 유지한다
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync, statSync, cpSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(KIT, 'skinkit.config.json'), 'utf8'));
const PUBLIC = config.publicPath.replace(/\/$/, '');

// ----------------------------------------------------------------
// 인자
// ----------------------------------------------------------------
const args = process.argv.slice(2);
const opt = (name, fallback = '') => {
    const i = args.indexOf(`--${name}`);
    return i > -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);
const list = (value) => value.split(',').map((s) => s.trim()).filter(Boolean);

const SKIN = opt('skin') ? resolve(opt('skin')) : '';
const DRY = flag('dry-run');
const UNINSTALL = flag('uninstall');
const pageArg = opt('pages', 'none');
const PAGES = pageArg === 'all' ? Object.keys(config.pages) : pageArg === 'none' ? [] : list(pageArg);
const FEATURES = list(opt('features'));
// 기능: 테마 경로를 스킨 루트 기준 "/폴더/파일.css"로 맞춘다
// 이유: Git Bash는 "/"로 시작하는 인자를 C:/Program Files/Git/… 로 바꿔 버린다. 앞의 "/" 없이 써도 받는다
const RAW_THEME = opt('theme');
if (/^[A-Za-z]:[\\/]/.test(RAW_THEME)) {
    console.error('오류  --theme 경로가 Windows 경로로 바뀌었습니다 (Git Bash 자동 변환).');
    console.error('      앞의 / 없이 쓰세요: --theme onjangteo_custom/theme.css');
    process.exit(1);
}
const THEME = RAW_THEME ? '/' + RAW_THEME.replace(/^\/+/, '') : '';

function fail(message) {
    console.error(`오류  ${message}`);
    process.exit(1);
}

if (!SKIN || !existsSync(join(SKIN, 'layout', 'basic'))) fail('--skin에 카페24 스킨 폴더(layout/basic이 있는 폴더)를 지정하세요');
if (!UNINSTALL && !existsSync(join(KIT, 'dist', 'head.html'))) fail('skinkit/dist가 없습니다. 먼저 node skinkit/tools/build.mjs를 실행하세요');
for (const p of PAGES) if (!config.pages[p]) fail(`없는 페이지 묶음: ${p} (가능: ${Object.keys(config.pages).join(', ')})`);
for (const f of FEATURES) if (!config.features[f]) fail(`없는 선택 기능: ${f} (가능: ${Object.keys(config.features).join(', ')})`);
if (THEME && !existsSync(join(SKIN, THEME))) fail(`테마 파일이 스킨에 없습니다: ${THEME}`);

const LAYOUTS = (opt('layouts') ? list(opt('layouts')) : ['layout/basic/layout.html', 'layout/basic/main.html', 'layout/basic/popup.html'])
    .filter((f) => existsSync(join(SKIN, f)));

// ----------------------------------------------------------------
// 파일 도구
// ----------------------------------------------------------------
const toPosix = (p) => p.split(sep).join('/');

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
            if (name === 'skinkit' || name.startsWith('.')) continue;   // 이유: 설치한 dist 안은 다루지 않는다
            walk(full, out);
        } else if (name.endsWith('.html')) out.push(full);
    }
    return out;
}

// 기능: "board/**/*.html" 같은 대상을 정규식으로 바꾼다
function globToRegExp(glob) {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*\//g, '\u0000')
        .replace(/\*/g, '[^/]*')
        .replace(/\u0000/g, '(?:.*/)?');
    return new RegExp(`^${escaped}$`);
}

// 기능: 파일의 줄바꿈 형식을 지키면서 읽고 쓴다
function readText(file) {
    const raw = readFileSync(file, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    return { eol, lines: raw.split(/\r?\n/) };
}

// 기능: <!--[SKINKIT:종류…]--> ~ <!--[/SKINKIT:종류]--> 블록을 지운다
function removeBlocks(lines, kind) {
    const out = [];
    let skipping = false;
    let removed = 0;
    for (const line of lines) {
        if (!skipping && line.includes(`<!--[SKINKIT:${kind}`)) { skipping = true; removed++; continue; }
        if (skipping) {
            if (line.includes(`<!--[/SKINKIT:${kind}]-->`)) skipping = false;
            continue;
        }
        out.push(line);
    }
    if (skipping) fail(`닫는 표시가 없는 SkinKit 블록이 있습니다 (${kind}) — 파일을 직접 확인하세요`);
    return { lines: out, removed };
}

const indentOf = (line) => (line.match(/^\s*/) || [''])[0];
const declare = (files, indent) => [
    ...(files.css || []).map((f) => `${indent}<!--@css(${PUBLIC}/${f})-->`),
    ...(files.js || []).map((f) => `${indent}<!--@js(${PUBLIC}/${f})-->`)
];

// ----------------------------------------------------------------
// 1) 레이아웃 <head>
// ----------------------------------------------------------------
function headBlock(indent) {
    const lines = [
        `${indent}<!--[SKINKIT:head]-->`,
        `${indent}<!-- SkinKit: tools/install.mjs가 넣은 줄 (직접 고치지 말고 다시 설치한다). 공통 → 선택 기능 → 쇼핑몰 테마 순서 -->`,
        `${indent}<!--@import(${PUBLIC}/head.html)-->`
    ];
    for (const f of FEATURES) lines.push(...declare(config.features[f], indent));
    if (THEME) lines.push(`${indent}<!--@css(${THEME})-->`);
    lines.push(`${indent}<!--[/SKINKIT:head]-->`);
    return lines;
}

function processLayout(rel) {
    const file = join(SKIN, rel);
    const { eol, lines: original } = readText(file);
    const legacy = original.findIndex((l) => /\/skinkit\/dist\/skinkit\.(css|js)/.test(l) && !l.includes('[SKINKIT:'));
    if (legacy > -1) {
        fail(`${rel}:${legacy + 1} 예전 방식(skinkit.css 한 파일) 선언이 있습니다. 그 블록을 지운 뒤 다시 실행하세요`);
    }
    let { lines } = removeBlocks(original, 'head');
    if (!UNINSTALL) {
        // 기능: <head> 안의 카페24 기본 CSS(ec-base-*) 마지막 줄 다음에 넣는다. 없으면 </head> 앞
        // 이유: 카페24 layout.html은 <body> 안 해외배송 모듈(Layout_multishopShipping)에서도
        //       ec-base-layer.css를 선언한다. 파일 전체에서 찾으면 body 안에 들어간다 (base 스킨 시험에서 확인)
        const headEnd = lines.findIndex((l) => /<\/head>/i.test(l));
        if (headEnd < 0) fail(`${rel}: </head>를 찾지 못했습니다`);
        let anchor = -1;
        lines.forEach((l, i) => { if (i < headEnd && /@css\(\/layout\/basic\/css\/ec-base-/.test(l)) anchor = i; });
        let at;
        let indent;
        if (anchor > -1) {
            at = anchor + 1;
            indent = indentOf(lines[anchor]);
        } else {
            at = headEnd;
            indent = '    ';
        }
        lines = [...lines.slice(0, at), ...headBlock(indent), ...lines.slice(at)];
    }
    return save(file, original, lines, eol);
}

// ----------------------------------------------------------------
// 2) 페이지 파일
// ----------------------------------------------------------------
function pageBlock(name) {
    return [`<!--[SKINKIT:page ${name}]-->`, ...declare(config.pages[name], ''), '<!--[/SKINKIT:page]-->'];
}

function processPages() {
    const all = walk(SKIN);
    const wanted = new Map();   // 파일 → 묶음 이름
    const skipped = [];
    for (const name of PAGES) {
        const patterns = config.pages[name].targets.map(globToRegExp);
        for (const full of all) {
            const rel = toPosix(relative(SKIN, full));
            if (!patterns.some((re) => re.test(rel))) continue;
            if (!readFileSync(full, 'utf8').includes('<!--@layout(')) { skipped.push(rel); continue; }   // 이유: 조각 파일에 넣으면 불러오는 쪽에서 중복된다
            if (wanted.has(full)) fail(`${rel}이 ${wanted.get(full)}와 ${name} 두 묶음에 걸립니다`);
            wanted.set(full, name);
        }
        for (const t of config.pages[name].targets) {
            if (!t.includes('*') && !existsSync(join(SKIN, t))) console.warn(`경고  ${name}: 스킨에 없는 파일 ${t}`);
        }
    }
    const changed = [];
    for (const full of all) {
        const { eol, lines: original } = readText(full);
        let { lines } = removeBlocks(original, 'page');
        const name = wanted.get(full);
        if (name && !UNINSTALL) {
            const at = lines.findIndex((l) => l.includes('<!--@layout('));
            lines = [...lines.slice(0, at + 1), ...pageBlock(name), ...lines.slice(at + 1)];
        }
        if (save(full, original, lines, eol)) changed.push(toPosix(relative(SKIN, full)));
    }
    return { changed, skipped };
}

// ----------------------------------------------------------------
// 저장 (바뀐 경우만)
// ----------------------------------------------------------------
function save(file, before, after, eol) {
    if (before.join('\n') === after.join('\n')) return false;
    if (!DRY) writeFileSync(file, after.join(eol));
    return true;
}

// ----------------------------------------------------------------
// 실행
// ----------------------------------------------------------------
console.log(`${UNINSTALL ? '제거' : '설치'}${DRY ? ' (미리보기 — 파일을 쓰지 않음)' : ''}: ${SKIN}`);
if (!UNINSTALL) {
    console.log(`  페이지: ${PAGES.join(', ') || '없음'} · 선택 기능: ${FEATURES.join(', ') || '없음'} · 테마: ${THEME || '없음'}`);
}

const upload = [];
if (!UNINSTALL) {
    const target = join(SKIN, 'skinkit', 'dist');
    if (!DRY) {
        // 이유: 이름이 바뀐 예전 파일(skinkit.css 등)이 남지 않도록 지우고 복사한다
        rmSync(target, { recursive: true, force: true });
        mkdirSync(target, { recursive: true });
        cpSync(join(KIT, 'dist'), target, { recursive: true });
    }
    // 기능: dist 안 모든 파일을 업로드 목록에 넣는다 (Node 20 이상: readdirSync recursive)
    for (const p of readdirSync(join(KIT, 'dist'), { recursive: true })) {
        if (statSync(join(KIT, 'dist', p)).isFile()) upload.push(`skinkit/dist/${toPosix(p)}`);
    }
}

const layoutChanged = LAYOUTS.filter(processLayout);
const { changed: pageChanged, skipped } = processPages();
upload.push(...layoutChanged, ...pageChanged);
if (THEME && !UNINSTALL) upload.push(THEME.replace(/^\//, '') + '  (테마 — 내용을 바꿨다면)');

console.log(`\n레이아웃 ${layoutChanged.length}개 변경: ${layoutChanged.join(', ') || '없음'}`);
console.log(`페이지 ${pageChanged.length}개 변경${pageChanged.length ? ':' : ''}`);
pageChanged.forEach((f) => console.log(`  ${f}`));
if (skipped.length) console.log(`@layout이 없어 건너뛴 조각 파일 ${skipped.length}개: ${skipped.join(', ')}`);
if (!UNINSTALL) {
    console.log(`\nFTP 업로드 목록 (${[...new Set(upload)].length}개, 스킨 루트 기준)`);
    [...new Set(upload)].sort().forEach((f) => console.log(`  ${f}`));
    console.log('\n순서: skinkit/dist와 테마를 먼저 올리고, 레이아웃·페이지 파일을 마지막에 올린다');
} else {
    console.log('\nskinkit/dist 파일은 남겼습니다. 필요 없으면 직접 지우세요');
}
