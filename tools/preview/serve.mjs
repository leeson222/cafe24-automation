#!/usr/bin/env node
/* ==========================================================================
   tools/preview/serve.mjs
   기능: preview/ 폴더를 루트로 하는 아주 작은 정적 서버 (Live Server를 못 쓸 때)
   실행: npm run preview:serve   → http://localhost:5510/
   이유: 원본 CSS가 url(/몰폴더/…)처럼 스킨 루트 기준 경로를 쓴다. preview/가 웹 루트여야 그대로 보인다.
         VS Code Live Server를 쓰면 이 서버는 필요 없다 (docs/preview.md의 루트 설정 참고)
   의존: Node 20 이상 (외부 패키지 없음). 새로고침은 직접 한다 (자동 새로고침 없음)
   ========================================================================== */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'preview');
const PORT = Number(process.env.PORT) || 5510;
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon',
    '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.eot': 'application/vnd.ms-fontobject'
};

createServer(async (req, res) => {
    // 기능: URL을 preview/ 안의 파일 경로로 바꾼다 (폴더 밖으로 나가는 경로는 막는다)
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = normalize(join(ROOT, path));
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    try {
        if (!(await stat(file)).isFile()) throw new Error();
        res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' });
        res.end(await readFile(file));
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end(`없음: ${path}`);
    }
}).listen(PORT, () => console.log(`프리뷰: http://localhost:${PORT}/  (루트 ${ROOT})`));
