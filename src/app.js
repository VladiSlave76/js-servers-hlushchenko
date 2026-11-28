const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { filterItems, stats } = require('./query');

const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'items.json');
const DEFAULT_PUBLIC_DIR = path.join(__dirname, '..', 'public');

function createHttpError(status, message, headers = {}) {
  const err = new Error(message);
  err.status = status;
  err.headers = headers;
  return err;
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

function readItems(dataFile) {
  const raw = fs.readFileSync(dataFile, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw createHttpError(500, 'Некоректний формат даних у файлі items.json');
  }
  return parsed;
}

// Middleware 1: X-Response-Time для всіх відповідей (API, статика, помилки)
function responseTimeMiddleware(req, res, next) {
  const startNs = process.hrtime.bigint();
  const originalWriteHead = res.writeHead.bind(res);

  res.writeHead = function writeHeadWithResponseTime(...args) {
    if (!res.headersSent && !res.getHeader('X-Response-Time')) {
      const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
      res.setHeader('X-Response-Time', `${elapsedMs.toFixed(2)}ms`);
    }
    return originalWriteHead(...args);
  };

  next();
}

// Middleware 2: CORS та обробка preflight OPTIONS для маршрутів API
function apiCorsMiddleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
}

function createApiRouter(dataFile) {
  const router = express.Router();

  router.use(apiCorsMiddleware);

  router.get('/items', (req, res, next) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const minPrice = parseOptionalNumber(req.query.minPrice, 'minPrice');
      const maxPrice = parseOptionalNumber(req.query.maxPrice, 'maxPrice');

      const items = readItems(dataFile);
      const filtered = filterItems(items, { category, minPrice, maxPrice });
      res.status(200).json(filtered);
    } catch (err) {
      next(err);
    }
  });

  router.get('/items/:id', (req, res, next) => {
    try {
      const id = parsePositiveIntId(req.params.id);
      const items = readItems(dataFile);
      const found = items.find((item) => Number(item.id) === id);
      if (!found) {
        throw createHttpError(404, `Запис із id=${id} не знайдено`);
      }
      res.status(200).json(found);
    } catch (err) {
      next(err);
    }
  });

  router.get('/stats', (req, res, next) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const items = readItems(dataFile);
      const targetItems = category ? filterItems(items, { category }) : items;
      res.status(200).json(stats(targetItems));
    } catch (err) {
      next(err);
    }
  });

  router.use((req, res, next) => {
    const isKnownRoute =
      req.path === '/items' ||
      /^\/items\/[^/]+$/.test(req.path) ||
      req.path === '/stats';

    if (!isKnownRoute && req.method === 'GET') {
      return next(createHttpError(404, 'Маршрут API не знайдено'));
    }

    return next(createHttpError(405, 'Метод не дозволений для цього маршруту', { Allow: 'GET' }));
  });

  return router;
}

function createApp({ dataFile = DEFAULT_DATA_FILE, publicDir = DEFAULT_PUBLIC_DIR } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(responseTimeMiddleware);

  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/health', (req, res, next) => {
    next(createHttpError(405, 'Метод не дозволений', { Allow: 'GET' }));
  });

  app.use('/api', createApiRouter(dataFile));

  // Статичні файли з publicDir (Express 5 коректно відсікає вихід за межі publicDir)
  app.use(express.static(publicDir));

  // 404 для неіснуючих статичних шляхів
  app.use((req, res, next) => {
    next(createHttpError(404, 'Ресурс не знайдено'));
  });

  // Централізована обробка помилок (4 параметри)
  app.use((err, req, res, next) => {
    const status = Number.isInteger(err.status) ? err.status : 500;
    const message = status >= 500 ? 'Внутрішня помилка сервера' : err.message;

    if (err.headers) {
      for (const [key, value] of Object.entries(err.headers)) {
        res.setHeader(key, value);
      }
    }

    if (req.path === '/api' || req.path.startsWith('/api/') || status >= 400) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }

    res.status(status).json({ error: message });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, () => console.log(`http://localhost:${port}`));
}

module.exports = { createApp };
