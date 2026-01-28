/**
 * Claims 管理服务 - 房间结算与空投分发
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { solanaClient } from './solanaClient.js';

const stmts = {
    createClaim: db.prepare(`
        INSERT INTO claims (id, room_id, user_id, points, share_ratio, token_amount, status)
        VALUES (@id, @roomId, @userId, @points, @shareRatio, @tokenAmount, @status)
    `),
    
    getClaimById: db.prepare('SELECT * FROM claims WHERE id = ?'),
    getClaimsByRoom: db.prepare('SELECT * FROM claims WHERE room_id = ? ORDER BY token_amount DESC'),
    getClaimsByUser: db.prepare('SELECT * FROM claims WHERE user_id = ? ORDER BY created_at DESC'),
    getPendingClaimsByRoom: db.prepare("SELECT * FROM claims WHERE room_id = ? AND status = 'pending'"),
    
    updateClaimStatus: db.prepare(`
        UPDATE claims SET status = @status, tx_hash = @txHash, claimed_at = @claimedAt
        WHERE id = @id
    `),
    
    getRoomPlayerPoints: db.prepare(`
        SELECT user_id, SUM(reward) as total_points
        FROM game_records
        WHERE room_id = ?
        GROUP BY user_id
    `),
    
    updateRoomSettled: db.prepare(`
        UPDATE rooms SET status = 'settled', settled_at = @settledAt
        WHERE id = @id
    `),
    
    updateRoomStopped: db.prepare(`
        UPDATE rooms SET status = 'stopped', settled_at = @settledAt
        WHERE id = @id
    `),
    
    getRoomById: db.prepare('SELECT * FROM rooms WHERE id = ?'),
};

class ClaimManager {
    /**
     * 结算房间 - 计算各玩家份额并创建 claims
     */
    settleRoom(roomId) {
        const room = stmts.getRoomById.get(roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        
        if (room.status === 'settled' || room.status === 'stopped') {
            throw new Error('Room already settled');
        }
        
        // 获取所有玩家的积分
        const playerPoints = stmts.getRoomPlayerPoints.all(roomId);
        
        if (playerPoints.length === 0) {
            throw new Error('No players in room');
        }
        
        // 计算总积分
        const totalPoints = playerPoints.reduce((sum, p) => sum + p.total_points, 0);
        
        if (totalPoints === 0) {
            throw new Error('No points earned');
        }
        
        // 使用池余额计算 (remaining_balance 或 pool_balance)
        const poolBalance = room.remaining_balance || room.pool_balance || 0;
        
        // 创建 claims
        const claims = [];
        const createClaimsTransaction = db.transaction(() => {
            for (const player of playerPoints) {
                const shareRatio = player.total_points / totalPoints;
                const tokenAmount = Math.floor(poolBalance * shareRatio);
                
                const claim = {
                    id: uuidv4(),
                    roomId: roomId,
                    userId: player.user_id,
                    points: player.total_points,
                    shareRatio: shareRatio,
                    tokenAmount: tokenAmount,
                    status: 'pending',
                };
                
                stmts.createClaim.run(claim);
                claims.push(claim);
            }
            
            // 更新房间状态
            stmts.updateRoomSettled.run({
                id: roomId,
                settledAt: new Date().toISOString(),
            });
        });
        
        createClaimsTransaction();
        
        console.log(`📊 Room ${roomId} settled: ${claims.length} claims created`);
        
        return {
            roomId: roomId,
            totalPoints: totalPoints,
            poolBalance: poolBalance,
            claims: claims,
        };
    }
    
    /**
     * 房主停止房间 - 退回剩余代币
     */
    async stopRoom(roomId, creatorWallet) {
        const room = stmts.getRoomById.get(roomId);
        if (!room) {
            throw new Error('Room not found');
        }
        
        if (room.status === 'settled' || room.status === 'stopped') {
            throw new Error('Room already ended');
        }
        
        // 计算剩余金额
        const remainingBalance = room.remaining_balance || room.pool_balance || 0;
        
        // 如果有链上 PDA，调用合约退回
        let txHash = null;
        if (room.room_pda && remainingBalance > 0) {
            try {
                // TODO: 调用合约 refund 指令
                // const result = await solanaClient.refund(room.room_pda, creatorWallet, remainingBalance);
                // txHash = result.signature;
                console.log(`💰 Refund ${remainingBalance} to ${creatorWallet} (simulation)`);
            } catch (error) {
                console.error('Refund failed:', error);
                throw new Error('Refund transaction failed');
            }
        }
        
        // 更新房间状态
        stmts.updateRoomStopped.run({
            id: roomId,
            settledAt: new Date().toISOString(),
        });
        
        console.log(`🛑 Room ${roomId} stopped, refund: ${remainingBalance}`);
        
        return {
            roomId: roomId,
            refundAmount: remainingBalance,
            txHash: txHash,
        };
    }
    
    /**
     * 玩家领取 claim
     */
    async claimReward(claimId, userWallet) {
        const claim = stmts.getClaimById.get(claimId);
        if (!claim) {
            throw new Error('Claim not found');
        }
        
        if (claim.status !== 'pending') {
            throw new Error(`Claim already ${claim.status}`);
        }
        
        const room = stmts.getRoomById.get(claim.room_id);
        if (!room || !room.room_pda) {
            throw new Error('Room not on-chain');
        }
        
        // 调用链上领取
        try {
            const result = await solanaClient.claimReward(
                room.room_pda,
                userWallet, // 用户的 token account
                claim.token_amount
            );
            
            // 更新 claim 状态
            stmts.updateClaimStatus.run({
                id: claimId,
                status: 'completed',
                txHash: result.signature,
                claimedAt: new Date().toISOString(),
            });
            
            console.log(`✅ Claim ${claimId} completed: ${result.signature}`);
            
            return {
                success: true,
                claimId: claimId,
                txHash: result.signature,
                amount: claim.token_amount,
            };
        } catch (error) {
            // 标记失败
            stmts.updateClaimStatus.run({
                id: claimId,
                status: 'failed',
                txHash: null,
                claimedAt: new Date().toISOString(),
            });
            
            throw error;
        }
    }
    
    /**
     * 获取房间的所有 claims
     */
    getClaimsByRoom(roomId) {
        return stmts.getClaimsByRoom.all(roomId);
    }
    
    /**
     * 获取用户的所有 claims
     */
    getClaimsByUser(userId) {
        return stmts.getClaimsByUser.all(userId);
    }
    
    /**
     * 获取单个 claim
     */
    getClaimById(claimId) {
        return stmts.getClaimById.get(claimId);
    }
}

export const claimManager = new ClaimManager();
export default claimManager;
