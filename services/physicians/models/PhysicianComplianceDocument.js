import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class PhysicianComplianceDocument {
  static async create(data) {
    const { physician_id, doc_type_id, signature_upload_id } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO physician_compliance_documents (physician_id, doc_type_id, agreed_at, signature_upload_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [physician_id, doc_type_id, now, signature_upload_id, now]);
    return result.insertId;
  }

  static async findByPhysicianId(physicianId) {
    const query = `
      SELECT
        pcd.*,
        dt.name as document_name,
        dt.description as document_description,
        u.url as signature_url
      FROM physician_compliance_documents pcd
      LEFT JOIN doc_types dt ON pcd.doc_type_id = dt.id
      LEFT JOIN user_uploads u ON pcd.signature_upload_id = u.id
      WHERE pcd.physician_id = ? AND pcd.status = 1
      ORDER BY pcd.agreed_at ASC
    `;

    const [rows] = await pool.execute(query, [physicianId]);
    return rows;
  }

  static async deleteByPhysicianId(physicianId) {
    const query = 'DELETE FROM physician_compliance_documents WHERE physician_id = ?';
    await pool.execute(query, [physicianId]);
  }

  static async delete(id) {
    const query = 'DELETE FROM physician_compliance_documents WHERE id = ?';
    await pool.execute(query, [id]);
  }
}

export default PhysicianComplianceDocument;
