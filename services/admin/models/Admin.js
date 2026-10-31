import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class Admin {
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
    } = data;

    const query = `
      INSERT INTO admin_mst (
        user_id, user_name, user_mname, user_lname,
        thumbnail, user_email, user_password, rand_key,
        insert_date, last_login, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = getCurrentTimestampString();
    const [result] = await pool.execute(query, [
      user_id,
      user_name,
      user_mname ?? null,
      user_lname ?? null,
      thumbnail ?? null,
      user_email,
      user_password,
      rand_key ?? null,
      now,
      now,
      1,
    ]);

    return result.insertId;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM admin_mst WHERE user_email = ?';
    const [rows] = await pool.execute(query, [email]);
    return rows[0];
  }

  static async findByUserId(userId) {
    const query = 'SELECT * FROM admin_mst WHERE user_id = ?';
    const [rows] = await pool.execute(query, [userId]);
    return rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM admin_mst WHERE id = ?';
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

    values.push(id);
    const query = `UPDATE admin_mst SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async updateLoginAttempts(id, attempts, lockedUntil = null) {
    const query = `
      UPDATE admin_mst
      SET failed_login_attempts = ?, locked_until = ?
      WHERE id = ?
    `;
    await pool.execute(query, [attempts, lockedUntil, id]);
  }

  static async getPublicProfile(id) {
    const query = `
      SELECT
        id, user_id, user_name, user_mname, user_lname,
        thumbnail, user_email, insert_date, last_login, status
      FROM admin_mst
      WHERE id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }
}

export default Admin;
