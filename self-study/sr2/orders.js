const fs = require('fs');
const path = require('path');

function loadOrders(filePath) {
  const absolutePath = path.resolve(filePath);
  const data = fs.readFileSync(absolutePath, 'utf-8');
  return JSON.parse(data);
}

function orderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

function findOrder(orders, id) {
  return orders.find(order => order.id === id);
}

function byStatus(orders, status) {
  return orders.filter(order => order.status === status);
}

function cities(orders) {
  return [...new Set(orders.map(order => order.city))].sort((a, b) => a.localeCompare(b));
}

function revenueByCity(orders) {
  return orders
    .filter(order => order.status !== 'cancelled')
    .reduce((acc, order) => {
      const total = orderTotal(order);
      acc[order.city] = (acc[order.city] || 0) + total;
      return acc;
    }, {});
}

function averageOrder(orders) {
  const validOrders = orders.filter(order => order.status !== 'cancelled');
  if (validOrders.length === 0) return 0;
  const totalSum = validOrders.reduce((sum, order) => sum + orderTotal(order), 0);
  return Number((totalSum / validOrders.length).toFixed(2));
}

function topCustomers(orders, n) {
  const spendingMap = orders
    .filter(order => order.status !== 'cancelled')
    .reduce((acc, order) => {
      const total = orderTotal(order);
      acc[order.customer] = (acc[order.customer] || 0) + total;
      return acc;
    }, {});

  return Object.entries(spendingMap)
    .map(([customer, total]) => ({ customer, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}

function bestseller(orders) {
  const itemCounts = orders
    .filter(order => order.status !== 'cancelled')
    .flatMap(order => order.items)
    .reduce((acc, item) => {
      acc[item.title] = (acc[item.title] || 0) + item.qty;
      return acc;
    }, {});

  const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);
  return sortedItems.length > 0 ? sortedItems[0][0] : null;
}

function inMonth(orders, yearMonth) {
  return orders
    .filter(order => order.date.startsWith(yearMonth))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

module.exports = {
  loadOrders,
  orderTotal,
  findOrder,
  byStatus,
  cities,
  revenueByCity,
  averageOrder,
  topCustomers,
  bestseller,
  inMonth
};