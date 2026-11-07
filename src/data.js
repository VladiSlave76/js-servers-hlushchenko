const fs = require('fs');

function loadItems(file) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error('Data is not an array');
    }
    return data;
  } catch (error) {
    throw new Error(`Failed to load items from ${file}: ${error.message}`);
  }
}

module.exports = { loadItems };