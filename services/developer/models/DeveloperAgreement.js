import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class DeveloperAgreement {
  static async create(data) {
    const {
      developer_id,
      doc_type_id,
      agreed_at,
      signature_upload_id,
    } = data;

    const query = `
      INSERT INTO developer_agreements (
        developer_id, doc_type_id, agreed_at, signature_upload_id,
        status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const now = getCurrentTimestampString();
    const [result] = await pool.execute(query, [
      developer_id ?? null,
      doc_type_id ?? null,
      agreed_at ?? null,
      signature_upload_id ?? null,
      1,
      now,
    ]);

    return result.insertId;
  }

  static async findByDeveloperId(developerId) {
    const query = 'SELECT * FROM developer_agreements WHERE developer_id = ? AND status = 1';
    const [rows] = await pool.execute(query, [developerId]);
    return rows;
  }

  static async deleteByDeveloperId(developerId) {
    const query = 'DELETE FROM developer_agreements WHERE developer_id = ?';
    await pool.execute(query, [developerId]);
  }

  static async deleteByDeveloperIdAndDocType(developerId, docTypeId) {
    const query = 'DELETE FROM developer_agreements WHERE developer_id = ? AND doc_type_id = ?';
    await pool.execute(query, [developerId, docTypeId]);
  }
}

export default DeveloperAgreement;
