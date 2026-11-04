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
      phone_number,
      country_code_id,
      professional_title,
      timezone_id,
      language,
    } = data;

    const now = getCurrentTimestampString();
    const query = `
      INSERT INTO physicians (
        uuid, email, password_hash, first_name, last_name,
        phone_number, country_code_id, professional_title,
        timezone_id, language, created_on
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      uuid,
      email,
      password_hash,
      first_name,
      last_name,
      phone_number ?? null,
      country_code_id ?? null,
      professional_title ?? null,
      timezone_id ?? null,
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
    const fields = [];
    const values = [];

    if (data.two_factor_enabled !== undefined) {
      fields.push('two_factor_enabled = ?');
      values.push(data.two_factor_enabled);
    }
    if (data.two_factor_method !== undefined) {
      fields.push('two_factor_method = ?');
      values.push(data.two_factor_method);
    }
    if (data.two_factor_secret !== undefined) {
      fields.push('two_factor_secret = ?');
      values.push(data.two_factor_secret);
    }
    if (data.two_factor_recovery_codes !== undefined) {
      fields.push('two_factor_recovery_codes = ?');
      values.push(data.two_factor_recovery_codes);
    }
    if (data.two_factor_confirmed_at !== undefined) {
      fields.push('two_factor_confirmed_at = ?');
      values.push(data.two_factor_confirmed_at);
    }

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE physicians SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async getPublicProfile(id) {
    const query = `
      SELECT
        p.id, p.uuid, p.email, p.first_name, p.last_name,
        p.phone_number, p.country_code_id, cc.code as country_code, cc.name as country_name,
        p.timezone_id, tz.name as timezone_name, tz.utc_offset as timezone_offset,
        p.professional_title, p.profile_photo_path,
        p.language, p.about_me, p.career_start_year,
        p.practice_setting, p.practice_setting_other, p.hospital_affiliation,
        p.ai_annotation_experience, p.npi_number, p.board_certified,
        p.npi_verified_at, p.identity_status, p.identity_provider,
        p.identity_session_id, p.identity_verified_at,
        p.conflict_of_interest, p.conflict_of_interest_details,
        p.compliance_completed_at, p.onboarding_step,
        p.onboarding_completed_at, p.two_factor_enabled, p.status
      FROM physicians p
      LEFT JOIN country_codes cc ON p.country_code_id = cc.id
      LEFT JOIN timezones tz ON p.timezone_id = tz.id
      WHERE p.id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }
}

export default Physician;
