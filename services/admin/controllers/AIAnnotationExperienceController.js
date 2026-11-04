import AIAnnotationExperience from '../models/AIAnnotationExperience.js';
import Joi from 'joi';

class AIAnnotationExperienceController {
  static async getAll(req, res, next) {
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

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const experience = await AIAnnotationExperience.findById(id);

      if (!experience) {
        return res.status(404).json({
          success: false,
          message: 'AI annotation experience not found',
        });
      }

      res.status(200).json({
        success: true,
        data: experience,
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

      const id = await AIAnnotationExperience.create(value);

      res.status(201).json({
        success: true,
        message: 'AI annotation experience created successfully',
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

      const existing = await AIAnnotationExperience.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'AI annotation experience not found',
        });
      }

      await AIAnnotationExperience.update(id, value);

      res.status(200).json({
        success: true,
        message: 'AI annotation experience updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await AIAnnotationExperience.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'AI annotation experience not found',
        });
      }

      await AIAnnotationExperience.delete(id);

      res.status(200).json({
        success: true,
        message: 'AI annotation experience deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AIAnnotationExperienceController;
