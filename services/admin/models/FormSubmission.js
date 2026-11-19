import pool from '../../../config/database.js';

class FormSubmission {
  static async create(data) {
    const {
      form_template_id,
      submitted_by_user_type,
      submitted_by_user_id,
      department_id,
      category_id,
      submission_status,
    } = data;

    const query = `
      INSERT INTO form_submissions (
        form_template_id, submitted_by_user_type, submitted_by_user_id,
        department_id, category_id, submission_status, created_at, updated_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
    `;

    const [result] = await pool.execute(query, [
      form_template_id,
      submitted_by_user_type,
      submitted_by_user_id,
      department_id || null,
      category_id || null,
      submission_status || 'draft',
    ]);

    return result.insertId;
  }

  static async findById(id) {
    const query = 'SELECT * FROM form_submissions WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findByUserId(userId, userType) {
    const query = `
      SELECT 
        fs.*,
        ft.title as form_title,
        ft.version as form_version
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      WHERE fs.submitted_by_user_id = ? 
        AND fs.submitted_by_user_type = ?
        AND fs.status = 1
      ORDER BY fs.created_at DESC
    `;
    const [rows] = await pool.execute(query, [userId, userType]);
    return rows;
  }

  static async findByFormTemplateId(formTemplateId) {
    const query = `
      SELECT * FROM form_submissions 
      WHERE form_template_id = ? AND status = 1 
      ORDER BY created_at DESC
    `;
    const [rows] = await pool.execute(query, [formTemplateId]);
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

    const query = `UPDATE form_submissions SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'UPDATE form_submissions SET status = 0 WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async getWithData(submissionId) {
    const query = `
      SELECT 
        fs.*,
        ft.title as form_title,
        ft.description as form_description,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'field_id', fsd.form_field_id,
            'field_label', ff.field_label,
            'field_name', ff.field_name,
            'field_type', ff.field_type,
            'text_value', fsd.text_value,
            'number_value', fsd.number_value,
            'date_value', fsd.date_value,
            'file_url', fsd.file_url,
            'array_value', fsd.array_value
          )
        ) as field_data
      FROM form_submissions fs
      JOIN form_templates ft ON fs.form_template_id = ft.id
      LEFT JOIN form_submission_data fsd ON fs.id = fsd.form_submission_id AND fsd.status = 1
      LEFT JOIN form_fields ff ON fsd.form_field_id = ff.id
      WHERE fs.id = ? AND fs.status = 1
      GROUP BY fs.id
    `;
    const [rows] = await pool.execute(query, [submissionId]);
    return rows[0];
  }
}

export default FormSubmission;
