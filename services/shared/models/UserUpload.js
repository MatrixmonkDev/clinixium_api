import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class UserUpload {
  static async create(data) {
    const { user_id, user_type, doc_type_id, url, file_name, file_size, mime_type, storage_provider, description } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO user_uploads (user_id, user_type, doc_type_id, url, file_name, file_size, mime_type, storage_provider, description, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      user_id,
      user_type,
      doc_type_id,
      url,
      file_name,
      file_size,
      mime_type,
      storage_provider || 'local',
      description ?? null,
      now
    ]);
    return result.insertId;
  }

  static async findByUser(userId, userType) {
    const query = `
      SELECT 
        uu.*,
        dt.name as doc_type_name,
        dt.category as doc_type_category
      FROM user_uploads uu
      JOIN doc_types dt ON uu.doc_type_id = dt.id
      WHERE uu.user_id = ? AND uu.user_type = ? AND uu.status = 1
      ORDER BY uu.created_at DESC
    `;

    const [rows] = await pool.execute(query, [userId, userType]);
    return rows;
  }

  static async findById(id) {
    const query = `
      SELECT 
        uu.*,
        dt.name as doc_type_name,
        dt.category as doc_type_category
      FROM user_uploads uu
      JOIN doc_types dt ON uu.doc_type_id = dt.id
      WHERE uu.id = ?
    `;

    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async findByDocType(userId, userType, docTypeCategory) {
    const query = `
      SELECT 
        uu.*,
        dt.name as doc_type_name,
        dt.category as doc_type_category
      FROM user_uploads uu
      JOIN doc_types dt ON uu.doc_type_id = dt.id
      WHERE uu.user_id = ? AND uu.user_type = ? AND dt.category = ? AND uu.status = 1
      ORDER BY uu.created_at DESC
    `;

    const [rows] = await pool.execute(query, [userId, userType, docTypeCategory]);
    return rows;
  }

  static async updateVerification(id, data) {
    const { is_verified, verified_by } = data;
    const now = getCurrentTimestampString();

    const query = `
      UPDATE user_uploads
      SET is_verified = ?, verified_at = ?, verified_by = ?
      WHERE id = ?
    `;

    await pool.execute(query, [is_verified, now, verified_by, id]);
  }

  static async delete(id) {
    const query = 'DELETE FROM user_uploads WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async deleteByUser(userId, userType) {
    const query = 'DELETE FROM user_uploads WHERE user_id = ? AND user_type = ?';
    await pool.execute(query, [userId, userType]);
  }
}

export default UserUpload;
