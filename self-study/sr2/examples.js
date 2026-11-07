const path = require('path');
const {
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
} = require('./orders');

const filePath = path.join(__dirname, 'orders.json');
const orders = loadOrders(filePath);

console.log('=== 1. Завантажені замовлення (кількість):', orders.length);

console.log('\n=== 2. Сума першого замовлення:');
console.log(orderTotal(orders[0]));

console.log('\n=== 3. Пошук замовлення за ID (id: 3):');
console.log(findOrder(orders, 3));

console.log('\n=== 4. Замовлення зі статусом "paid":');
console.log(byStatus(orders, 'paid').map(o => ({ id: o.id, customer: o.customer })));

console.log('\n=== 5. Міста без повторів (за алфавітом):');
console.log(cities(orders));

console.log('\n=== 6. Виручка по містах (окрім cancelled):');
console.log(revenueByCity(orders));

console.log('\n=== 7. Середня сума замовлення:');
console.log(averageOrder(orders));

console.log('\n=== 8. Топ-3 покупців:');
console.log(topCustomers(orders, 3));

console.log('\n=== 9. Бестселер (найпопулярніший товар):');
console.log(bestseller(orders));

console.log('\n=== 10. Замовлення за 2026-10 (від найновіших):');
console.log(inMonth(orders, '2026-10').map(o => ({ id: o.id, date: o.date })));