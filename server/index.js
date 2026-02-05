const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
require("dotenv").config();
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const DEPOSIT_ADDRESS = process.env.DEPOSIT_ADDRESS || "";
const DATABASE_URL = process.env.DATABASE_URL;

if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN is missing");
  process.exit(1);
}
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is missing");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_links (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wallet_address TEXT NOT NULL,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      UNIQUE(user_id, wallet_address)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS deposit_codes (
      code TEXT PRIMARY KEY,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      used_tx_hash TEXT,
      used_at TIMESTAMPTZ
    )
  `);
}

// Telegram initData verification
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

// auth middleware
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

// Telegram login -> JWT
app.post("/auth/telegram", async (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: "initData required" });

  const v = verifyTelegramInitData(initData);
  if (!v.ok) return res.status(401).json({ error: v.error });

  const tg = v.user;

  try {
    const now = new Date().toISOString();

    const found = await pool.query(
      "SELECT id FROM users WHERE telegram_id=$1",
      [tg.id]
    );

    let userId;

    if (found.rows.length === 0) {
      const ins = await pool.query(
        `INSERT INTO users (telegram_id, username, first_name, created_at, last_seen_at)
         VALUES ($1,$2,$3,$4,$4) RETURNING id`,
        [tg.id, tg.username || null, tg.first_name || null, now]
      );
      userId = ins.rows[0].id;
    } else {
      userId = found.rows[0].id;
      await pool.query("UPDATE users SET last_seen_at=$1 WHERE id=$2", [
        now,
        userId,
      ]);
    }

    const token = jwt.sign({ userId, telegramId: tg.id }, JWT_SECRET, {
      expiresIn: "30d",
    });
    res.json({ token, userId, telegramId: tg.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB error" });
  }
});

// Link wallet
app.post("/wallet/link", auth, async (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress)
    return res.status(400).json({ error: "walletAddress required" });

  try {
    await pool.query(
      `INSERT INTO wallet_links (user_id, wallet_address, connected_at, is_active)
       VALUES ($1,$2,NOW(),TRUE)
       ON CONFLICT (user_id, wallet_address) DO UPDATE SET is_active=TRUE`,
      [req.user.userId, walletAddress]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB error" });
  }
});

// Create deposit code
app.post("/deposit/request", auth, async (req, res) => {
  if (!DEPOSIT_ADDRESS)
    return res.status(500).json({ error: "DEPOSIT_ADDRESS not set" });

  const code = "DPT-" + crypto.randomBytes(4).toString("hex").toUpperCase();

  try {
    await pool.query(
      "INSERT INTO deposit_codes (code, user_id, created_at) VALUES ($1,$2,NOW())",
      [code, req.user.userId]
    );

    res.json({
      depositAddress: DEPOSIT_ADDRESS,
      depositCode: code,
      instruction:
        "Отправь TON на depositAddress и вставь depositCode в комментарий (memo).",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB error" });
  }
});

// Debug
app.get("/me", auth, async (req, res) => {
  try {
    const u = await pool.query(
      "SELECT id, telegram_id, username, first_name, created_at, last_seen_at FROM users WHERE id=$1",
      [req.user.userId]
    );

    const w = await pool.query(
      "SELECT wallet_address, connected_at FROM wallet_links WHERE user_id=$1 AND is_active=TRUE",
      [req.user.userId]
    );

    res.json({ user: u.rows[0] || null, wallets: w.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "DB error" });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log("🚀 Server running on port " + PORT);
    });
  })
  .catch((e) => {
    console.error("❌ initDb failed", e);
    process.exit(1);
  });
