import pool from '../../../config/database.js';

class FormSubmissionData {
  static async create(data) {
    const {
      form_submission_id,
      form_field_id,
      text_value,
      number_value,
      date_value,
      file_url,
      array_value,
    } = data;

    const query = `
      INSERT INTO form_submission_data (
        form_submission_id, form_field_id, text_value, number_value,
        date_value, file_url, array_value, created_at, updated_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
    `;

    const [result] = await pool.execute(query, [
      form_submission_id,
      form_field_id,
      text_value || null,
      number_value || null,
      date_value || null,
      file_url || null,
      array_value ? JSON.stringify(array_value) : null,
    ]);

    return result.insertId;
  }

  static async findById(id) {
    const query = 'SELECT * FROM form_submission_data WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findBySubmissionId(submissionId) {
    const query = `
      SELECT 
        fsd.*,
        ff.field_label,
        ff.field_name,
        ff.field_type
      FROM form_submission_data fsd
      JOIN form_fields ff ON fsd.form_field_id = ff.id
      WHERE fsd.form_submission_id = ? AND fsd.status = 1
      ORDER BY ff.sort_order ASC
    `;
    const [rows] = await pool.execute(query, [submissionId]);
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

    const query = `UPDATE form_submission_data SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'UPDATE form_submission_data SET status = 0 WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async deleteBySubmissionId(submissionId) {
    const query = 'UPDATE form_submission_data SET status = 0 WHERE form_submission_id = ?';
    await pool.execute(query, [submissionId]);
  }

  static async findBySubmissionAndField(submissionId, fieldId) {
    const query = `
      SELECT * FROM form_submission_data 
      WHERE form_submission_id = ? AND form_field_id = ? AND status = 1
    `;
    const [rows] = await pool.execute(query, [submissionId, fieldId]);
    return rows[0];
  }

  static async upsert(submissionId, fieldId, data) {
    // Check if exists
    const existing = await this.findBySubmissionAndField(submissionId, fieldId);
    
    if (existing) {
      return await this.update(existing.id, data);
    } else {
      return await this.create({
        form_submission_id: submissionId,
        form_field_id: fieldId,
        ...data,
      });
    }
  }
}

export default FormSubmissionData;
