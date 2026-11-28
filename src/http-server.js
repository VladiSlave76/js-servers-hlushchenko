const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { filterItems, stats } = require('./query');

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'items.json');
const DEFAULT_PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function createHttpError(status, message, headers = {}) {
  const err = new Error(message);
  err.status = status;
  err.headers = headers;
  return err;
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  setCorsHeaders(res);
  for (const [k, v] of Object.entries(extraHeaders)) {
    res.setHeader(k, v);
  }
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readItems(dataFile) {
  const raw = fs.readFileSync(dataFile, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw createHttpError(500, 'Некоректний формат даних у файлі items.json');
  }
  return parsed;
}

function parseOptionalNumber(value, paramName) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw createHttpError(400, `Некоректне значення параметра ${paramName}`);
  }
  return num;
}

function parsePositiveIntId(rawId) {
  if (!/^\d+$/.test(rawId)) {
    throw createHttpError(400, 'Некоректний id: очікується ціле додатне число');
  }
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw createHttpError(400, 'Некоректний id: очікується ціле додатне число');
  }
  return id;
}

function resolvePublicFile(publicDir, rawPathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(rawPathname);
  } catch {
    throw createHttpError(400, 'Некоректний шлях запиту');
  }

  // Нормализуем обратные слэши и проверяем попытки выхода за пределы publicDir
  const normalizedInput = decoded.replace(/\\/g, '/');
  if (normalizedInput.includes('\0')) {
    throw createHttpError(400, 'Некоректний шлях запиту');
  }

  const relativePath = normalizedInput === '/' ? 'index.html' : normalizedInput.replace(/^\/+/, '');
  const rootResolved = path.resolve(publicDir);
  const targetResolved = path.resolve(rootResolved, relativePath);

  const rootWithSep = rootResolved.endsWith(path.sep) ? rootResolved : rootResolved + path.sep;
  if (targetResolved === rootResolved || !targetResolved.startsWith(rootWithSep)) {
    throw createHttpError(403, 'Доступ за межі папки public заборонено');
  }

  let stat;
  try {
    stat = fs.statSync(targetResolved);
  } catch {
    throw createHttpError(404, 'Файл не знайдено');
  }

  if (stat.isDirectory()) {
    const indexInDir = path.join(targetResolved, 'index.html');
    if (indexInDir.startsWith(rootWithSep) && fs.existsSync(indexInDir)) {
      return indexInDir;
    }
    throw createHttpError(404, 'Файл не знайдено');
  }

  return targetResolved;
}

function handleApiRequest(req, res, pathname, searchParams, dataFile) {
  const isKnownRoute =
    pathname === '/api/items' ||
    /^\/api\/items\/[^/]+$/.test(pathname) ||
    pathname === '/api/stats';

  if (req.method === 'OPTIONS') {
    setCorsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (!isKnownRoute && req.method === 'GET') {
    throw createHttpError(404, 'Маршрут API не знайдено');
  }

  if (req.method !== 'GET') {
    throw createHttpError(405, 'Метод не дозволений для цього маршруту', { Allow: 'GET' });
  }

  if (pathname === '/api/items') {
    const category = searchParams.get('category') ?? undefined;
    const minPrice = parseOptionalNumber(searchParams.get('minPrice'), 'minPrice');
    const maxPrice = parseOptionalNumber(searchParams.get('maxPrice'), 'maxPrice');

    const items = readItems(dataFile);
    const filtered = filterItems(items, { category, minPrice, maxPrice });
    sendJson(res, 200, filtered);
    return;
  }

  const itemMatch = pathname.match(/^\/api\/items\/([^/]+)$/);
  if (itemMatch) {
    const id = parsePositiveIntId(itemMatch[1]);
    const items = readItems(dataFile);
    const found = items.find((item) => Number(item.id) === id);
    if (!found) {
      throw createHttpError(404, `Запис із id=${id} не знайдено`);
    }
    sendJson(res, 200, found);
    return;
  }

  if (pathname === '/api/stats') {
    const category = searchParams.get('category') ?? undefined;
    const items = readItems(dataFile);
    const targetItems = category ? filterItems(items, { category }) : items;
    sendJson(res, 200, stats(targetItems));
    return;
  }

  throw createHttpError(404, 'Маршрут API не знайдено');
}

function createServer({ dataFile = DEFAULT_DATA_FILE, publicDir = DEFAULT_PUBLIC_DIR } = {}) {
  return http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url || '/', 'http://localhost');
      const { pathname, searchParams } = parsedUrl;

      if (pathname === '/health') {
        if (req.method === 'OPTIONS') {
          setCorsHeaders(res);
          res.writeHead(204);
          res.end();
          return;
        }
        if (req.method !== 'GET') {
          throw createHttpError(405, 'Метод не дозволений', { Allow: 'GET' });
        }
        sendJson(res, 200, { status: 'ok' });
        return;
      }

      if (pathname === '/api' || pathname.startsWith('/api/')) {
        handleApiRequest(req, res, pathname, searchParams, dataFile);
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(405, 'Метод не дозволений', { Allow: 'GET, HEAD' });
      }

      const filePath = resolvePublicFile(publicDir, pathname);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const content = fs.readFileSync(filePath);

      res.writeHead(200, { 'Content-Type': contentType });
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(content);
      }
    } catch (err) {
      const status = Number.isInteger(err.status) ? err.status : 500;
      const message = status >= 500 ? 'Внутрішня помилка сервера' : err.message;
      sendJson(res, status, { error: message }, err.headers || {});
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => console.log(`http://localhost:${port}`));
}

module.exports = { createServer };
