import { v4 as uuidv4 } from 'uuid';
import { getCurrentTimestamp, getCurrentTimestampString, formatMySQLDate } from '../utils/timestamp.js';
import pool from '../config/database.js';

class PasswordResetService {
  static async generateResetToken(userId, userType) {
    const token = uuidv4();
    const expiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRY_MINUTES) || 30;
    const now = getCurrentTimestamp();

    const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);
    const expiresAtString = formatMySQLDate(expiresAt);
    const nowString = formatMySQLDate(now);

    const query = `
      INSERT INTO password_reset_tokens (user_id, user_type, token, expires_at, created_at, status)
      VALUES (?, ?, ?, ?, ?, 1)
    `;

    await pool.execute(query, [userId, userType, token, expiresAtString, nowString]);

    return token;
  }

  static async validateResetToken(token) {
    const query = `
      SELECT * FROM password_reset_tokens
      WHERE token = ?
    `;

    const [rows] = await pool.execute(query, [token]);

    if (!rows || rows.length === 0) {
      return { valid: false, reason: 'Token not found' };
    }

    const tokenRecord = rows[0];

    if (tokenRecord.status === 2) {
      return { valid: false, reason: 'Token already used' };
    }

    if (tokenRecord.status === 3) {
      return { valid: false, reason: 'Token expired' };
    }

    const now = getCurrentTimestamp();
    const expiresAt = new Date(tokenRecord.expires_at);

    if (expiresAt < now) {
      await this.markTokenAsExpired(token);
      return { valid: false, reason: 'Token expired' };
    }

    if (tokenRecord.status !== 1) {
      return { valid: false, reason: 'Token invalid' };
    }

    return {
      valid: true,
      userId: tokenRecord.user_id,
      userType: tokenRecord.user_type,
    };
  }

  static async markTokenAsUsed(token) {
    const now = getCurrentTimestampString();
    const query = `
      UPDATE password_reset_tokens
      SET status = 2, used_at = ?
      WHERE token = ?
    `;

    await pool.execute(query, [now, token]);
  }

  static async markTokenAsExpired(token) {
    const query = `
      UPDATE password_reset_tokens
      SET status = 3
      WHERE token = ?
    `;

    await pool.execute(query, [token]);
  }

  static async getUserByToken(token) {
    const query = `
      SELECT user_id, user_type FROM password_reset_tokens
      WHERE token = ? AND status = 1
    `;

    const [rows] = await pool.execute(query, [token]);

    if (!rows || rows.length === 0) {
      return null;
    }

    return {
      userId: rows[0].user_id,
      userType: rows[0].user_type,
    };
  }

  static async invalidateExpiredTokens() {
    const query = `
      UPDATE password_reset_tokens
      SET status = 3
      WHERE status = 1 AND expires_at < NOW()
    `;

    await pool.execute(query);
  }

  static async getUserByEmailAndType(email, userType) {
    let query;

    switch (userType) {
      case 'A':
        query = 'SELECT id, user_email, user_name, user_lname FROM admin_mst WHERE user_email = ?';
        break;
      case 'P':
        query = 'SELECT id, email, first_name, last_name FROM physicians WHERE email = ?';
        break;
      case 'D':
        query = 'SELECT id, user_email, user_name, user_lname FROM developer_mst WHERE user_email = ?';
        break;
      default:
        return null;
    }

    const [rows] = await pool.execute(query, [email]);

    if (!rows || rows.length === 0) {
      return null;
    }

    const user = rows[0];

    if (userType === 'A' || userType === 'D') {
      return {
        id: user.id,
        email: user.user_email,
        firstName: user.user_name,
        lastName: user.user_lname,
        userType: userType,
      };
    } else {
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: userType,
      };
    }
  }

  static async updateUserPassword(userId, userType, newPassword) {
    let query;

    switch (userType) {
      case 'A':
        query = 'UPDATE admin_mst SET user_password = ? WHERE id = ?';
        break;
      case 'P':
        query = 'UPDATE physicians SET password_hash = ? WHERE id = ?';
        break;
      case 'D':
        query = 'UPDATE developer_mst SET user_password = ? WHERE id = ?';
        break;
      default:
        throw new Error('Invalid user type');
    }

    await pool.execute(query, [newPassword, userId]);
  }
}

export default PasswordResetService;
