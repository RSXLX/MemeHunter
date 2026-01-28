/**
 * 数据库迁移脚本 - 添加链上字段
 * 
 * 为 rooms 表添加：
 * - token_mint: 代币 Mint 地址
 * - room_pda: 链上房间 PDA 地址
 * - vault_pda: 链上 Vault PDA 地址
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../../data/memehunter.db');
const db = new Database(dbPath);

console.log('🔧 Running migration: add chain fields to rooms');

try {
    const tableInfo = db.pragma('table_info(rooms)');
    
    // 添加 token_mint
    if (!tableInfo.some(col => col.name === 'token_mint')) {
        db.exec('ALTER TABLE rooms ADD COLUMN token_mint TEXT DEFAULT NULL');
        console.log('✅ Added token_mint column');
    } else {
        console.log('⏭️ token_mint already exists');
    }
    
    // 添加 room_pda
    if (!tableInfo.some(col => col.name === 'room_pda')) {
        db.exec('ALTER TABLE rooms ADD COLUMN room_pda TEXT DEFAULT NULL');
        console.log('✅ Added room_pda column');
    } else {
        console.log('⏭️ room_pda already exists');
    }
    
    // 添加 vault_pda
    if (!tableInfo.some(col => col.name === 'vault_pda')) {
        db.exec('ALTER TABLE rooms ADD COLUMN vault_pda TEXT DEFAULT NULL');
        console.log('✅ Added vault_pda column');
    } else {
        console.log('⏭️ vault_pda already exists');
    }
    
} catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
}

db.close();
console.log('🎉 Migration completed successfully!');
