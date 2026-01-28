/**
 * SQLite 数据库初始化
 * 包含自动迁移逻辑，确保数据库结构最新
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

/**
 * ---------------------------------------------------------
 * 1. 基础表结构定义 (包含所有最新字段)
 * ---------------------------------------------------------
 */

db.exec(`
  -- 用户表
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    nickname TEXT NOT NULL,
    wallet_address TEXT,
    nonce TEXT,
    nonce_expires_at TEXT,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_withdrawn INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  
  -- 房间表
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    token_mint TEXT,
    token_type TEXT DEFAULT 'SPL',
    pool_balance INTEGER DEFAULT 0,
    creator_deposit INTEGER DEFAULT 0,
    initial_deposit INTEGER DEFAULT 0,
    remaining_balance INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 10,
    meme_count INTEGER DEFAULT 8,
    net_costs TEXT DEFAULT '[0.005, 0.01, 0.02]',
    status TEXT DEFAULT 'active',
    room_pda TEXT,
    vault_pda TEXT,
    settled_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );
  
  -- 领取申请表 (旧版提现)
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

  -- 收益领取表 (新版)
  CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    points INTEGER NOT NULL,
    share_ratio REAL NOT NULL,
    token_amount INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    tx_hash TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    claimed_at TEXT,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
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
  
  -- 房间评论表 (聊天消息)
  CREATE TABLE IF NOT EXISTS room_comments (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  -- 索引
  CREATE INDEX IF NOT EXISTS idx_users_session ON users(session_id);
  CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wallet_unique ON users(wallet_address) WHERE wallet_address IS NOT NULL;
  
  CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
  
  CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw_requests(status);
  
  CREATE INDEX IF NOT EXISTS idx_claims_room ON claims(room_id);
  CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(user_id);
  CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
  
  CREATE INDEX IF NOT EXISTS idx_game_records_room ON game_records(room_id);
  CREATE INDEX IF NOT EXISTS idx_game_records_user ON game_records(user_id);
  
  CREATE INDEX IF NOT EXISTS idx_comments_room ON room_comments(room_id);
`);


/**
 * ---------------------------------------------------------
 * 2. 自动迁移逻辑 (修复旧数据库结构)
 * ---------------------------------------------------------
 */
function applyAutoMigrations(db) {
  try {
    // --- Users Table Migrations ---
    const userCols = db.pragma('table_info(users)');
    if (!userCols.some(col => col.name === 'nonce')) {
      console.log('🔧 Migrating: Adding users.nonce');
      db.exec('ALTER TABLE users ADD COLUMN nonce TEXT');
    }
    if (!userCols.some(col => col.name === 'nonce_expires_at')) {
      console.log('🔧 Migrating: Adding users.nonce_expires_at');
      db.exec('ALTER TABLE users ADD COLUMN nonce_expires_at TEXT');
    }

    // Fix unique index if not exists (handled by IF NOT EXISTS above, but good to ensure uniqueness)
    const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users' AND name='idx_users_wallet_unique'`).all();
    if (indexes.length === 0) {
       // Only try to create if not exists, though the CREATE block above usually handles it. 
       // We skip here as the main block covers it.
    }

    // --- Rooms Table Migrations ---
    const roomCols = db.pragma('table_info(rooms)');
    const roomFields = [
      { name: 'token_mint', type: 'TEXT' },
      { name: 'room_pda', type: 'TEXT' },
      { name: 'vault_pda', type: 'TEXT' },
      { name: 'token_type', type: 'TEXT DEFAULT \'SPL\'' },
      { name: 'initial_deposit', type: 'INTEGER DEFAULT 0' },
      { name: 'remaining_balance', type: 'INTEGER DEFAULT 0' },
      { name: 'settled_at', type: 'TEXT' }
    ];

    roomFields.forEach(field => {
      if (!roomCols.some(col => col.name === field.name)) {
        console.log(`🔧 Migrating: Adding rooms.${field.name}`);
        db.exec(`ALTER TABLE rooms ADD COLUMN ${field.name} ${field.type}`);
      }
    });

  } catch (error) {
    console.error('⚠️ Auto migration warning:', error.message);
    // Don't throw, allow app to try starting unless critical
  }
}

// 执行迁移
applyAutoMigrations(db);

console.log('📦 Database initialized:', dbPath);

export default db;
