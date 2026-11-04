import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class PhysicianImagingModality {
  static async create(data) {
    const { physician_id, imaging_modality_id, other_modality } = data;
    const now = getCurrentTimestampString();

    const query = `
      INSERT INTO physician_imaging_modalities (physician_id, imaging_modality_id, other_modality, created_at)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await pool.execute(query, [physician_id, imaging_modality_id, other_modality, now]);
    return result.insertId;
  }

  static async findByPhysician(physicianId) {
    const query = `
      SELECT 
        pim.*,
        im.name as modality_name,
        im.description as modality_description
      FROM physician_imaging_modalities pim
      LEFT JOIN imaging_modalities im ON pim.imaging_modality_id = im.id
      WHERE pim.physician_id = ? AND pim.status = 1
      ORDER BY 
        CASE WHEN pim.other_modality IS NOT NULL THEN 0 ELSE 1 END,
        COALESCE(im.name, pim.other_modality) ASC
    `;

    const [rows] = await pool.execute(query, [physicianId]);
    return rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM physician_imaging_modalities WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async findById(id) {
    const query = 'SELECT * FROM physician_imaging_modalities WHERE id = ?';
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  static async delete(id) {
    const query = 'DELETE FROM physician_imaging_modalities WHERE id = ?';
    await pool.execute(query, [id]);
  }

  static async deleteByPhysician(physicianId) {
    const query = 'DELETE FROM physician_imaging_modalities WHERE physician_id = ?';
    await pool.execute(query, [physicianId]);
  }
}

export default PhysicianImagingModality;
