import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class MedicalCategory {
  static async create(data) {
    const { name, parent_id, medical_department_id, description } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO medical_categories (name, parent_id, medical_department_id, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [name, parent_id, medical_department_id, description, now, now]);
    return result.insertId;
  }

  static async findAll() {
    const query = `
      SELECT 
        mc.*,
        md.name as department_name,
        parent.name as parent_name,
        COUNT(DISTINCT pc.physician_id) as physician_count
      FROM medical_categories mc
      LEFT JOIN medical_departments md ON mc.medical_department_id = md.id
      LEFT JOIN medical_categories parent ON mc.parent_id = parent.id
      LEFT JOIN physician_categories pc ON mc.id = pc.medical_category_id AND pc.status = 1
      WHERE mc.is_active = 1 AND mc.status = 1
      GROUP BY mc.id
      ORDER BY mc.name ASC
    `;

    const [rows] = await pool.execute(query);
    return rows;
  }

  static async findByDepartment(departmentId) {
    const query = `
      SELECT 
        mc.*,
        parent.name as parent_name,
        COUNT(DISTINCT pc.physician_id) as physician_count
      FROM medical_categories mc
      LEFT JOIN medical_categories parent ON mc.parent_id = parent.id
      LEFT JOIN physician_categories pc ON mc.id = pc.medical_category_id AND pc.status = 1
      WHERE mc.medical_department_id = ? AND mc.is_active = 1 AND mc.status = 1 AND mc.parent_id IS NULL
      GROUP BY mc.id
      ORDER BY mc.name ASC
    `;

    const [rows] = await pool.execute(query, [departmentId]);
    return rows;
  }

  static async findByParentId(parentId) {
    let query;
    let params;

    if (parentId === null) {
      query = `
        SELECT
          mc.*,
          md.name as department_name,
          parent.name as parent_name,
          COUNT(DISTINCT pc.physician_id) as physician_count
        FROM medical_categories mc
        LEFT JOIN medical_departments md ON mc.medical_department_id = md.id
        LEFT JOIN medical_categories parent ON mc.parent_id = parent.id
        LEFT JOIN physician_categories pc ON mc.id = pc.medical_category_id AND pc.status = 1
        WHERE mc.parent_id IS NULL AND mc.is_active = 1 AND mc.status = 1
        GROUP BY mc.id
        ORDER BY mc.name ASC
      `;
      params = [];
    } else {
      query = `
        SELECT
          mc.*,
          md.name as department_name,
          parent.name as parent_name,
          COUNT(DISTINCT pc.physician_id) as physician_count
        FROM medical_categories mc
        LEFT JOIN medical_departments md ON mc.medical_department_id = md.id
        LEFT JOIN medical_categories parent ON mc.parent_id = parent.id
        LEFT JOIN physician_categories pc ON mc.id = pc.medical_category_id AND pc.status = 1
        WHERE mc.parent_id = ? AND mc.is_active = 1 AND mc.status = 1
        GROUP BY mc.id
        ORDER BY mc.name ASC
      `;
      params = [parentId];
    }

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  static async findChildren(parentId) {
    const query = `
      SELECT 
        mc.*,
        COUNT(DISTINCT pc.physician_id) as physician_count
      FROM medical_categories mc
      LEFT JOIN physician_categories pc ON mc.id = pc.medical_category_id AND pc.status = 1
      WHERE mc.parent_id = ? AND mc.is_active = 1 AND mc.status = 1
      GROUP BY mc.id
      ORDER BY mc.name ASC
    `;

    const [rows] = await pool.execute(query, [parentId]);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM medical_categories WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.parent_id !== undefined) {
      fields.push('parent_id = ?');
      values.push(data.parent_id);
    }
    if (data.medical_department_id !== undefined) {
      fields.push('medical_department_id = ?');
      values.push(data.medical_department_id);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }
    if (data.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(data.is_active);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }

    if (fields.length === 0) return;

    fields.push('updated_at = ?');
    values.push(getCurrentTimestampString());
    values.push(id);

    const query = `UPDATE medical_categories SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'DELETE FROM medical_categories WHERE id = ?';
    await pool.execute(query, [id]);
  }
}

export default MedicalCategory;
