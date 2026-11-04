import MedicalDepartment from '../../admin/models/MedicalDepartment.js';
import MedicalCategory from '../../admin/models/MedicalCategory.js';
import PracticeSetting from '../../admin/models/PracticeSetting.js';
import ImagingModality from '../../admin/models/ImagingModality.js';
import AIAnnotationExperience from '../../admin/models/AIAnnotationExperience.js';
import pool from '../../../config/database.js';

class OptionsController {
  static async getCountries(req, res, next) {
    try {
      const query = 'SELECT * FROM country_codes WHERE status = 1 ORDER BY name ASC';
      const [rows] = await pool.execute(query);

      res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTimezones(req, res, next) {
    try {
      const query = 'SELECT * FROM timezones WHERE status = 1 ORDER BY name ASC';
      const [rows] = await pool.execute(query);

      res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDepartments(req, res, next) {
    try {
      const departments = await MedicalDepartment.findAll();

      res.status(200).json({
        success: true,
        data: departments,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req, res, next) {
    try {
      const categories = await MedicalCategory.findAll();

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoriesByDepartment(req, res, next) {
    try {
      const { departmentId } = req.params;
      const categories = await MedicalCategory.findByDepartment(departmentId);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubSpecialties(req, res, next) {
    try {
      const categories = await MedicalCategory.findByParentId(null);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryChildren(req, res, next) {
    try {
      const { parentId } = req.params;
      const children = await MedicalCategory.findChildren(parentId);

      res.status(200).json({
        success: true,
        data: children,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategoryChildrenByParentIds(req, res, next) {
    try {
      const { parentIds } = req.query; // Comma-separated parent IDs

      if (!parentIds) {
        return res.status(400).json({
          success: false,
          message: 'parentIds query parameter is required',
        });
      }

      const parentIdArray = parentIds.split(',').map(id => parseInt(id.trim()));

      const query = `
        SELECT 
          mc.*,
          parent.name as parent_name
        FROM medical_categories mc
        LEFT JOIN medical_categories parent ON mc.parent_id = parent.id
        WHERE mc.parent_id IN (${parentIdArray.map(() => '?').join(',')}) 
          AND mc.is_active = 1 AND mc.status = 1
        ORDER BY mc.name ASC
      `;

      const [rows] = await pool.execute(query, parentIdArray);

      res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPracticeSettings(req, res, next) {
    try {
      const settings = await PracticeSetting.findAll();

      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getImagingModalities(req, res, next) {
    try {
      const modalities = await ImagingModality.findAll();

      res.status(200).json({
        success: true,
        data: modalities,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAIExperiences(req, res, next) {
    try {
      const experiences = await AIAnnotationExperience.findAll();

      res.status(200).json({
        success: true,
        data: experiences,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDocTypes(req, res, next) {
    try {
      const query = 'SELECT * FROM doc_types WHERE status = 1 ORDER BY name ASC';
      const [rows] = await pool.execute(query);

      res.status(200).json({
        success: true,
        data: rows,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default OptionsController;
