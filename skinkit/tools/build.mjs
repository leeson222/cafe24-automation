#!/usr/bin/env node
/* ==========================================================================
   SkinKit · tools/build.mjs
   기능: skinkit.config.json대로 원본 CSS·JS를 dist/에 기능별·페이지별 파일로 내보내고 검사한다
         - dist/ 폴더 구조는 원본과 같다 (tokens/, base/, components/, cafe24/, pages/, features/, adapters/)
         - dist/head.html: 공통 파일 @css/@js 선언 목록. 레이아웃 <head>에서 @import 한 줄로 불러온다
         - examples/demo.html의 파일 목록도 설정에서 다시 만든다
   실행: node skinkit/tools/build.mjs          (빌드 + 검사)
         node skinkit/tools/build.mjs --check  (검사만, 파일을 쓰지 않는다)
   이유
     - 기능별·페이지별로 나눠 필요한 페이지에서만 불러온다 (페이지 전용 CSS는 페이지 파일 상단에서)
     - 공통 선언 목록을 head.html 한 곳에 두어 layout.html·popup.html이 어긋나지 않게 한다
     - 미디어쿼리에는 var()를 쓸 수 없다. 원본에는 "767px /*bp.small*\/"처럼 숫자 뒤에 표시를 달고,
       빌드가 설정값으로 바꾼다. 원본도 그대로 유효한 CSS다
     - 토큰 이름 오타는 브라우저에서 조용히 무시된다. 빌드에서 잡는다
   의존: Node 20 이상 (외부 패키지 없음)
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const CHECK_ONLY = process.argv.includes('--check');

const config = JSON.parse(readFileSync(join(ROOT, 'skinkit.config.json'), 'utf8'));
const bp = config.breakpoint;
const PUBLIC = config.publicPath.replace(/\/$/, '');

const errors = [];
const warnings = [];
const read = (file) => readFileSync(join(ROOT, file), 'utf8');

// --------------------------------------------------------------------------
// 기능: 설정에서 파일 목록을 모은다 (같은 파일이 두 번 나오면 오류)
// --------------------------------------------------------------------------
const groups = [
    ['common', config.common],
    ...Object.entries(config.pages).map(([name, g]) => [`pages.${name}`, g]),
    ...Object.entries(config.features).map(([name, g]) => [`features.${name}`, g]),
    ['extra', config.extra || {}]
];
const cssFiles = [];
const jsFiles = [];
const owner = {};
for (const [name, g] of groups) {
    for (const f of g.css || []) {
        if (owner[f]) errors.push(`${f}: ${owner[f]}와 ${name} 두 곳에 있음`);
        owner[f] = name;
        cssFiles.push(f);
    }
    for (const f of g.js || []) {
        if (owner[f]) errors.push(`${f}: ${owner[f]}와 ${name} 두 곳에 있음`);
        owner[f] = name;
        jsFiles.push(f);
    }
}
for (const f of [...cssFiles, ...jsFiles]) {
    if (!existsSync(join(ROOT, f))) errors.push(`설정에 있지만 파일이 없음: ${f}`);
}

// --------------------------------------------------------------------------
// 기능: "숫자(px) /*bp.이름*/" 표시를 설정값으로 바꾼다
//       "/*bp.layout+1*/"은 설정값 + 1 (PC 전용 min-width가 max-width와 겹치지 않게)
// --------------------------------------------------------------------------
function applyBreakpoints(css, file) {
    return css.replace(/(\d+)(px)?(\s*\/\*bp\.(\w+)(\+1)?\*\/)/g, (whole, _n, unit, marker, name, plusOne) => {
        if (!(name in bp)) {
            errors.push(`${file}: 설정에 없는 브레이크포인트 bp.${name}`);
            return whole;
        }
        return `${bp[name] + (plusOne ? 1 : 0)}${unit || ''}${marker}`;
    });
}

// 기능: 주석을 지운 본문 (검사용)
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

// --------------------------------------------------------------------------
// 검사
// --------------------------------------------------------------------------
function checkSyntax(css, file) {
    const open = (css.match(/\/\*/g) || []).length;
    const close = (css.match(/\*\//g) || []).length;
    if (open !== close) errors.push(`${file}: 주석 /* */ 짝이 맞지 않음 (${open}/${close})`);

    let depth = 0;
    for (const ch of stripComments(css)) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
        if (depth < 0) break;
    }
    if (depth !== 0) errors.push(`${file}: 중괄호 { } 짝이 맞지 않음`);
}

function checkValues(css, file) {
    const body = stripComments(css);

    // 기능: 쇼핑몰 CDN 경로 금지
    // 이유: novadeal은 etlandmall CDN 이미지를 공통 CSS에 넣었다. 다른 쇼핑몰에서 깨진다
    if (/ecimg\.cafe24img\.com|etlandmall|insangaebiz/.test(body)) {
        errors.push(`${file}: 쇼핑몰 CDN 이미지 경로가 있음`);
    }

    // 기능: url()은 data URI만 허용
    // 이유: 카페24가 CSS를 합쳐서 내보낼 때 상대경로가 어떻게 해석되는지 확인하지 못했다
    for (const m of body.matchAll(/url\(\s*["']?([^"')]+)/g)) {
        if (!m[1].startsWith('data:')) errors.push(`${file}: data URI가 아닌 url() — ${m[1]}`);
    }

    // 기능: 토큰 밖 하드코딩 색 경고 (components/, cafe24/, pages/, features/)
    // 이유: 컴포넌트 CSS의 색은 토큰을 거쳐야 테마로 바꿀 수 있다
    if (/^(components|cafe24|pages|features)\//.test(file)) {
        const hex = body.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
        const real = hex.filter((h) => !/^#(wrap|popup|contents|mCafe24Order)/.test(h));
        if (real.length) warnings.push(`${file}: 토큰을 거치지 않은 색 ${[...new Set(real)].join(', ')}`);
    }

    // 기능: 이유 주석 없는 !important 경고
    // 이유: !important는 카페24 inline style을 이길 때만 쓰고 이유를 남긴다 (ui-conventions 6-3)
    //       같은 규칙 블록({ 줄부터) 또는 바로 위 주석에 "이유"가 있으면 통과
    const lines = css.split('\n');
    lines.forEach((line, i) => {
        if (!line.includes('!important') || line.includes('이유') || /^\s*(\/\*|\*)/.test(line)) return;
        let start = i;
        while (start > 0 && !lines[start].includes('{')) start--;
        const context = lines.slice(Math.max(0, start - 3), i).join('\n');
        if (!context.includes('이유')) warnings.push(`${file}:${i + 1}: 이유 주석 없는 !important`);
    });
}

// --------------------------------------------------------------------------
// 기능: 쓰는 토큰이 모두 정의되어 있는지, 쓰지 않는 component 토큰이 있는지
// 이유: var(--sk-오타)는 브라우저가 조용히 무시해서 화면에서만 드러난다
// --------------------------------------------------------------------------
function checkTokens(sources) {
    const defined = new Set();
    const componentTokens = new Set();
    const used = new Set();
    for (const { file, css } of sources) {
        const body = stripComments(css);
        for (const m of body.matchAll(/(--sk-[\w-]+)\s*:/g)) {
            defined.add(m[1]);
            if (file === 'tokens/components.css') componentTokens.add(m[1]);
        }
        for (const m of body.matchAll(/var\(\s*(--sk-[\w-]+)/g)) used.add(m[1]);
    }
    for (const name of used) {
        if (!defined.has(name)) errors.push(`정의되지 않은 토큰: ${name}`);
    }
    // 이유: primitives·semantic은 앞으로 쓸 단계(z-index, radius 등)까지 미리 둔 팔레트라 검사하지 않는다
    const unused = [...componentTokens].filter((name) => !used.has(name));
    if (unused.length) warnings.push(`쓰지 않는 component 토큰 ${unused.length}개: ${unused.join(', ')}`);
    return defined;
}

// --------------------------------------------------------------------------
// 실행
// --------------------------------------------------------------------------
const banner = (file) =>
    `/*! SkinKit ${file} — 자동 생성. 직접 고치지 말고 skinkit/${file}을 고친 뒤 다시 빌드한다 (bp layout ${bp.layout} / small ${bp.small}) */\n`;

const cssSources = cssFiles.filter((f) => existsSync(join(ROOT, f))).map((file) => {
    const raw = read(file);
    checkSyntax(raw, file);
    checkValues(raw, file);
    return { file, css: applyBreakpoints(raw, file) };
});
const defined = checkTokens(cssSources);

// 기능: 테마 예시가 없는 토큰을 덮어쓰지 않는지
const themeFile = 'themes/theme.example.css';
const theme = read(themeFile);
checkSyntax(theme, themeFile);
for (const m of stripComments(theme).matchAll(/(--sk-[\w-]+)\s*:/g)) {
    if (!defined.has(m[1])) errors.push(`${themeFile}: SkinKit에 없는 토큰을 덮어씀 ${m[1]}`);
}

const jsSources = jsFiles.filter((f) => existsSync(join(ROOT, f))).map((file) => ({ file, js: read(file) }));

// 기능: 공통 선언 목록 (dist/head.html)
// 주의: HTML 주석 안에 카페24 선언 문법(<!--@…-->)을 쓰지 않는다. 주석이 중간에 끝난다
function headHtml() {
    return [
        '<!-- SkinKit 공통 (자동 생성 — 직접 고치지 말고 skinkit.config.json의 common을 고친 뒤 다시 빌드한다)',
        '     기능: 모든 페이지에 필요한 SkinKit CSS·JS 선언',
        '     불러오기: layout.html, popup.html 등 레이아웃 head에서 이 파일을 @import 한다',
        '     순서: 카페24 기본 CSS 다음, 쇼핑몰 테마·쇼핑몰 CSS 앞 -->',
        ...config.common.css.map((f) => `<!--@css(${PUBLIC}/${f})-->`),
        ...config.common.js.map((f) => `<!--@js(${PUBLIC}/${f})-->`),
        ''
    ].join('\n');
}

// 기능: demo.html의 파일 목록을 설정에서 다시 만든다 (데모는 모든 페이지·기능을 켠다)
//       CSS는 head(SKINKIT:demo-css), JS는 body 끝(SKINKIT:demo-js)
// 이유: CSS를 body에서 늦게 불러오면 색 전환(transition) 도중에 검사가 값을 읽어 실패한다 (모바일 검사에서 확인)
function updateDemo() {
    const file = join(ROOT, 'examples/demo.html');
    let html = readFileSync(file, 'utf8');
    const all = groups.filter(([n]) => n !== 'extra');
    const blocks = {
        'demo-css': all.flatMap(([, g]) => g.css || []).map((f) => `<link rel="stylesheet" href="../dist/${f}">`),
        'demo-js': all.flatMap(([, g]) => g.js || []).map((f) => `<script src="../dist/${f}"></script>`)
    };
    for (const [name, lines] of Object.entries(blocks)) {
        const start = `<!--[SKINKIT:${name}]-->`;
        const end = `<!--[/SKINKIT:${name}]-->`;
        const from = html.indexOf(start);
        const to = html.indexOf(end);
        if (from < 0 || to < from) {
            warnings.push(`examples/demo.html: 표시(SKINKIT:${name})가 없어 갱신하지 않음`);
            continue;
        }
        html = html.slice(0, from) + [start, ...lines, end].join('\n') + html.slice(to + end.length);
    }
    writeFileSync(file, html);
}

if (!CHECK_ONLY && !errors.length) {
    // 이유: 이름이 바뀐 파일이 dist에 남지 않도록 매번 새로 만든다
    rmSync(DIST, { recursive: true, force: true });
    for (const { file, css } of cssSources) {
        mkdirSync(dirname(join(DIST, file)), { recursive: true });
        writeFileSync(join(DIST, file), banner(file) + css);
    }
    for (const { file, js } of jsSources) {
        mkdirSync(dirname(join(DIST, file)), { recursive: true });
        writeFileSync(join(DIST, file), banner(file) + js);
    }
    writeFileSync(join(DIST, 'head.html'), headHtml());
    updateDemo();
    const size = (list, key) => (list.reduce((n, s) => n + s[key].length, 0) / 1024).toFixed(1);
    console.log(`빌드 완료: dist/ CSS ${cssSources.length}개 (${size(cssSources, 'css')}KB), JS ${jsSources.length}개 (${size(jsSources, 'js')}KB), head.html`);
    console.log(`  공통 ${config.common.css.length + config.common.js.length}개 · 페이지 ${Object.keys(config.pages).join(', ')} · 선택 기능 ${Object.keys(config.features).join(', ')}`);
}

warnings.forEach((w) => console.warn(`경고  ${w}`));
errors.forEach((e) => console.error(`오류  ${e}`));
if (errors.length) {
    console.error(`\n오류 ${errors.length}건 — dist를 만들지 않았습니다 (${relative(process.cwd(), ROOT)})`);
    process.exit(1);
}
if (CHECK_ONLY) console.log(`검사 통과 (경고 ${warnings.length}건)`);
