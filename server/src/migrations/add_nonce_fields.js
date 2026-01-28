/**
 * 数据库迁移: 添加钱包认证相关字段
 * - nonce: 登录签名随机数
 * - nonce_expires_at: nonce 过期时间
 * - wallet_address 唯一索引
 */
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = process.env.DATA_DIR || join(__dirname, '../../data');
const dbPath = join(dataDir, 'memehunter.db');

console.log('📦 Running migration: add_nonce_fields');
console.log('   Database:', dbPath);

const db = new Database(dbPath);

try {
    // 检查 nonce 字段是否存在
    const columns = db.pragma('table_info(users)');
    const hasNonce = columns.some(col => col.name === 'nonce');
    const hasNonceExpires = columns.some(col => col.name === 'nonce_expires_at');

    if (!hasNonce) {
        console.log('   Adding column: nonce');
        db.exec('ALTER TABLE users ADD COLUMN nonce TEXT');
    } else {
        console.log('   Column nonce already exists, skipping');
    }

    if (!hasNonceExpires) {
        console.log('   Adding column: nonce_expires_at');
        db.exec('ALTER TABLE users ADD COLUMN nonce_expires_at TEXT');
    } else {
        console.log('   Column nonce_expires_at already exists, skipping');
    }

    // 检查唯一索引是否存在
    const indexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='users' AND name='idx_users_wallet_unique'
    `).all();

    if (indexes.length === 0) {
        console.log('   Creating unique index: idx_users_wallet_unique');
        db.exec(`
            CREATE UNIQUE INDEX idx_users_wallet_unique 
            ON users(wallet_address) 
            WHERE wallet_address IS NOT NULL
        `);
    } else {
        console.log('   Index idx_users_wallet_unique already exists, skipping');
    }

    console.log('✅ Migration completed successfully');
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
} finally {
    db.close();
}
