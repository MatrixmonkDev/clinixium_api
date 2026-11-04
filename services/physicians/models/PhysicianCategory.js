import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class PhysicianCategory {
  static async create(data) {
    const { physician_id, medical_category_id } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO physician_categories (physician_id, medical_category_id, created_at)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.execute(query, [physician_id, medical_category_id, now]);
    return result.insertId;
  }

  static async findByPhysician(physicianId) {
    const query = `
      SELECT 
        pc.*,
        mc.name as category_name,
        mc.description as category_description,
        mc.parent_id,
        parent.name as parent_name
      FROM physician_categories pc
      JOIN medical_categories mc ON pc.medical_category_id = mc.id
      LEFT JOIN medical_categories parent ON mc.parent_id = parent.id
      WHERE pc.physician_id = ? AND pc.status = 1
      ORDER BY mc.name ASC
    `;

    const [rows] = await pool.execute(query, [physicianId]);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM physician_categories WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM physician_categories WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async deleteByPhysician(physicianId) {
    const query = 'DELETE FROM physician_categories WHERE physician_id = ?';
    await pool.execute(query, [physicianId]);
  }
}

export default PhysicianCategory;
