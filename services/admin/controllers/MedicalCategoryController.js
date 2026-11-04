import MedicalCategory from '../models/MedicalCategory.js';
import Joi from 'joi';

class MedicalCategoryController {
  static async getAll(req, res, next) {
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

  static async getByDepartment(req, res, next) {
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

  static async getChildren(req, res, next) {
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

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const category = await MedicalCategory.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Medical category not found',
        });
      }

      res.status(200).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const schema = Joi.object({
        name: Joi.string().required().min(2).max(255),
        parent_id: Joi.number().integer().allow(null).optional(),
        medical_department_id: Joi.number().integer().required(),
        description: Joi.string().allow('', null).optional(),
        status: Joi.number().integer().optional(),
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const id = await MedicalCategory.create(value);

      res.status(201).json({
        success: true,
        message: 'Medical category created successfully',
        data: { id },
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;

      const schema = Joi.object({
        name: Joi.string().min(2).max(255).optional(),
        parent_id: Joi.number().integer().allow(null).optional(),
        medical_department_id: Joi.number().integer().optional(),
        description: Joi.string().allow('', null).optional(),
        is_active: Joi.boolean().optional(),
        status: Joi.number().integer().optional(),
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const existing = await MedicalCategory.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Medical category not found',
        });
      }

      await MedicalCategory.update(id, value);

      res.status(200).json({
        success: true,
        message: 'Medical category updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await MedicalCategory.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Medical category not found',
        });
      }

      await MedicalCategory.delete(id);

      res.status(200).json({
        success: true,
        message: 'Medical category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default MedicalCategoryController;
