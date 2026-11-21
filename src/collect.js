const { loadAll } = require('./fetcher');
const { analyzeLog } = require('./logstats');

class CliError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function parsePositiveInt(raw, flagName) {
  if (!/^\d+$/.test(raw)) {
    throw new CliError(3, `${flagName} must be an integer >= 1`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new CliError(3, `${flagName} must be an integer >= 1`);
  }
  return value;
}

function parseNonNegativeInt(raw, flagName) {
  if (!/^\d+$/.test(raw)) {
    throw new CliError(3, `${flagName} must be an integer >= 0`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new CliError(3, `${flagName} must be an integer >= 0`);
  }
  return value;
}

async function main(argv) {
  const command = argv[0];
  if (!command || (command !== 'fetch' && command !== 'log')) {
    throw new CliError(1, command ? `Unknown command: ${command}` : 'Missing command');
  }

  if (command === 'log') {
    const rest = argv.slice(1);
    if (rest.length === 0) {
      throw new CliError(2, 'Missing log file path');
    }
    if (rest[0].startsWith('-')) {
      throw new CliError(1, `Unknown option: ${rest[0]}`);
    }
    const file = rest[0];
    let stats;
    try {
      stats = await analyzeLog(file);
    } catch (err) {
      throw new CliError(4, err instanceof Error ? err.message : String(err));
    }
    process.stdout.write(JSON.stringify(stats, null, 2) + '\n');
    return 0;
  }

  let sequential = false;
  let timeout;
  let retries;
  const urls = [];

  const args = argv.slice(1);
  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--sequential') {
      sequential = true;
    } else if (token === '--timeout') {
      if (i + 1 >= args.length) {
        throw new CliError(2, 'Option --timeout requires a value');
      }
      timeout = parsePositiveInt(args[++i], '--timeout');
    } else if (token.startsWith('--timeout=')) {
      timeout = parsePositiveInt(token.slice('--timeout='.length), '--timeout');
    } else if (token === '--retries') {
      if (i + 1 >= args.length) {
        throw new CliError(2, 'Option --retries requires a value');
      }
      retries = parseNonNegativeInt(args[++i], '--retries');
    } else if (token.startsWith('--retries=')) {
      retries = parseNonNegativeInt(token.slice('--retries='.length), '--retries');
    } else if (token.startsWith('-')) {
      throw new CliError(1, `Unknown option: ${token}`);
    } else {
      urls.push(token);
    }
  }

  if (urls.length === 0) {
    throw new CliError(2, 'At least one URL is required for fetch');
  }

  const results = await loadAll(urls, {
    mode: sequential ? 'sequential' : 'parallel',
    ...(timeout !== undefined ? { timeout } : {}),
    ...(retries !== undefined ? { retries } : {}),
  });

  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  return results.some((item) => !item.ok) ? 5 : 0;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code ?? 0;
  })
  .catch((err) => {
    if (err instanceof CliError) {
      process.stderr.write(`Error: ${err.message}\n`);
      process.exitCode = err.code;
    } else {
      process.stderr.write(`Error: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 1;
    }
  });