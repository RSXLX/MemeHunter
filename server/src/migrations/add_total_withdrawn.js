/**
 * 数据库迁移脚本 - 添加 total_withdrawn 列
 */
import db from '../database/db.js';

console.log('🔧 Running migration: add total_withdrawn column');

try {
    // 检查列是否存在
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    const hasColumn = tableInfo.some(col => col.name === 'total_withdrawn');

    if (hasColumn) {
        console.log('✅ Column total_withdrawn already exists, skipping.');
    } else {
        db.exec('ALTER TABLE users ADD COLUMN total_withdrawn INTEGER DEFAULT 0');
        console.log('✅ Added total_withdrawn column to users table.');
    }
} catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
}

console.log('✅ Migration completed successfully!');
