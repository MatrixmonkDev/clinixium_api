import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class PhysicianDepartment {
  static async create(data) {
    const { physician_id, medical_department_id, is_primary } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO physician_departments (physician_id, medical_department_id, is_primary, created_at)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [physician_id, medical_department_id, is_primary || 0, now]);
    return result.insertId;
  }

  static async findByPhysician(physicianId) {
    const query = `
      SELECT 
        pd.*,
        md.name as department_name,
        md.description as department_description
      FROM physician_departments pd
      JOIN medical_departments md ON pd.medical_department_id = md.id
      WHERE pd.physician_id = ? AND pd.status = 1
      ORDER BY pd.is_primary DESC, md.name ASC
    `;

    const [rows] = await pool.execute(query, [physicianId]);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM physician_departments WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async removePrimary(physicianId) {
    const query = `
      UPDATE physician_departments
      SET is_primary = 0
      WHERE physician_id = ?
    `;
    await pool.execute(query, [physicianId]);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.is_primary !== undefined) {
      fields.push('is_primary = ?');
      values.push(data.is_primary);
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE physician_departments SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'DELETE FROM physician_departments WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async deleteByPhysician(physicianId) {
    const query = 'DELETE FROM physician_departments WHERE physician_id = ?';
    await pool.execute(query, [physicianId]);
  }
}

export default PhysicianDepartment;
