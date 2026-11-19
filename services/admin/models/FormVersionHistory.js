import pool from '../../../config/database.js';

class FormVersionHistory {
  static async create(data) {
    const {
      form_template_id,
      version,
      changed_by_user_id,
      changed_by_user_type,
      change_summary,
      change_type,
      fields_snapshot,
    } = data;

    const query = `
      INSERT INTO form_version_history (
        form_template_id, version, changed_by_user_id, changed_by_user_type,
        change_summary, change_type, fields_snapshot, created_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)
    `;

    const [result] = await pool.execute(query, [
      form_template_id,
      version,
      changed_by_user_id,
      changed_by_user_type,
      change_summary || null,
      change_type,
      fields_snapshot ? JSON.stringify(fields_snapshot) : null,
    ]);

    return result.insertId;
  }

  static async findByFormTemplateId(formTemplateId) {
    const query = `
      SELECT 
        fvh.*,
        CASE 
          WHEN fvh.changed_by_user_type = 'A' THEN CONCAT(md.user_name, ' ', COALESCE(md.user_lname, ''))
          WHEN fvh.changed_by_user_type = 'D' THEN CONCAT(dm.user_name, ' ', COALESCE(dm.user_lname, ''))
          ELSE 'Unknown'
        END as changed_by_name
      FROM form_version_history fvh
      LEFT JOIN admin_mst md ON fvh.changed_by_user_id = md.id AND fvh.changed_by_user_type = 'A'
      LEFT JOIN developer_mst dm ON fvh.changed_by_user_id = dm.id AND fvh.changed_by_user_type = 'D'
      WHERE fvh.form_template_id = ? AND fvh.status = 1
      ORDER BY fvh.created_at DESC
    `;
    const [rows] = await pool.execute(query, [formTemplateId]);
    return rows;
  }

  static async findByVersion(formTemplateId, version) {
    const query = `
      SELECT * FROM form_version_history 
      WHERE form_template_id = ? AND version = ? AND status = 1
    `;
    const [rows] = await pool.execute(query, [formTemplateId, version]);
    return rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM form_version_history WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async archive(id) {
    const query = 'UPDATE form_version_history SET status = 0 WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async getLatestVersion(formTemplateId) {
    const query = `
      SELECT * FROM form_version_history 
      WHERE form_template_id = ? AND status = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [formTemplateId]);
    return rows[0];
  }
}

export default FormVersionHistory;
