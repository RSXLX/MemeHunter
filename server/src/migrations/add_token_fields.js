/**
 * 数据库迁移 - 添加代币相关字段到 rooms 表
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/memehunter.db');
const db = new Database(dbPath);

console.log('🔧 Running migration: add token fields to rooms');

try {
    const tableInfo = db.pragma('table_info(rooms)');
    
    // token_type
    if (!tableInfo.some(col => col.name === 'token_type')) {
        db.exec("ALTER TABLE rooms ADD COLUMN token_type TEXT DEFAULT 'SPL'");
        console.log('✅ Added token_type column');
    }
    
    // initial_deposit
    if (!tableInfo.some(col => col.name === 'initial_deposit')) {
        db.exec('ALTER TABLE rooms ADD COLUMN initial_deposit BIGINT DEFAULT 0');
        console.log('✅ Added initial_deposit column');
    }
    
    // remaining_balance
    if (!tableInfo.some(col => col.name === 'remaining_balance')) {
        db.exec('ALTER TABLE rooms ADD COLUMN remaining_balance BIGINT DEFAULT 0');
        console.log('✅ Added remaining_balance column');
    }
    
    // settled_at
    if (!tableInfo.some(col => col.name === 'settled_at')) {
        db.exec('ALTER TABLE rooms ADD COLUMN settled_at DATETIME DEFAULT NULL');
        console.log('✅ Added settled_at column');
    }
    
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}

db.close();
console.log('🎉 Migration completed!');
