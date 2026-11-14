import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class DeveloperRepresentative {
  static async create(data) {
    const {
      developer_id,
      organization_id,
      first_name,
      last_name,
      email,
      phone_number,
      country_code_id,
      role,
    } = data;

    const query = `
      INSERT INTO developer_representatives (
        developer_id, organization_id, first_name, last_name,
        email, phone_number, country_code_id, role,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = getCurrentTimestampString();
    const [result] = await pool.execute(query, [
      developer_id,
      organization_id,
      first_name ?? null,
      last_name ?? null,
      email ?? null,
      phone_number ?? null,
      country_code_id ?? null,
      role ?? null,
      1,
      now,
    ]);

    return result.insertId;
  }

  static async findByDeveloperId(developerId) {
    const query = 'SELECT * FROM developer_representatives WHERE developer_id = ? AND status = 1';
    const [rows] = await pool.execute(query, [developerId]);
    return rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      // Only update if value is provided (not undefined and not null)
      if (value !== undefined && value !== null && value !== '') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(getCurrentTimestampString());
    values.push(id);

    const query = `UPDATE developer_representatives SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async deleteByDeveloperId(developerId) {
    const query = 'DELETE FROM developer_representatives WHERE developer_id = ?';
    await pool.execute(query, [developerId]);
  }
}

export default DeveloperRepresentative;
