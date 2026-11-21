const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { loadAll } = require(path.join(__dirname, '..', '..', 'src', 'fetcher.js'));

const BASE_URLS = [
  'https://jsonplaceholder.typicode.com/posts/1',
  'https://jsonplaceholder.typicode.com/users/1',
  'https://jsonplaceholder.typicode.com/todos/1',
];

function average(values) {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

async function runBenchmark(mode, runs = 3) {
  const times = [];

  for (let i = 1; i <= runs; i++) {
    const start = performance.now();
    const results = await loadAll(BASE_URLS, {
      mode,
      timeout: 5000,
      retries: 0,
    });
    const elapsed = Number((performance.now() - start).toFixed(2));
    times.push(elapsed);

    const okCount = results.filter((r) => r.ok).length;
    console.log(`[${mode}] Запуск ${i}: ${elapsed} мс (успешно ${okCount}/${results.length})`);
  }

  const avg = Number(average(times).toFixed(2));
  console.log(`==> Среднее для "${mode}": ${avg} мс\n`);
  return { times, avg };
}

async function demoErrorsAndTimeout() {
  console.log('--- Проверка ошибок и таймаута (4-й проблемный адрес не валит остальные) ---');

  const mixedUrls = [
    'https://jsonplaceholder.typicode.com/posts/1',
    'https://jsonplaceholder.typicode.com/nonexistent-endpoint-999999',
    'https://jsonplaceholder.typicode.com/users/1',
    'https://jsonplaceholder.typicode.com/todos/1',
  ];

  const start404 = performance.now();
  const res404 = await loadAll(mixedUrls, {
    mode: 'parallel',
    timeout: 4000,
    retries: 0,
  });
  const ms404 = Number((performance.now() - start404).toFixed(2));
  console.log(`Кейс с 404 (${ms404} мс):`);
  for (const item of res404) {
    console.log(
      item.ok
        ? `  OK    ${item.url}`
        : `  ERROR ${item.url} -> ${item.error}`
    );
  }

  const timeoutUrls = [
    ...BASE_URLS,
    'https://jsonplaceholder.typicode.com/posts/2',
  ];

  const startTimeout = performance.now();
  const resTimeout = await loadAll(timeoutUrls, {
    mode: 'parallel',
    timeout: 1,
    retries: 0,
  });
  const msTimeout = Number((performance.now() - startTimeout).toFixed(2));
  console.log(`\nКейс с жёстким timeout=1мс (${msTimeout} мс):`);
  for (const item of resTimeout) {
    console.log(
      item.ok
        ? `  OK      ${item.url}`
        : `  TIMEOUT ${item.url} -> ${item.error}`
    );
  }
}

async function main() {
  console.log('Адреса для замеров:');
  BASE_URLS.forEach((u) => console.log(`  - ${u}`));
  console.log();

  const seq = await runBenchmark('sequential', 3);
  const par = await runBenchmark('parallel', 3);

  console.log('Итоговая сводка:');
  console.log(`Последовательно: [${seq.times.join(', ')}] мс | среднее: ${seq.avg} мс`);
  console.log(`Параллельно:     [${par.times.join(', ')}] мс | среднее: ${par.avg} мс\n`);

  await demoErrorsAndTimeout();
}

main().catch((err) => {
  console.error('Неожиданная ошибка скрипта:', err);
  process.exitCode = 1;
});