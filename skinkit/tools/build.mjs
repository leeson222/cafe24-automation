#!/usr/bin/env node
/* ==========================================================================
   SkinKit · tools/build.mjs
   기능: skinkit.config.json 순서대로 CSS·JS를 합쳐 dist/skinkit.css, dist/skinkit.js를 만들고 검사한다
   실행: node skinkit/tools/build.mjs          (빌드 + 검사)
         node skinkit/tools/build.mjs --check  (검사만, 파일을 쓰지 않는다)
   이유
     - 카페24 @css는 파일을 하나씩 선언해야 한다. layout.html과 popup.html이 목록을 따로 관리하면
       어긋난다(novadeal: popup에만 option.css가 있었다). 합친 파일 한 줄로 두 레이아웃을 맞춘다
     - 미디어쿼리에는 var()를 쓸 수 없다. 원본에는 "767px /*bp.small*\/"처럼 숫자 뒤에 표시를 달고,
       빌드가 설정값으로 바꾼다. 원본도 그대로 유효한 CSS다
     - 토큰 이름 오타는 브라우저에서 조용히 무시된다. 빌드에서 잡는다
   의존: Node 18 이상 (외부 패키지 없음)
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK_ONLY = process.argv.includes('--check');

const config = JSON.parse(readFileSync(join(ROOT, 'skinkit.config.json'), 'utf8'));
const bp = config.breakpoint;

const errors = [];
const warnings = [];
const read = (file) => readFileSync(join(ROOT, file), 'utf8');

// --------------------------------------------------------------------------
// 기능: "숫자(px) /*bp.이름*/" 표시를 설정값으로 바꾼다
// 이유: 원본 숫자는 기본값일 뿐이고, 실제 값은 설정 파일 하나에서 정한다
// --------------------------------------------------------------------------
//       "/*bp.layout+1*/"은 설정값 + 1 (PC 전용 min-width가 max-width와 겹치지 않게)
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

    const body = stripComments(css);
    let depth = 0;
    for (const ch of body) {
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
    if (/ecimg\.cafe24img\.com|etlandmall/.test(body)) {
        errors.push(`${file}: 쇼핑몰 CDN 이미지 경로가 있음`);
    }

    // 기능: 토큰 밖 하드코딩 색 경고 (components/, cafe24/)
    // 이유: 컴포넌트 CSS의 색은 토큰을 거쳐야 테마로 바꿀 수 있다
    if (/^(components|cafe24)\//.test(file)) {
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
// 기능: 쓰는 토큰이 모두 정의되어 있는지, 정의만 하고 안 쓰는 토큰이 있는지
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
    // 이유: primitives·semantic은 앞으로 쓸 단계(z-index, radius 등)까지 미리 둔 팔레트라 검사하지 않는다.
    //       component 토큰은 컴포넌트가 실제로 쓰는 값만 있어야 테마 작성자가 헷갈리지 않는다
    const unused = [...componentTokens].filter((name) => !used.has(name));
    if (unused.length) warnings.push(`쓰지 않는 component 토큰 ${unused.length}개: ${unused.join(', ')}`);
}

// --------------------------------------------------------------------------
// 실행
// --------------------------------------------------------------------------
const banner = (kind) => `/*! SkinKit ${kind} — 자동 생성 파일. 직접 고치지 말고 skinkit/ 원본을 고친 뒤 다시 빌드한다
 *  breakpoint: layout ${bp.layout}px / small ${bp.small}px */\n`;

const cssSources = config.css.map((file) => {
    const raw = read(file);
    checkSyntax(raw, file);
    checkValues(raw, file);
    return { file, css: applyBreakpoints(raw, file) };
});

// 기능: 테마 예시는 합치지 않지만 토큰 이름 검사에는 넣는다
const themeSource = { file: 'themes/theme.example.css', css: read('themes/theme.example.css') };
checkSyntax(themeSource.css, themeSource.file);
checkTokens(cssSources);
for (const m of stripComments(themeSource.css).matchAll(/(--sk-[\w-]+)\s*:/g)) {
    const all = cssSources.map((s) => s.css).join('\n');
    if (!new RegExp(`${m[1]}\\s*:`).test(stripComments(all))) {
        errors.push(`${themeSource.file}: 컴포넌트에 없는 토큰을 덮어씀 ${m[1]}`);
    }
}

const jsSources = config.js.map((file) => ({ file, js: read(file) }));

if (!CHECK_ONLY && !errors.length) {
    mkdirSync(join(ROOT, 'dist'), { recursive: true });
    const css = banner('CSS') + cssSources.map(({ file, css }) => `\n/* ===== ${file} ===== */\n${css.trim()}\n`).join('');
    const js = banner('Adapters') + jsSources.map(({ file, js }) => `\n/* ===== ${file} ===== */\n${js.trim()}\n`).join('');
    writeFileSync(join(ROOT, 'dist/skinkit.css'), css);
    writeFileSync(join(ROOT, 'dist/skinkit.js'), js);
    console.log(`빌드 완료: dist/skinkit.css (${cssSources.length}개 파일, ${(css.length / 1024).toFixed(1)}KB), dist/skinkit.js (${jsSources.length}개 파일, ${(js.length / 1024).toFixed(1)}KB)`);
}

warnings.forEach((w) => console.warn(`경고  ${w}`));
errors.forEach((e) => console.error(`오류  ${e}`));
if (errors.length) {
    console.error(`\n오류 ${errors.length}건 — dist를 만들지 않았습니다 (${relative(process.cwd(), ROOT)})`);
    process.exit(1);
}
if (CHECK_ONLY) console.log(`검사 통과 (경고 ${warnings.length}건)`);
