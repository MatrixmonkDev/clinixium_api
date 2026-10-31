import pool from '../config/database.js';
import { randomBytes } from 'crypto';
import { getCurrentTimestampString } from '../utils/timestamp.js';

class RefreshTokenService {
  static async generateRefreshToken(userId, userType) {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO refresh_tokens (user_id, user_type, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [userId, userType, token, expiresAt, now]);

    return token;
  }

  static async verifyRefreshToken(token) {
    const query = `
      SELECT * FROM refresh_tokens
      WHERE token = ? AND revoked = 0 AND expires_at > NOW()
    `;

    const [rows] = await pool.execute(query, [token]);
    return rows[0];
  }

  static async revokeRefreshToken(token) {
    const now = getCurrentTimestampString();
    const query = `
      UPDATE refresh_tokens
      SET revoked = 1, revoked_at = ?
      WHERE token = ?
    `;

    await pool.execute(query, [now, token]);
  }

  static async revokeAllUserTokens(userId, userType) {
    const now = getCurrentTimestampString();
    const query = `
      UPDATE refresh_tokens
      SET revoked = 1, revoked_at = ?
      WHERE user_id = ? AND user_type = ? AND revoked = 0
    `;

    await pool.execute(query, [now, userId, userType]);
  }

  static async cleanupExpiredTokens() {
    const query = `
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW() OR (revoked = 1 AND revoked_at < DATE_SUB(NOW(), INTERVAL 7 DAY))
    `;

    await pool.execute(query);
  }
}

export default RefreshTokenService;
