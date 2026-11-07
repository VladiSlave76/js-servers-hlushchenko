# Наскрізний проєкт · Етап 2

## Предметна область
Магазин комп'ютерних комплектуючих та периферії (процесори, відеокарти, оперативна пам'ять, SSD та блоки живлення). Набір даних містить понад 20 записів з унікальними ідентифікаторами, цінами, кількістю та датами у форматі JSON (`data/items.json`).

## Запуск

### Запуск тестів
\`\`\`bash
npm test
\`\`\`

### Приклади використання утиліти report (Етап 2)
\`\`\`bash
node src/report.js list --category CPU
node src/report.js group --by category
node src/report.js stats
node src/report.js top --n 5 --by price
\`\`\`

### Приклади використання утиліти calc (Етап 1)
\`\`\`bash
node src/cli.js sum 1 2 3
node src/cli.js avg 2 4 9
node src/cli.js median 4 1 3 2
\`\`\`