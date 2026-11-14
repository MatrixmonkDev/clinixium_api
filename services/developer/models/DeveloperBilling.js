import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class DeveloperBilling {
  static async create(data) {
    const {
      developer_id,
      organization_id,
      billing_email,
      billing_phone,
      billing_address,
      billing_city,
      billing_state,
      billing_zip_code,
      billing_country_id,
      tax_id,
    } = data;

    const query = `
      INSERT INTO developer_billing (
        developer_id, organization_id, billing_email, billing_phone,
        billing_address, billing_city, billing_state, billing_zip_code,
        billing_country_id, tax_id,
        billing_status, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = getCurrentTimestampString();
    const [result] = await pool.execute(query, [
      developer_id,
      organization_id,
      billing_email ?? null,
      billing_phone ?? null,
      billing_address ?? null,
      billing_city ?? null,
      billing_state ?? null,
      billing_zip_code ?? null,
      billing_country_id ?? null,
      tax_id ?? null,
      'trial',
      1,
      now,
    ]);

    return result.insertId;
  }

  static async findByDeveloperId(developerId) {
    const query = 'SELECT * FROM developer_billing WHERE developer_id = ? AND status = 1';
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

    const query = `UPDATE developer_billing SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async deleteByDeveloperId(developerId) {
    const query = 'DELETE FROM developer_billing WHERE developer_id = ?';
    await pool.execute(query, [developerId]);
  }
}

export default DeveloperBilling;
