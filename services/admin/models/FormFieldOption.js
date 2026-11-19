import pool from '../../../config/database.js';

class FormFieldOption {
  static async create(data) {
    const {
      form_field_id,
      option_label,
      option_value,
      sort_order,
      is_default,
    } = data;

    const query = `
      INSERT INTO form_field_options (
        form_field_id, option_label, option_value, sort_order, is_default, created_at, status
      ) VALUES (?, ?, ?, ?, ?, NOW(), 1)
    `;

    const [result] = await pool.execute(query, [
      form_field_id,
      option_label,
      option_value,
      sort_order || 0,
      is_default || 0,
    ]);

    return result.insertId;
  }

  static async findById(id) {
    const query = 'SELECT * FROM form_field_options WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findByFormFieldId(formFieldId) {
    const query = `
      SELECT * FROM form_field_options 
      WHERE form_field_id = ? AND status = 1 
      ORDER BY sort_order ASC
    `;
    const [rows] = await pool.execute(query, [formFieldId]);
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

    values.push(id);

    const query = `UPDATE form_field_options SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'UPDATE form_field_options SET status = 0 WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async clearDefaults(formFieldId) {
    const query = 'UPDATE form_field_options SET is_default = 0 WHERE form_field_id = ?';
    await pool.execute(query, [formFieldId]);
  }

  static async setDefault(id) {
    // First clear all defaults for this field
    const field = await this.findById(id);
    if (field) {
      await this.clearDefaults(field.form_field_id);
    }

    // Set this option as default
    const query = 'UPDATE form_field_options SET is_default = 1 WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async deleteByFormFieldId(formFieldId) {
    const query = 'UPDATE form_field_options SET status = 0 WHERE form_field_id = ?';
    await pool.execute(query, [formFieldId]);
  }
}

export default FormFieldOption;
