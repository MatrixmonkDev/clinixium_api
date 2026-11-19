import pool from '../../../config/database.js';

class FormField {
  static async create(data) {
    const {
      form_template_id,
      field_label,
      field_name,
      field_type,
      placeholder,
      sort_order,
      is_required,
      width,
      min_length,
      max_length,
      min_value,
      max_value,
      pattern,
      validation_message,
      allowed_file_types,
      max_file_size_mb,
      default_value,
    } = data;

    const query = `
      INSERT INTO form_fields (
        form_template_id, field_label, field_name, field_type,
        placeholder, sort_order, is_required, width,
        min_length, max_length, min_value, max_value,
        pattern, validation_message, allowed_file_types,
        max_file_size_mb, default_value, created_at, updated_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 1)
    `;

    const [result] = await pool.execute(query, [
      form_template_id,
      field_label,
      field_name,
      field_type,
      placeholder || null,
      sort_order || 0,
      is_required || 0,
      width || 12,
      min_length || null,
      max_length || null,
      min_value || null,
      max_value || null,
      pattern || null,
      validation_message || null,
      allowed_file_types || null,
      max_file_size_mb || null,
      default_value || null,
    ]);

    return result.insertId;
  }

  static async findById(id) {
    const query = 'SELECT * FROM form_fields WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0];
  }

  static async findByFormTemplateId(formTemplateId) {
    const query = `
      SELECT * FROM form_fields 
      WHERE form_template_id = ? AND status = 1 
      ORDER BY sort_order ASC
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

    const query = `UPDATE form_fields SET ${fields.join(', ')} WHERE id = ?`;
    await pool.execute(query, values);
  }

  static async delete(id) {
    const query = 'UPDATE form_fields SET status = 0 WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async reorder(formTemplateId, fieldIds) {
    // Validate input
    if (!fieldIds || !Array.isArray(fieldIds) || fieldIds.length === 0) {
      throw new Error('field_ids array is required and must not be empty');
    }

    // Filter out any undefined/null values from fieldIds
    const validFieldIds = fieldIds.filter(id => id !== undefined && id !== null && !isNaN(parseInt(id)));

    if (validFieldIds.length === 0) {
      throw new Error('No valid field IDs provided');
    }

    // Get all current fields for this template
    const query = `
      SELECT id, sort_order 
      FROM form_fields 
      WHERE form_template_id = ? AND status = 1 
      ORDER BY sort_order ASC
    `;
    const [currentFields] = await pool.execute(query, [formTemplateId]);

    // Create a map of current sort_order for all fields
    // Use 0 as default for NULL/undefined sort_order values
    // Use string keys for consistency
    const currentOrderMap = {};
    currentFields.forEach(field => {
      const sortOrder = field.sort_order !== null && field.sort_order !== undefined 
        ? parseInt(field.sort_order) 
        : 0;
      currentOrderMap[String(field.id)] = sortOrder;
    });

    // Create a map of new positions for reordered fields
    // Use string keys to match with field.id (number) lookup
    const newOrderMap = {};
    validFieldIds.forEach((fieldId, index) => {
      newOrderMap[String(fieldId)] = index;
    });

    // Get the max sort_order to avoid conflicts
    // Ensure we only use valid numbers
    const validSortOrders = Object.values(currentOrderMap).filter(v => typeof v === 'number' && !isNaN(v));
    const maxSortOrder = validSortOrders.length > 0 
      ? Math.max(...validSortOrders, validFieldIds.length - 1) 
      : validFieldIds.length - 1;

    // First, temporarily move all reordered fields to high values to avoid conflicts
    const tempOffset = parseInt(maxSortOrder) + 1000;
    for (const fieldId of validFieldIds) {
      const numericFieldId = parseInt(fieldId);
      await pool.execute(
        'UPDATE form_fields SET sort_order = ? WHERE id = ?',
        [tempOffset, numericFieldId]
      );
    }

    // Now assign new sort_order values to reordered fields
    for (let i = 0; i < validFieldIds.length; i++) {
      const numericFieldId = parseInt(validFieldIds[i]);
      await pool.execute(
        'UPDATE form_fields SET sort_order = ? WHERE id = ?',
        [i, numericFieldId]
      );
    }

    // Recalculate sort_order for fields not in the reorder array
    // They should come after the reordered fields
    let nextSortOrder = validFieldIds.length;
    for (const field of currentFields) {
      if (newOrderMap[String(field.id)] === undefined) {
        // This field was not in the reorder array
        await pool.execute(
          'UPDATE form_fields SET sort_order = ? WHERE id = ?',
          [nextSortOrder, field.id]
        );
        nextSortOrder++;
      }
    }
  }

  static async getWithOptions(fieldId) {
    const query = `
      SELECT 
        f.*,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', fo.id,
            'option_label', fo.option_label,
            'option_value', fo.option_value,
            'sort_order', fo.sort_order,
            'is_default', fo.is_default
          )
        ) as options
      FROM form_fields f
      LEFT JOIN form_field_options fo ON f.id = fo.form_field_id AND fo.status = 1
      WHERE f.id = ? AND f.status = 1
      GROUP BY f.id
    `;
    const [rows] = await pool.execute(query, [fieldId]);
    return rows[0];
  }
}

export default FormField;
