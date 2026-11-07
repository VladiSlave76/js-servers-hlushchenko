function filterItems(items, { category, minPrice, maxPrice } = {}) {
  return items.filter(item => {
    if (category && item.category !== category) return false;
    if (minPrice !== undefined && item.price < Number(minPrice)) return false;
    if (maxPrice !== undefined && item.price > Number(maxPrice)) return false;
    return true;
  });
}

function groupCount(items, field) {
  const result = {};
  for (const item of items) {
    let key;
    if (field === 'category') {
      key = item.category;
    } else if (field === 'year') {
      key = item.date ? item.date.slice(0, 4) : 'unknown';
    } else {
      key = item[field];
    }
    
    if (key !== undefined) {
      result[key] = (result[key] || 0) + 1;
    }
  }
  return result;
}

function stats(items) {
  const count = items.length;
  if (count === 0) {
    return {
      count: 0,
      totalQuantity: 0,
      totalValue: 0,
      avgPrice: 0,
      minPrice: null,
      maxPrice: null
    };
  }

  let totalQuantity = 0;
  let totalValue = 0;
  let totalPriceForAvg = 0;
  let minPrice = items[0].price;
  let maxPrice = items[0].price;

  for (const item of items) {
    totalQuantity += item.quantity;
    totalValue += item.price * item.quantity;
    totalPriceForAvg += item.price;

    if (item.price < minPrice) minPrice = item.price;
    if (item.price > maxPrice) maxPrice = item.price;
  }

  const avgPrice = Math.round((totalPriceForAvg / count) * 100) / 100;
  const roundedTotalValue = Math.round(totalValue * 100) / 100;

  return {
    count,
    totalQuantity,
    totalValue: roundedTotalValue,
    avgPrice,
    minPrice,
    maxPrice
  };
}

function topN(items, n, field = 'price') {
  const sorted = [...items].sort((a, b) => {
    if (b[field] !== a[field]) {
      return b[field] - a[field]; 
    }
    return a.id - b.id; 
  });
  return sorted.slice(0, n);
}

module.exports = {
  filterItems,
  groupCount,
  stats,
  topN
};