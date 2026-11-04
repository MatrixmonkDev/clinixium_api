import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class PhysicianAIExperience {
  static async create(data) {
    const { physician_id, ai_annotation_experience_id } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO physician_ai_experiences (physician_id, ai_annotation_experience_id, created_at)
      VALUES (?, ?, ?)
    `;

    const [result] = await pool.execute(query, [physician_id, ai_annotation_experience_id, now]);
    return result.insertId;
  }

  static async findByPhysician(physicianId) {
    const query = `
      SELECT 
        pae.*,
        aae.name as experience_name,
        aae.description as experience_description
      FROM physician_ai_experiences pae
      JOIN ai_annotation_experiences aae ON pae.ai_annotation_experience_id = aae.id
      WHERE pae.physician_id = ? AND pae.status = 1
      ORDER BY aae.name ASC
    `;

    const [rows] = await pool.execute(query, [physicianId]);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM physician_ai_experiences WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM physician_ai_experiences WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async deleteByPhysician(physicianId) {
    const query = 'DELETE FROM physician_ai_experiences WHERE physician_id = ?';
    await pool.execute(query, [physicianId]);
  }
}

export default PhysicianAIExperience;
