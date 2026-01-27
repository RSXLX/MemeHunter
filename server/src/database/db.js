/**
 * SQLite 数据库初始化
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 允许通过环境变量配置数据目录 (适配 Railway Volume)
const dataDir = process.env.DATA_DIR || join(__dirname, '../../data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = join(dataDir, 'memehunter.db');
const db = new Database(dbPath);

// 启用 WAL 模式提升性能
db.pragma('journal_mode = WAL');

// 初始化表结构
db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    nickname TEXT NOT NULL,
    wallet_address TEXT,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  
  -- 房间表
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    pool_balance INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 10,
    meme_count INTEGER DEFAULT 8,
    net_costs TEXT DEFAULT '[0.005, 0.01, 0.02]',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );
  
  -- 领取申请表
  CREATE TABLE IF NOT EXISTS withdraw_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    tx_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    processed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  -- 游戏记录表 (用于统计)
  CREATE TABLE IF NOT EXISTS game_records (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    meme_id INTEGER,
    reward INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  -- 索引
  CREATE INDEX IF NOT EXISTS idx_users_session ON users(session_id);
  CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
  CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw_requests(status);
  CREATE INDEX IF NOT EXISTS idx_game_records_room ON game_records(room_id);
  CREATE INDEX IF NOT EXISTS idx_game_records_user ON game_records(user_id);
`);

console.log('📦 Database initialized:', dbPath);

export default db;
