import PracticeSetting from '../models/PracticeSetting.js';
import Joi from 'joi';

class PracticeSettingController {
  static async getAll(req, res, next) {
    try {
      const settings = await PracticeSetting.findAllForAdmin();
      res.status(200).json({
        success: true,
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const setting = await PracticeSetting.findById(id);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Practice setting not found',
        });
      }

      res.status(200).json({
        success: true,
        data: setting,
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

      const id = await PracticeSetting.create(value);

      res.status(201).json({
        success: true,
        message: 'Practice setting created successfully',
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

      const existing = await PracticeSetting.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Practice setting not found',
        });
      }

      await PracticeSetting.update(id, value);

      res.status(200).json({
        success: true,
        message: 'Practice setting updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await PracticeSetting.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Practice setting not found',
        });
      }

      await PracticeSetting.delete(id);

      res.status(200).json({
        success: true,
        message: 'Practice setting deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async disable(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await PracticeSetting.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Practice setting not found',
        });
      }

      await PracticeSetting.disable(id);

      res.status(200).json({
        success: true,
        message: 'Practice setting disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async enable(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await PracticeSetting.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Practice setting not found',
        });
      }

      await PracticeSetting.enable(id);

      res.status(200).json({
        success: true,
        message: 'Practice setting enabled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PracticeSettingController;
