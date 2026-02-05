const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sqlite3 = require("sqlite3").verbose();
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEPOSIT_ADDRESS = process.env.DEPOSIT_ADDRESS || "";

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is missing in environment variables");
  process.exit(1);
}

// --- DB (sqlite3) ---
const db = new sqlite3.Database("app.db");

// Create tables
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      created_at TEXT NOT NULL,
      last_seen_at TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS wallet_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wallet_address TEXT NOT NULL,
      connected_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      UNIQUE(user_id, wallet_address)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS deposit_codes (
      code TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      used_tx_hash TEXT,
      used_at TEXT
    )
  `);
});

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

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(BOT_TOKEN)
    .digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(parsed.dataCheckString)
    .digest("hex");

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

// LOGIN via Telegram initData
app.post("/auth/telegram", (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: "initData required" });

  const v = verifyTelegramInitData(initData);
  if (!v.ok) return res.status(401).json({ error: v.error });

  const tg = v.user;
  const now = new Date().toISOString();

  db.get("SELECT id FROM users WHERE telegram_id = ?", [tg.id], (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });

    const finish = (userId) => {
      const token = jwt.sign(
        { userId, telegramId: tg.id },
        JWT_SECRET,
        { expiresIn: "30d" }
      );
      res.json({ token, userId, telegramId: tg.id });
    };

    if (!row) {
      db.run(
        "INSERT INTO users (telegram_id, username, first_name, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)",
        [tg.id, tg.username || null, tg.first_name || null, now, now],
        function (err2) {
          if (err2) return res.status(500).json({ error: "DB insert error" });
          finish(this.lastID);
        }
      );
    } else {
      db.run(
        "UPDATE users SET last_seen_at = ? WHERE telegram_id = ?",
        [now, tg.id],
        (err2) => {
          if (err2) return res.status(500).json({ error: "DB update error" });
          finish(row.id);
        }
      );
    }
  });
});

// Link wallet to user
app.post("/wallet/link", auth, (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });

  const now = new Date().toISOString();
  db.run(
    "INSERT OR IGNORE INTO wallet_links (user_id, wallet_address, connected_at, is_active) VALUES (?, ?, ?, 1)",
    [req.user.userId, walletAddress, now],
    (err) => {
      if (err) return res.status(500).json({ error: "DB error" });
      res.json({ ok: true });
    }
  );
});

// Create deposit code for this user
app.post("/deposit/request", auth, (req, res) => {
  if (!DEPOSIT_ADDRESS) return res.status(500).json({ error: "DEPOSIT_ADDRESS not set" });

  const code = "DPT-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const now = new Date().toISOString();

  db.run(
    "INSERT INTO deposit_codes (code, user_id, created_at) VALUES (?, ?, ?)",
    [code, req.user.userId, now],
    (err) => {
      if (err) return res.status(500).json({ error: "DB error" });

      res.json({
        depositAddress: DEPOSIT_ADDRESS,
        depositCode: code,
        instruction: "Отправь TON на depositAddress и вставь depositCode в комментарий (memo)."
      });
    }
  );
});

// Debug: show current user + wallets
app.get("/me", auth, (req, res) => {
  db.get(
    "SELECT id, telegram_id, username, first_name, created_at, last_seen_at FROM users WHERE id = ?",
    [req.user.userId],
    (err, user) => {
      if (err) return res.status(500).json({ error: "DB error" });

      db.all(
        "SELECT wallet_address, connected_at FROM wallet_links WHERE user_id = ? AND is_active = 1",
        [req.user.userId],
        (err2, wallets) => {
          if (err2) return res.status(500).json({ error: "DB error" });
          res.json({ user, wallets });
        }
      );
    }
  );
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on http://localhost:" + PORT);
});
