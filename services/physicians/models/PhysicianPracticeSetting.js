import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class PhysicianPracticeSetting {
  static async create(data) {
    const { physician_id, practice_setting_id, other_value } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO physician_practice_settings (physician_id, practice_setting_id, other_value, created_at)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [physician_id, practice_setting_id, other_value, now]);
    return result.insertId;
  }

  static async findByPhysician(physicianId) {
    const query = `
      SELECT 
        pps.*,
        ps.name as setting_name,
        ps.description as setting_description
      FROM physician_practice_settings pps
      JOIN practice_settings ps ON pps.practice_setting_id = ps.id
      WHERE pps.physician_id = ? AND pps.status = 1
      ORDER BY ps.name ASC
    `;

    const [rows] = await pool.execute(query, [physicianId]);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM physician_practice_settings WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM physician_practice_settings WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async deleteByPhysician(physicianId) {
    const query = 'DELETE FROM physician_practice_settings WHERE physician_id = ?';
    await pool.execute(query, [physicianId]);
  }
}

export default PhysicianPracticeSetting;
