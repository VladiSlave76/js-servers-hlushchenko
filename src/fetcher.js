async function fetchOnce(url, timeout) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(timeout) });
  } catch (err) {
    if (err?.name === 'TimeoutError' || /timeout/i.test(err?.message || '')) {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw err;
  }

  if (res.status >= 400 && res.status < 500) {
    const err = new Error(`HTTP ${res.status}`);
    err.noRetry = true;
    throw err;
  }

  if (res.status >= 500) {
    throw new Error(`HTTP ${res.status}`);
  }

  const rawText = await res.text();
  try {
    return JSON.parse(rawText);
  } catch (err) {
    const parseErr = new Error(`Invalid JSON: ${err.message}`);
    parseErr.noRetry = true;
    throw parseErr;
  }
}

async function fetchJson(url, { timeout = 2000, retries = 0 } = {}) {
  const maxRetries = Number.isFinite(retries) && retries >= 0 ? retries : 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchOnce(url, timeout);
    } catch (err) {
      if (err?.noRetry || attempt === maxRetries) {
        throw err;
      }
    }
  }
}

async function loadOne(url, opts) {
  try {
    const data = await fetchJson(url, opts);
    return { url, ok: true, data };
  } catch (err) {
    return { url, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function loadAll(urls, { mode = 'parallel', timeout, retries } = {}) {
  const opts = { timeout, retries };
  if (mode === 'sequential') {
    const results = [];
    for (const url of urls) {
      results.push(await loadOne(url, opts));
    }
    return results;
  }
  return Promise.all(urls.map((url) => loadOne(url, opts)));
}

module.exports = { fetchJson, loadAll };