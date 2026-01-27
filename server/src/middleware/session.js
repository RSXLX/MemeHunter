/**
 * Session 中间件 - 验证用户会话
 */
import { userManager } from '../services/userManager.js';

/**
 * 从请求中提取 Session ID
 * 支持: Authorization header, Cookie, Query param
 */
function extractSessionId(req) {
    // 1. Authorization: Bearer <sessionId>
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // 2. X-Session-Id header
    const sessionHeader = req.headers['x-session-id'];
    if (sessionHeader) {
        return sessionHeader;
    }

    // 3. Cookie: session=<sessionId>
    const cookies = req.headers.cookie;
    if (cookies) {
        const match = cookies.match(/session=([^;]+)/);
        if (match) {
            return match[1];
        }
    }

    // 4. Query param: ?session=<sessionId>
    if (req.query?.session) {
        return req.query.session;
    }

    return null;
}

/**
 * Session 验证中间件
 * - 必须有有效 Session 才能访问
 */
export function requireSession(req, res, next) {
    const sessionId = extractSessionId(req);

    if (!sessionId) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Session ID required',
        });
    }

    const user = userManager.getUserBySession(sessionId);

    if (!user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired session',
        });
    }

    // 将用户信息挂载到请求对象
    req.user = user;
    req.sessionId = sessionId;

    next();
}

/**
 * 可选 Session 中间件
 * - 有 Session 就解析，没有也放行
 */
export function optionalSession(req, res, next) {
    const sessionId = extractSessionId(req);

    if (sessionId) {
        const user = userManager.getUserBySession(sessionId);
        if (user) {
            req.user = user;
            req.sessionId = sessionId;
        }
    }

    next();
}

export { extractSessionId };
