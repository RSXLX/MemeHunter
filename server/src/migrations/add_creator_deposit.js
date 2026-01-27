/**
 * 数据库迁移脚本 - 添加 creator_deposit 列
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/memehunter.db');
const db = new Database(dbPath);

console.log('🔧 Running migration: add creator_deposit column');

try {
    // 检查列是否已存在
    const tableInfo = db.pragma('table_info(rooms)');
    const hasColumn = tableInfo.some(col => col.name === 'creator_deposit');

    if (hasColumn) {
        console.log('✅ Column creator_deposit already exists, skipping.');
    } else {
        db.exec('ALTER TABLE rooms ADD COLUMN creator_deposit INTEGER DEFAULT 0');
        console.log('✅ Added creator_deposit column to rooms table.');
    }
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}

db.close();
console.log('🎉 Migration completed successfully!');
