const fs = require('node:fs');
const readline = require('node:readline');

const LINE_RE = /^(\S+)\s+(INFO|WARN|ERROR)\s+(.+)$/;

function analyzeLog(file) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(file, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    let lines = 0;
    let invalid = 0;
    const levels = { INFO: 0, WARN: 0, ERROR: 0 };
    let first = null;
    let last = null;
    const errorCounts = new Map();

    let settled = false;
    const fail = (err) => {
      if (settled) return;
      settled = true;
      rl.close();
      stream.destroy();
      reject(err);
    };

    stream.on('error', fail);
    rl.on('error', fail);

    rl.on('line', (line) => {
      if (line.trim() === '') return;

      const match = line.match(LINE_RE);
      if (!match) {
        invalid += 1;
        return;
      }

      const [, timestamp, level, rawMessage] = match;
      const message = rawMessage.trim();
      if (!message) {
        invalid += 1;
        return;
      }

      lines += 1;
      levels[level] += 1;
      if (first === null) first = timestamp;
      last = timestamp;

      if (level === 'ERROR') {
        errorCounts.set(message, (errorCounts.get(message) ?? 0) + 1);
      }
    });

    rl.on('close', () => {
      if (settled) return;
      settled = true;

      const topErrors = [...errorCounts.entries()]
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1];
          return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
        })
        .slice(0, 3)
        .map(([message, count]) => ({ message, count }));

      resolve({
        lines,
        invalid,
        levels,
        first,
        last,
        topErrors,
      });
    });
  });
}

module.exports = { analyzeLog };