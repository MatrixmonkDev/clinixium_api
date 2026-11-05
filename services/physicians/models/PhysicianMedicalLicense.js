import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class PhysicianMedicalLicense {
  static async create(data) {
    const { physician_id, license_number, state, expiry_date } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO physician_medical_licenses (physician_id, license_number, state, expiry_date, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [physician_id, license_number, state, expiry_date, now]);
    return result.insertId;
  }

  static async findByPhysicianId(physicianId) {
    const query = `
      SELECT * FROM physician_medical_licenses
      WHERE physician_id = ? AND status = 1
      ORDER BY expiry_date ASC
    `;

    const [rows] = await pool.execute(query, [physicianId]);
    return rows;
  }

  static async deleteByPhysicianId(physicianId) {
    const query = 'DELETE FROM physician_medical_licenses WHERE physician_id = ?';
    await pool.execute(query, [physicianId]);
  }

  static async delete(id) {
    const query = 'DELETE FROM physician_medical_licenses WHERE id = ?';
    await pool.execute(query, [id]);
  }
}

export default PhysicianMedicalLicense;
