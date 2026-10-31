import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class Physician {
  static async create(data) {
    const {
      uuid,
      email,
      password_hash,
      first_name,
      last_name,
      phone_country_code,
      phone_number,
      professional_title,
      timezone,
      language,
    } = data;

    const now = getCurrentTimestampString();
    const query = `
      INSERT INTO physicians (
        uuid, email, password_hash, first_name, last_name,
        phone_country_code, phone_number, professional_title,
        timezone, language, created_on
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      uuid,
      email,
      password_hash,
      first_name,
      last_name,
      phone_country_code ?? null,
      phone_number ?? null,
      professional_title ?? null,
      timezone ?? null,
      language ?? null,
      now,
    ]);

    return result.insertId;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM physicians WHERE email = ?';
    const [rows] = await pool.execute(query, [email]);
    return rows[0];
  }

  static async findByUUID(uuid) {
    const query = 'SELECT * FROM physicians WHERE uuid = ?';
    const [rows] = await pool.execute(query, [uuid]);
    return rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM physicians WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE physicians SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async updateLoginAttempts(id, attempts, lockedUntil = null) {
    const query = `
      UPDATE physicians
      SET failed_login_attempts = ?, locked_until = ?
      WHERE id = ?
    `;
    await pool.execute(query, [attempts, lockedUntil, id]);
  }

  static async updateTwoFactor(id, data) {
    const { two_factor_enabled, two_factor_method, two_factor_secret, two_factor_recovery_codes, two_factor_confirmed_at } = data;
    const query = `
      UPDATE physicians
      SET two_factor_enabled = ?, two_factor_method = ?, two_factor_secret = ?,
          two_factor_recovery_codes = ?, two_factor_confirmed_at = ?
      WHERE id = ?
    `;
    await pool.execute(query, [
      two_factor_enabled,
      two_factor_method,
      two_factor_secret,
      two_factor_recovery_codes,
      two_factor_confirmed_at,
      id,
    ]);
  }

  static async getPublicProfile(id) {
    const query = `
      SELECT
        id, uuid, email, first_name, last_name,
        phone_country_code, phone_number, professional_title,
        profile_photo_path, timezone, language, about_me,
        primary_specialty, career_start_year, practice_setting,
        practice_setting_other, hospital_affiliation,
        ai_annotation_experience, npi_number, board_certified,
        npi_verified_at, identity_status, identity_provider,
        identity_session_id, identity_verified_at,
        conflict_of_interest, conflict_of_interest_details,
        compliance_completed_at, onboarding_step,
        onboarding_completed_at, two_factor_enabled, status
      FROM physicians
      WHERE id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }
}

export default Physician;
