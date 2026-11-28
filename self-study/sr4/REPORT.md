# CP4. Протокол HTTP і робота з публічним API

# 1. Опис обраного API

Обрано публічний тестовий REST API JSONPlaceholder (https://jsonplaceholder.typicode.com), який імітує роботу бекенду без потреби в реєстрації чи API-ключах.

- Основні ресурси: /posts (публікації), /comments (коментарі), /albums (альбоми), /photos (фотографії), /todos (завдання), /users (користувачі). Підтримуються вкладені шляхи (наприклад, /posts/1/comments) та фільтрація через query-параметри (наприклад, /posts?userId=1).
- Підтримувані HTTP-методи: GET (отримання списку або одного ресурсу), POST (імітація створення запису), PUT і PATCH (імітація повного або часткового оновлення), DELETE (імітація видалення). Зміни не зберігаються в реальній базі назавжди — сервер повертає правдоподібну відповідь.
- Типові коди стану:
  - 200 OK — успішний GET, PUT, PATCH або DELETE;
  - 201 Created — успішна обробка POST (часто з полем id та заголовком location);
  - 404 Not Found — запитуваний ресурс або маршрут не знайдено.

# 2. Надіслані запити та аналіз відповідей

# Запит 1. Отримання одного ресурсу (GET /posts/1)

```bash
curl -i -s https://jsonplaceholder.typicode.com/posts/1
```

- Код стану: 200 OK
- Ключові заголовки відповіді:
  - Content-Type: application/json; charset=utf-8
  - Cache-Control: max-age=43200
  - etag: W/"124-yiKdLzqO5gfBrJFrcdJ8Yq0LGnU"
- Фрагмент тіла відповіді:
```json
{
  "userId": 1,
  "id": 1,
  "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
  "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto"
}
```

# Запит 2. Фільтрація через query-параметри (GET /posts?userId=1)

```bash
curl -i -s "https://jsonplaceholder.typicode.com/posts?userId=1"
```

- Код стану: 200 OK
- Ключові заголовки відповіді:
  - Content-Type: application/json; charset=utf-8
  - Transfer-Encoding: chunked
  - etag: W/"aa6-j2NSH739l9uq40OywFMn7Y0C/iY"
- Фрагмент тіла відповіді:
```json
[
  {
    "userId": 1,
    "id": 1,
    "title": "sunt aut facere repellat provident occaecati excepturi optio reprehenderit",
    "body": "quia et suscipit\nsuscipit recusandae consequuntur expedita et cum\nreprehenderit molestiae ut ut quas totam\nnostrum rerum est autem sunt rem eveniet architecto"
  },
  {
    "userId": 1,
    "id": 2,
    "title": "qui est esse",
    "body": "est rerum tempore vitae\nsequi sint nihil reprehenderit dolor beatae ea dolores neque\nfugiat blanditiis voluptate porro vel nihil molestiae ut reiciendis\nqui aperiam non debitis possimus qui neque nisi nulla"
  }
]
```
(Усього у відповіді повернуто 10 постів користувача з userId: 1.)

# Запит 3. Запит неіснуючого ресурсу (GET /posts/999999)

```bash
curl -i -s https://jsonplaceholder.typicode.com/posts/999999
```

- Код стану: 404 Not Found
- Ключові заголовки відповіді:
  - Content-Type: application/json; charset=utf-8
  - Cache-Control: max-age=43200
  - x-content-type-options: nosniff
- Фрагмент тіла відповіді:
```json
{}
```

# Запит 4. Створення ресурсу (POST /posts)

```bash
curl -i -s -X POST https://jsonplaceholder.typicode.com/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"test","body":"hello","userId":1}'
```

- Код стану: 201 Created
- Ключові заголовки відповіді:
  - Content-Type: application/json; charset=utf-8
  - location: https://jsonplaceholder.typicode.com/posts/101
  - Cache-Control: no-cache
- Фрагмент тіла відповіді:
```json
{
  "title": "test",
  "body": "hello",
  "userId": 1,
  "id": 101
}
```

# Запит 5. Видалення ресурсу (DELETE /posts/1)

```bash
curl -i -s -X DELETE https://jsonplaceholder.typicode.com/posts/1
```

- Код стану: 200 OK
- Ключові заголовки відповіді:
  - Content-Type: application/json; charset=utf-8
  - Cache-Control: no-cache
  - etag: W/"2-vyGp6PvFo4RvsFtPoIWeCReyIC8"
- Фрагмент тіла відповіді:
```json
{}
```

# 3. Пояснення заголовків своїми словами

- Content-Type - показує, у якому форматі передається тіло відповіді та яке кодування тексту використано. У цих відповідях значення application/json; charset=utf-8 підказує клієнту (браузеру, curl або коду на fetch), що дані треба розбирати як JSON у кодуванні UTF-8, а не як звичайний HTML-текст.
- Cache-Control — керує кешуванням відповіді на стороні клієнта чи проміжних проксі/CDN. Наприклад, max-age=43200 означає, що відповідь можна вважати актуальною до 43200 секунд (12 годин) і не тягнути її заново без потреби, тоді як no-cache змушує щоразу звіряти актуальність із сервером.
- ETag (etag) — це «відбиток» конкретної версії ресурсу (у форматі W/"..." — слабкий ETag). Якщо клієнт збереже його, то при наступному запиті може передати в If-None-Match і отримати 304 Not Modified замість повторного завантаження того самого тіла, якщо дані не змінилися.
