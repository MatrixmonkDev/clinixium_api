import pool from '../../../config/database.js';

class FormTemplate {
  static async create(data) {
    const {
      title,
      description,
      version,
      status,
      created_by_user_type,
      created_by_user_id,
      specialty,
      instructions,
      estimated_completion_time,
      department_id,
    } = data;

    const query = `
      INSERT INTO form_templates (
        title, description, version, status,
        created_by_user_type, created_by_user_id,
        specialty, instructions, estimated_completion_time,
        department_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    const [result] = await pool.execute(query, [
      title,
      description || null,
      version || '1.0',
      status || 'draft',
      created_by_user_type,
      created_by_user_id,
      specialty || null,
      instructions || null,
      estimated_completion_time || null,
      department_id || null,
    ]);

    return result.insertId;
  }

  static async findById(id) {
    const query = 'SELECT * FROM form_templates WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findAll(filters = {}) {
    let query = `
      SELECT 
        ft.*,
        d.name as department_name,
        CASE 
          WHEN ft.created_by_user_type = 'A' THEN CONCAT(md.user_name, ' ', COALESCE(md.user_lname, ''))
          WHEN ft.created_by_user_type = 'D' THEN CONCAT(dm.user_name, ' ', COALESCE(dm.user_lname, ''))
          ELSE 'Unknown'
        END as created_by_name,
        CASE 
          WHEN ft.approved_by_user_id IS NOT NULL AND ft.created_by_user_type = 'D' THEN 
            CONCAT(approver_md.user_name, ' ', COALESCE(approver_md.user_lname, ''))
          ELSE NULL
        END as approved_by_name
      FROM form_templates ft
      LEFT JOIN medical_departments d ON ft.department_id = d.id
      LEFT JOIN admin_mst md ON ft.created_by_user_id = md.id AND ft.created_by_user_type = 'A'
      LEFT JOIN developer_mst dm ON ft.created_by_user_id = dm.id AND ft.created_by_user_type = 'D'
      LEFT JOIN admin_mst approver_md ON ft.approved_by_user_id = approver_md.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND ft.status = ?';
      params.push(filters.status);
    }

    if (filters.department_id) {
      query += ' AND ft.department_id = ?';
      params.push(filters.department_id);
    }

    if (filters.created_by_user_type) {
      query += ' AND ft.created_by_user_type = ?';
      params.push(filters.created_by_user_type);
    }

    if (filters.created_by_user_id) {
      query += ' AND ft.created_by_user_id = ?';
      params.push(filters.created_by_user_id);
    }

    // Filter for developer forms with specific statuses
    if (filters.developer_status) {
      query += ' AND ft.created_by_user_type = ? AND ft.status = ?';
      params.push('D', filters.developer_status);
    }

    query += ' ORDER BY ft.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
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

    fields.push('updated_at = NOW()');
    values.push(id);

    const query = `UPDATE form_templates SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'DELETE FROM form_templates WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async updateStats(id) {
    const query = `
      UPDATE form_templates ft
      SET 
        total_fields = (SELECT COUNT(*) FROM form_fields WHERE form_template_id = ? AND status = 1),
        required_fields = (SELECT COUNT(*) FROM form_fields WHERE form_template_id = ? AND is_required = 1 AND status = 1),
        optional_fields = (SELECT COUNT(*) FROM form_fields WHERE form_template_id = ? AND is_required = 0 AND status = 1)
      WHERE id = ?
    `;
    await pool.execute(query, [id, id, id, id]);
  }

  static async getWithDetails(id) {
    const query = `
      SELECT 
        ft.*,
        d.name as department_name,
        CASE 
          WHEN ft.created_by_user_type = 'A' THEN CONCAT(md.user_name, ' ', COALESCE(md.user_lname, ''))
          WHEN ft.created_by_user_type = 'D' THEN CONCAT(dm.user_name, ' ', COALESCE(dm.user_lname, ''))
          ELSE 'Unknown'
        END as created_by_name,
        CASE 
          WHEN ft.approved_by_user_id IS NOT NULL AND ft.created_by_user_type = 'D' THEN 
            CONCAT(approver_md.user_name, ' ', COALESCE(approver_md.user_lname, ''))
          ELSE NULL
        END as approved_by_name
      FROM form_templates ft
      LEFT JOIN medical_departments d ON ft.department_id = d.id
      LEFT JOIN admin_mst md ON ft.created_by_user_id = md.id AND ft.created_by_user_type = 'A'
      LEFT JOIN developer_mst dm ON ft.created_by_user_id = dm.id AND ft.created_by_user_type = 'D'
      LEFT JOIN admin_mst approver_md ON ft.approved_by_user_id = approver_md.id
      WHERE ft.id = ?
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findWithMultipleVersions(filters = {}) {
    let query = `
      SELECT 
        ft.*,
        d.name as department_name,
        CASE 
          WHEN ft.created_by_user_type = 'A' THEN CONCAT(md.user_name, ' ', COALESCE(md.user_lname, ''))
          WHEN ft.created_by_user_type = 'D' THEN CONCAT(dm.user_name, ' ', COALESCE(dm.user_lname, ''))
          ELSE 'Unknown'
        END as created_by_name,
        CASE 
          WHEN ft.approved_by_user_id IS NOT NULL AND ft.created_by_user_type = 'D' THEN 
            CONCAT(approver_md.user_name, ' ', COALESCE(approver_md.user_lname, ''))
          ELSE NULL
        END as approved_by_name,
        COUNT(fvh.id) as version_count
      FROM form_templates ft
      LEFT JOIN medical_departments d ON ft.department_id = d.id
      LEFT JOIN admin_mst md ON ft.created_by_user_id = md.id AND ft.created_by_user_type = 'A'
      LEFT JOIN developer_mst dm ON ft.created_by_user_id = dm.id AND ft.created_by_user_type = 'D'
      LEFT JOIN admin_mst approver_md ON ft.approved_by_user_id = approver_md.id
      LEFT JOIN form_version_history fvh ON ft.id = fvh.form_template_id
      WHERE ft.status = 'active'
    `;
    const params = [];

    if (filters.department_id) {
      query += ' AND ft.department_id = ?';
      params.push(filters.department_id);
    }

    query += ' GROUP BY ft.id HAVING version_count > 1 ORDER BY ft.created_at DESC';

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

export default FormTemplate;
