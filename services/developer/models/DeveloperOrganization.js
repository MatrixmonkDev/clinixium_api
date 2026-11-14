import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class DeveloperOrganization {
  static async create(data) {
    const {
      developer_id,
      legal_organization_name,
      organization_type,
      organization_website,
      business_registration_number,
      country_id,
      street_address,
      city,
      state,
      zip_code,
    } = data;

    const query = `
      INSERT INTO developer_organizations (
        developer_id, legal_organization_name, organization_type, organization_website,
        business_registration_number, country_id, street_address, city, state, zip_code,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const now = getCurrentTimestampString();
    const [result] = await pool.execute(query, [
      developer_id,
      legal_organization_name ?? null,
      organization_type ?? null,
      organization_website ?? null,
      business_registration_number ?? null,
      country_id ?? null,
      street_address ?? null,
      city ?? null,
      state ?? null,
      zip_code ?? null,
      1,
      now,
    ]);

    return result.insertId;
  }

  static async findByDeveloperId(developerId) {
    const query = 'SELECT * FROM developer_organizations WHERE developer_id = ? AND status = 1';
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

    const query = `UPDATE developer_organizations SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async deleteByDeveloperId(developerId) {
    const query = 'DELETE FROM developer_organizations WHERE developer_id = ?';
    await pool.execute(query, [developerId]);
  }
}

export default DeveloperOrganization;
