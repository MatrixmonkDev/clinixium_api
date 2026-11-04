import MedicalDepartment from '../models/MedicalDepartment.js';
import Joi from 'joi';

class MedicalDepartmentController {
  static async getAll(req, res, next) {
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

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const department = await MedicalDepartment.findById(id);

      if (!department) {
        return res.status(404).json({
          success: false,
          message: 'Medical department not found',
        });
      }

      res.status(200).json({
        success: true,
        data: department,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const schema = Joi.object({
        name: Joi.string().required().min(2).max(255),
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

      const id = await MedicalDepartment.create(value);

      res.status(201).json({
        success: true,
        message: 'Medical department created successfully',
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

      const existing = await MedicalDepartment.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Medical department not found',
        });
      }

      await MedicalDepartment.update(id, value);

      res.status(200).json({
        success: true,
        message: 'Medical department updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await MedicalDepartment.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Medical department not found',
        });
      }

      await MedicalDepartment.delete(id);

      res.status(200).json({
        success: true,
        message: 'Medical department deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default MedicalDepartmentController;
