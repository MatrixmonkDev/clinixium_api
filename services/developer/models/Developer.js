import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class Developer {
  static async create(data) {
    const {
      user_id,
      user_name,
      user_mname,
      user_lname,
      thumbnail,
      user_email,
      user_password,
      rand_key,
      email_verification_token,
      email_verification_expires_at,
      status,
      onboarding_step,
    } = data;

    const query = `
      INSERT INTO developer_mst (
        user_id, user_name, user_mname, user_lname,
        thumbnail, user_email, user_password, rand_key,
        email_verification_token, email_verification_expires_at,
        insert_date, last_login, status, onboarding_step
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = getCurrentTimestampString();
    const [result] = await pool.execute(query, [
      user_id,
      user_name ?? null,
      user_mname ?? null,
      user_lname ?? null,
      thumbnail ?? null,
      user_email ?? null,
      user_password ?? null,
      rand_key ?? null,
      email_verification_token ?? null,
      email_verification_expires_at ?? null,
      now,
      now,
      status ?? 1,
      onboarding_step ?? 1,
    ]);

    return result.insertId;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM developer_mst WHERE user_email = ?';
    const [rows] = await pool.execute(query, [email]);
    return rows[0];
  }

  static async findByEmailVerificationToken(token) {
    const query = 'SELECT * FROM developer_mst WHERE email_verification_token = ?';
    const [rows] = await pool.execute(query, [token]);
    return rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM developer_mst WHERE user_id = ?';
    const [rows] = await pool.execute(query, [userId]);
    return rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM developer_mst WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_on = ?');
    values.push(getCurrentTimestampString());
    values.push(id);

    const query = `UPDATE developer_mst SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async updateLoginAttempts(id, attempts, lockedUntil = null) {
    const query = `
      UPDATE developer_mst
      SET failed_login_attempts = ?, locked_until = ?
      WHERE id = ?
    `;
    await pool.execute(query, [attempts, lockedUntil, id]);
  }

  static async updateTwoFactor(id, data) {
    const fields = [];
    const values = [];

    if (data.two_factor_enabled !== undefined) {
      fields.push('two_factor_enabled = ?');
      values.push(data.two_factor_enabled);
    }
    if (data.two_factor_method !== undefined) {
      fields.push('two_factor_method = ?');
      values.push(data.two_factor_method ?? null);
    }
    if (data.two_factor_secret !== undefined) {
      fields.push('two_factor_secret = ?');
      values.push(data.two_factor_secret ?? null);
    }
    if (data.two_factor_recovery_codes !== undefined) {
      fields.push('two_factor_recovery_codes = ?');
      values.push(data.two_factor_recovery_codes ?? null);
    }
    if (data.two_factor_confirmed_at !== undefined) {
      fields.push('two_factor_confirmed_at = ?');
      values.push(data.two_factor_confirmed_at ?? null);
    }

    if (fields.length === 0) return;

    fields.push('updated_on = ?');
    values.push(getCurrentTimestampString());
    values.push(id);

    const query = `UPDATE developer_mst SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async getPublicProfile(id) {
    const query = `
      SELECT
        id, user_id, user_name, user_mname, user_lname,
        thumbnail, user_email, insert_date, last_login, status,
        two_factor_enabled, two_factor_method, two_factor_confirmed_at,
        onboarding_step, onboarding_completed_at, is_onboard_complete, is_approved
      FROM developer_mst
      WHERE id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    const developer = rows[0];

    if (developer && developer.thumbnail) {
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      developer.thumbnail = `${baseUrl}${developer.thumbnail}`;
    }

    return developer;
  }
}

export default Developer;
