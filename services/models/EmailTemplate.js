import pool from '../../config/database.js';

class EmailTemplate {
  static async findByKey(templateKey) {
    const query = 'SELECT * FROM email_template WHERE template_key = ? AND status = 1';
    const [rows] = await pool.execute(query, [templateKey]);
    return rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM email_template WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async getAll() {
    const query = 'SELECT * FROM email_template WHERE status = 1 ORDER BY template_name';
    const [rows] = await pool.execute(query);
    return rows;
  }

  static async create(data) {
    const {
      template_key,
      template_name,
      subject,
      html_content,
      text_content,
      status = 1,
      version = 1,
    } = data;

    const query = `
      INSERT INTO email_template (
        template_key, template_name, subject, html_content, text_content, status, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [
      template_key,
      template_name,
      subject,
      html_content,
      text_content || null,
      status,
      version,
    ]);

    return result.insertId;
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
    const query = `UPDATE email_template SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async deactivate(id) {
    const query = 'UPDATE email_template SET status = 0 WHERE id = ?';
    await pool.execute(query, [id]);
  }
}

export default EmailTemplate;
