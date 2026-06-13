import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = normalize(join(dirname(fileURLToPath(import.meta.url)), '..', '..'));
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
};

async function resolveFile(pathname) {
    let filePath = normalize(join(repoRoot, pathname === '/' ? 'index.html' : pathname));
    if (!filePath.startsWith(repoRoot)) return null;
    try {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) filePath = join(filePath, 'index.html');
    } catch {
        return filePath;
    }
    return filePath;
}

const server = createServer(async (request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const filePath = await resolveFile(requestPath);
    if (!filePath) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
    }
    try {
        const data = await readFile(filePath);
        response.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
        response.end(data);
    } catch {
        response.writeHead(404);
        response.end('Not found');
    }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const logs = [];
const browser = await chromium.launch({ headless: true });

try {
    const page = await browser.newPage({ viewport: { width: 1695, height: 933 } });
    page.on('pageerror', (error) => logs.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
        if (message.type() === 'error') logs.push(`console: ${message.text()}`);
    });
    page.on('requestfailed', (request) => {
        logs.push(`requestfailed: ${request.url()} ${request.failure()?.errorText || ''}`);
    });
    await page.route('https://cdn.jsdelivr.net/npm/three@0.184.0/build/**', async (route) => {
        const urlPath = new URL(route.request().url()).pathname;
        const relativePath = urlPath.split('/build/')[1];
        const body = await readFile(join(repoRoot, 'node_modules', 'three', 'build', relativePath));
        await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body });
    });
    await page.route('https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/**', async (route) => {
        const urlPath = new URL(route.request().url()).pathname;
        const relativePath = urlPath.split('/examples/jsm/')[1];
        const body = await readFile(join(repoRoot, 'node_modules', 'three', 'examples', 'jsm', relativePath));
        await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', body });
    });

    await page.goto(`http://127.0.0.1:${port}/algebraic/?mode=clifford_reversi`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const initial = await page.evaluate(() => ({
        title: document.querySelector('#modeTitle')?.textContent,
        mode: JSON.parse(document.querySelector('#exportText')?.value || '{}').mode,
        topology: JSON.parse(document.querySelector('#exportText')?.value || '{}').topology?.name,
        cells: document.querySelectorAll('#board .cell').length,
        stones: document.querySelectorAll('#board .stone').length,
        black: document.querySelector('#blackCount')?.textContent,
        white: document.querySelector('#whiteCount')?.textContent,
        boardHidden: document.querySelector('#board')?.hidden,
        canvasHidden: document.querySelector('#algebraic3dBoard')?.hidden
    }));
    assert.equal(initial.title, 'Clifford Reversi');
    assert.equal(initial.mode, 'clifford_reversi');
    assert.equal(initial.topology, 'flat');
    assert.equal(initial.cells, 64);
    assert.equal(initial.stones, 4);
    assert.equal(initial.black, '2');
    assert.equal(initial.white, '2');
    assert.equal(initial.boardHidden, false);
    assert.equal(initial.canvasHidden, true);

    await page.selectOption('#topologySelect', 'torus');
    await page.waitForTimeout(500);
    const torus = await page.evaluate(() => ({
        mode: JSON.parse(document.querySelector('#exportText').value).mode,
        topology: JSON.parse(document.querySelector('#exportText').value).topology?.name,
        canvasHidden: document.querySelector('#algebraic3dBoard').hidden,
        points: window.algebraic3dBoard?.pointCoords?.length || 0,
        black: document.querySelector('#blackCount')?.textContent,
        white: document.querySelector('#whiteCount')?.textContent
    }));
    assert.equal(torus.mode, 'clifford_reversi');
    assert.equal(torus.topology, 'torus');
    assert.equal(torus.canvasHidden, false);
    assert.equal(torus.points, 64);
    assert.equal(torus.black, '2');
    assert.equal(torus.white, '2');
    assert.equal(logs.length, 0, logs.join('\n'));

    console.log(JSON.stringify({ initial, torus }, null, 2));
} finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
}
