import ImagingModality from '../models/ImagingModality.js';
import Joi from 'joi';

class ImagingModalityController {
  static async getAll(req, res, next) {
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

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const modality = await ImagingModality.findById(id);

      if (!modality) {
        return res.status(404).json({
          success: false,
          message: 'Imaging modality not found',
        });
      }

      res.status(200).json({
        success: true,
        data: modality,
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

      const id = await ImagingModality.create(value);

      res.status(201).json({
        success: true,
        message: 'Imaging modality created successfully',
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

      const existing = await ImagingModality.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Imaging modality not found',
        });
      }

      await ImagingModality.update(id, value);

      res.status(200).json({
        success: true,
        message: 'Imaging modality updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      const existing = await ImagingModality.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Imaging modality not found',
        });
      }

      await ImagingModality.delete(id);

      res.status(200).json({
        success: true,
        message: 'Imaging modality deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ImagingModalityController;
