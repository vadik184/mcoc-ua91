const TOKEN = "8390789177:AAEGVmxCuqHGnAa4M6NQzW_NTb_wfySsRGA";
const URL = `https://api.telegram.org/bot${TOKEN}`;

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSsKZfy7c3rPEzWprxgkYA0mXrd7RDCqbonhbSygeqvgVExuK9Xv_DyNOAyxwS2FOtWGZDe-5QmQim_/pub?gid=115569721&single=true&output=csv";

let offset = 0; // id останнього обробленого повідомлення
const keyboard = {
  keyboard: [[{ text: "📅Календар" }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};
// Відправка повідомлення
async function sendMessage(chatId, text) {
  await fetch(`${URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      reply_markup: keyboard,
    }),
  });
}

// Що відповісти на повідомлення
async function handleMessage(message) {
  const text = message.text;
  const chatId = message.chat.id;

  if (text && text.startsWith("/start")) {
    await sendMessage(chatId, "Привіт! Я бот чату союзу UA-91 🦸");
  } else if (text && (text.startsWith("/calendar") || text === "📅Календар")) {
    await sendMessage(chatId, await getMonthEvents());
  }
}

// Розбір CSV на рядки й колонки (враховує лапки і коми в описі)
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}

// Перетворює "12. 11. 2026" у дату
function parseDate(text) {
  const parts = text.split(".").map((p) => p.trim());
  if (parts.length !== 3 || parts.some((p) => p === "")) return null;
  const date = new Date(
    Number(parts[2]),
    Number(parts[1]) - 1,
    Number(parts[0]),
  );
  return isNaN(date) ? null : date;
}

// Показує дату як 12.11
function formatDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

// Завантажує події з таблиці
async function loadEvents() {
  const response = await fetch(SHEET_URL);
  const csv = await response.text();
  const rows = parseCSV(csv).slice(1); // пропускаємо заголовок
  const events = [];
  for (const row of rows) {
    const start = parseDate(row[0] || "");
    if (!start) continue; // пропускаємо рядки без дати
    const end = parseDate(row[1] || "") || start; // якщо немає кінця, беремо початок
    events.push({
      start,
      end,
      title: (row[2] || "").trim(),
      description: (row[3] || "").trim(),
    });
  }
  return events;
}

// Формує повідомлення з подіями за поточний місяць
async function getMonthEvents() {
  const events = await loadEvents();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );

  const list = events
    .filter((e) => e.start <= monthEnd && e.end >= monthStart)
    .sort((a, b) => a.start - b.start);

  if (list.length === 0) return "Подій на цей місяць немає.";

  let text = "📅 Події цього місяця:\n\n";
  for (const e of list) {
    let period = formatDate(e.start);
    if (e.end.getTime() !== e.start.getTime()) {
      period += " - " + formatDate(e.end);
    }
    text += `${period} | ${e.title}\n`;
    if (e.description) {
      text += `${e.description}\n`;
    }
    text += "\n";
  }
  return text;
}

// Постійно питаємо Telegram: "Є нові повідомлення?"
async function checkUpdates() {
  const response = await fetch(`${URL}/getUpdates?offset=${offset}&timeout=30`);
  const data = await response.json();

  if (!data.ok) {
    console.log("Telegram каже:", data.description);
    await new Promise((resolve) => setTimeout(resolve, 5000)); // пауза 5 секунд
    return;
  }

  for (const update of data.result) {
    offset = update.update_id + 1;
    if (update.message) {
      await handleMessage(update.message);
    }
  }
}

async function run() {
  while (true) {
    try {
      await checkUpdates();
    } catch (error) {
      console.log("Помилка:", error.message);
    }
  }
}

run();
