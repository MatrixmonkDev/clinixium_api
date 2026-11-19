import pool from '../../../config/database.js';

class FormTemplateCategory {
  static async create(data) {
    const { form_template_id, category_id } = data;

    const query = `
      INSERT INTO form_template_categories (form_template_id, category_id, created_at, status)
      VALUES (?, ?, NOW(), 1)
    `;

    const [result] = await pool.execute(query, [form_template_id, category_id]);
    return result.insertId;
  }

  static async findByFormTemplateId(formTemplateId) {
    const query = `
      SELECT 
        ftc.*,
        mc.name as category_name,
        mc.parent_id
      FROM form_template_categories ftc
      JOIN medical_categories mc ON ftc.category_id = mc.id
      WHERE ftc.form_template_id = ? AND ftc.status = 1
    `;
    const [rows] = await pool.execute(query, [formTemplateId]);
    return rows;
  }

  static async delete(formTemplateId, categoryId) {
    const query = `
      DELETE FROM form_template_categories 
      WHERE form_template_id = ? AND category_id = ?
    `;
    await pool.execute(query, [formTemplateId, categoryId]);
  }

  static async deleteAllByFormTemplateId(formTemplateId) {
    const query = 'DELETE FROM form_template_categories WHERE form_template_id = ?';
    await pool.execute(query, [formTemplateId]);
  }
}

export default FormTemplateCategory;
