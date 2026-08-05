# File Organizer

File Organizer — це консольний застосунок на Node.js, який допомагає аналізувати директорії, знаходити дублікати файлів, сортувати їх по категоріях та знаходити або видаляти старі файли.

## Встановлення

Встановіть залежності:

```bash
npm install
```

## Команди

### Scan

Сканування директорії та збір статистики.

```bash
npm run scan -- "/path/to/directory"
```

Команда показує:

- загальну кількість файлів;
- загальний розмір;
- статистику за розширеннями;
- кількість файлів за останні 7, 30 днів та старших за 90 днів;
- 3 найбільші файли;
- найстаріший файл.

---

### Duplicates

Пошук однакових файлів.

```bash
npm run duplicates -- "/path/to/directory"
```

Для пошуку використовується SHA-256 хеш. Великі файли читаються через потоки (`createReadStream()`), тому не завантажуються повністю в пам'ять.

У результаті показуються:

- знайдені групи дублікатів;
- хеш кожної групи;
- список файлів;
- скільки місця займають зайві копії.

---

### Organize

Копіювання файлів по категоріях.

```bash
npm run organize -- "/source/directory" --output "/target/directory"
```

Створюються такі папки:

- Documents
- Images
- Archives
- Code
- Videos
- Other

Оригінальні файли залишаються без змін.

Файли до 10 MB копіюються через `fs.copyFile()`, а більші — через `pipeline()`.

Якщо файл із такою назвою вже існує, автоматично створюється нова назва:

```
file.pdf
file(1).pdf
file(2).pdf
```

---

### Cleanup

Пошук старих файлів без видалення:

```bash
npm run cleanup -- "/path/to/directory" --older-than 90
```

Видалення старих файлів:

```bash
npm run cleanup -- "/path/to/directory" --older-than 90 --confirm
```

Якщо не вказати `--older-than`, використовується значення **90 днів**.

Спочатку програма показує список знайдених файлів, а після підтвердження видаляє їх.

---

## Запуск без npm

Також можна запускати напряму через Node.js.

```bash
node file-organizer.js scan "/path/to/directory"

node file-organizer.js duplicates "/path/to/directory"

node file-organizer.js organize "/source/directory" --output "/target/directory"

node file-organizer.js cleanup "/path/to/directory" --older-than 90

node file-organizer.js cleanup "/path/to/directory" --older-than 90 --confirm
```

---

## Структура проєкту

```text
file-organizer/
├── package.json
├── .gitignore
├── README.md
├── file-organizer.js
└── lib/
    ├── scanner.js
    ├── duplicates.js
    ├── organizer.js
    ├── cleanup.js
    └── walk-directory.js
```

---

## Використані події

У проєкті всі основні команди наслідуються від `EventEmitter`.

Події:

- Scanner:
  - `file-found`
  - `scan-complete`

- DuplicateFinder:
  - `file-processed`
  - `duplicates-found`

- Organizer:
  - `copy-start`
  - `copy-complete`
  - `copy-error`
  - `organize-complete`

- Cleanup:
  - `file-found`
  - `file-deleted`
  - `cleanup-complete`
  - `cleanup-ready`

---

## Обробка помилок

У програмі використовується `try...catch` для роботи з файловою системою.

Обробляються основні помилки:

- неправильний шлях;
- відсутність доступу до директорії;
- інші неочікувані помилки.