/**
 * 评论服务 - 房间聊天消息管理
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

// 预编译 SQL 语句
const stmts = {
    insertComment: db.prepare(`
    INSERT INTO room_comments (id, room_id, user_id, content)
    VALUES (@id, @roomId, @userId, @content)
  `),

    getCommentsByRoom: db.prepare(`
    SELECT c.*, u.nickname as user_nickname
    FROM room_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.room_id = ?
    ORDER BY c.created_at DESC
    LIMIT ?
  `),

    getRecentComments: db.prepare(`
    SELECT c.*, u.nickname as user_nickname
    FROM room_comments c
    LEFT JOIN users u ON c.user_id = u.id
    WHERE c.room_id = ?
    ORDER BY c.created_at ASC
    LIMIT ?
  `),

    deleteComment: db.prepare(`
    DELETE FROM room_comments WHERE id = ? AND user_id = ?
  `),
};

// 消息内容最大长度
const MAX_CONTENT_LENGTH = 500;

/**
 * 评论服务类
 */
class CommentService {
    /**
     * 添加评论
     */
    addComment(roomId, userId, content) {
        // 验证内容
        if (!content || content.trim().length === 0) {
            throw new Error('Comment content is required');
        }

        const trimmedContent = content.trim().slice(0, MAX_CONTENT_LENGTH);

        const commentId = uuidv4();

        stmts.insertComment.run({
            id: commentId,
            roomId: roomId,
            userId: userId,
            content: trimmedContent,
        });

        // 返回新创建的评论
        return {
            id: commentId,
            roomId: roomId,
            userId: userId,
            content: trimmedContent,
            createdAt: new Date().toISOString(),
        };
    }

    /**
     * 获取房间评论（最新在前）
     */
    getComments(roomId, limit = 50) {
        const comments = stmts.getCommentsByRoom.all(roomId, limit);
        return comments.map(c => this._formatComment(c)).reverse(); // 时间正序
    }

    /**
     * 获取最近评论（用于加入房间时加载历史）
     */
    getRecentComments(roomId, limit = 20) {
        const comments = stmts.getRecentComments.all(roomId, limit);
        return comments.map(c => this._formatComment(c));
    }

    /**
     * 删除评论（仅作者可删除）
     */
    deleteComment(commentId, userId) {
        const result = stmts.deleteComment.run(commentId, userId);
        return result.changes > 0;
    }

    /**
     * 格式化评论对象
     */
    _formatComment(dbComment) {
        return {
            id: dbComment.id,
            roomId: dbComment.room_id,
            userId: dbComment.user_id,
            nickname: dbComment.user_nickname || 'Anonymous',
            content: dbComment.content,
            timestamp: new Date(dbComment.created_at).getTime(),
            createdAt: dbComment.created_at,
        };
    }
}

// 导出单例
export const commentService = new CommentService();
export default commentService;
