import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class MedicalDepartment {
  static async create(data) {
    const { name, description } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO medical_departments (name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [name, description, now, now]);
    return result.insertId;
  }

  static async findAll() {
    const query = `
      SELECT 
        md.*,
        COUNT(DISTINCT pd.physician_id) as physician_count
      FROM medical_departments md
      LEFT JOIN physician_departments pd ON md.id = pd.medical_department_id AND pd.status = 1
      WHERE md.is_active = 1 AND md.status = 1
      GROUP BY md.id
      ORDER BY md.name ASC
    `;

    const [rows] = await pool.execute(query);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM medical_departments WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(getCurrentTimestampString());
    values.push(id);

    const query = `UPDATE medical_departments SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'DELETE FROM medical_departments WHERE id = ?';
    await pool.execute(query, [id]);
  }
}

export default MedicalDepartment;
