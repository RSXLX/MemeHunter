/**
 * 数据库迁移 - 创建 claims 表
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/memehunter.db');
const db = new Database(dbPath);

console.log('🔧 Running migration: create claims table');

try {
    // 检查表是否存在
    const tableExists = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='claims'"
    ).get();
    
    if (tableExists) {
        console.log('⏭️ claims table already exists');
    } else {
        db.exec(`
            CREATE TABLE claims (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                points INTEGER NOT NULL,
                share_ratio REAL NOT NULL,
                token_amount BIGINT NOT NULL,
                status TEXT DEFAULT 'pending',
                tx_hash TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                claimed_at DATETIME DEFAULT NULL
            )
        `);
        
        // 创建索引
        db.exec('CREATE INDEX idx_claims_room ON claims(room_id)');
        db.exec('CREATE INDEX idx_claims_user ON claims(user_id)');
        db.exec('CREATE INDEX idx_claims_status ON claims(status)');
        
        console.log('✅ Created claims table with indexes');
    }
    
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}

db.close();
console.log('🎉 Migration completed!');
