const path = require('path');
const { loadItems } = require('./data');
const { filterItems, groupCount, stats, topN } = require('./query');

function parseArgs(args) {
  const parsed = {
    command: args[2],
    options: {}
  };

  for (let i = 3; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        parsed.options[key] = nextArg;
        i++;
      } else {
        parsed.options[key] = true;
      }
    }
  }
  return parsed;
}

function main() {
  const args = process.argv;
  const { command, options } = parseArgs(args);

  if (!command) {
    console.error('Error: No command specified');
    process.exit(1);
  }

  const validCommands = ['list', 'group', 'stats', 'top'];
  if (!validCommands.includes(command)) {
    console.error(`Error: Unknown command '${command}'`);
    process.exit(1);
  }

  // Сувора перевірка на наявність невідомих опцій
  const allowedOptions = {
    list: ['file', 'category', 'min-price', 'max-price'],
    group: ['file', 'by'],
    stats: ['file', 'category'],
    top: ['file', 'n', 'by']
  };

  const allowed = allowedOptions[command] || [];
  for (const optKey of Object.keys(options)) {
    if (!allowed.includes(optKey)) {
      console.error(`Error: Unknown option '--${optKey}'`);
      process.exit(1);
    }
  }

  const filePath = options.file || path.join('data', 'items.json');

  let items;
  try {
    items = loadItems(filePath);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(4);
  }

  let result;

  try {
    switch (command) {
      case 'list': {
        const filterOpts = {};
        if (options.category) filterOpts.category = options.category;
        if (options['min-price'] !== undefined) {
          const minP = Number(options['min-price']);
          if (isNaN(minP)) {
            console.error('Error: Invalid value for --min-price');
            process.exit(3);
          }
          filterOpts.minPrice = minP;
        }
        if (options['max-price'] !== undefined) {
          const maxP = Number(options['max-price']);
          if (isNaN(maxP)) {
            console.error('Error: Invalid value for --max-price');
            process.exit(3);
          }
          filterOpts.maxPrice = maxP;
        }
        result = filterItems(items, filterOpts);
        break;
      }

      case 'group': {
        const by = options.by;
        if (!by) {
          console.error("Error: Missing required option '--by' for group command");
          process.exit(2);
        }
        if (by !== 'category' && by !== 'year') {
          console.error(`Error: Invalid value for --by: '${by}'`);
          process.exit(3);
        }
        result = groupCount(items, by);
        break;
      }

      case 'stats': {
        let targetItems = items;
        if (options.category) {
          targetItems = filterItems(items, { category: options.category });
        }
        result = stats(targetItems);
        break;
      }

      case 'top': {
        const nOpt = options.n;
        if (nOpt === undefined) {
          console.error("Error: Missing required option '--n' for top command");
          process.exit(2);
        }
        const n = Number(nOpt);
        if (isNaN(n) || n < 1) {
          console.error(`Error: Invalid value for --n: '${nOpt}'`);
          process.exit(3);
        }

        const byField = options.by || 'price';
        if (byField !== 'price' && byField !== 'quantity') {
          console.error(`Error: Invalid value for --by: '${byField}'`);
          process.exit(3);
        }

        result = topN(items, n, byField);
        break;
      }
    }

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

main();