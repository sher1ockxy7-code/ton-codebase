const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEPOSIT_ADDRESS = process.env.DEPOSIT_ADDRESS || "";

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is missing in .env");
  process.exit(1);
}

// --- DB ---
const db = new Database("app.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  wallet_address TEXT NOT NULL,
  connected_at TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE(user_id, wallet_address),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS deposit_codes (
  code TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  used_tx_hash TEXT,
  used_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

// --- Telegram initData verification ---
function parseInitData(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;

  const data = [];
  params.forEach((value, key) => {
    if (key !== "hash") data.push(`${key}=${value}`);
  });
  data.sort();
  return { hash, dataCheckString: data.join("\n"), params };
}

function verifyTelegramInitData(initData) {
  const parsed = parseInitData(initData);
  if (!parsed) return { ok: false, error: "No hash" };

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(parsed.dataCheckString).digest("hex");

  if (computedHash !== parsed.hash) return { ok: false, error: "Bad hash" };

  const userRaw = parsed.params.get("user");
  if (!userRaw) return { ok: false, error: "No user" };

  let user;
  try {
    user = JSON.parse(userRaw);
  } catch {
    return { ok: false, error: "Bad user JSON" };
  }

  return { ok: true, user };
}

// --- auth middleware ---
function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Bad token" });
  }
}

// health
app.get("/", (req, res) => res.json({ status: "Server is working 🚀" }));

// 1) LOGIN via Telegram initData
app.post("/auth/telegram", (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: "initData required" });

  const v = verifyTelegramInitData(initData);
  if (!v.ok) return res.status(401).json({ error: v.error });

  const tg = v.user;
  const now = new Date().toISOString();

  const existing = db.prepare("SELECT * FROM users WHERE telegram_id=?").get(tg.id);

  let userId;
  if (!existing) {
    const info = db.prepare(
      "INSERT INTO users (telegram_id, username, first_name, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)"
    ).run(tg.id, tg.username || null, tg.first_name || null, now, now);
    userId = info.lastInsertRowid;
  } else {
    db.prepare("UPDATE users SET last_seen_at=? WHERE telegram_id=?").run(now, tg.id);
    userId = existing.id;
  }

  const token = jwt.sign({ userId, telegramId: tg.id }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, userId, telegramId: tg.id });
});

// 2) Link wallet
app.post("/wallet/link", auth, (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });

  const now = new Date().toISOString();
  db.prepare(
    "INSERT OR IGNORE INTO wallet_links (user_id, wallet_address, connected_at, is_active) VALUES (?, ?, ?, 1)"
  ).run(req.user.userId, walletAddress, now);

  res.json({ ok: true });
});

// 3) Create deposit code for this user
app.post("/deposit/request", auth, (req, res) => {
  if (!DEPOSIT_ADDRESS) return res.status(500).json({ error: "DEPOSIT_ADDRESS not set" });

  const code = "DPT-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const now = new Date().toISOString();

  db.prepare("INSERT INTO deposit_codes (code, user_id, created_at) VALUES (?, ?, ?)")
    .run(code, req.user.userId, now);

  res.json({
    depositAddress: DEPOSIT_ADDRESS,
    depositCode: code,
    instruction: "Отправь TON на depositAddress и вставь depositCode в комментарий (memo)."
  });
});

// debug
app.get("/me", auth, (req, res) => {
  const u = db.prepare("SELECT id, telegram_id, username, first_name, created_at, last_seen_at FROM users WHERE id=?")
    .get(req.user.userId);
  const wallets = db.prepare("SELECT wallet_address, connected_at FROM wallet_links WHERE user_id=? AND is_active=1")
    .all(req.user.userId);
  res.json({ user: u, wallets });
});

app.listen(PORT, () =>
  console.log(`🚀 Server running on: https://profit-pcs-dylan-court.trycloudflare.com (port ${PORT})`)
);
