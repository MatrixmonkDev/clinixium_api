import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class ImagingModality {
  static async create(data) {
    const { name, description } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO imaging_modalities (name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [name, description, now, now]);
    return result.insertId;
  }

  static async findAll() {
    const query = `
      SELECT * FROM imaging_modalities
      WHERE is_active = 1 AND status = 1
      ORDER BY name ASC
    `;

    const [rows] = await pool.execute(query);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM imaging_modalities WHERE id = ?';
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

    const query = `UPDATE imaging_modalities SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'DELETE FROM imaging_modalities WHERE id = ?';
    await pool.execute(query, [id]);
  }
}

export default ImagingModality;
