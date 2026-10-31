import LoginActivityService from '../../../services/loginActivityService.js';

class AdminBlockingController {
  // Get all blocking configurations
  static async getBlockingConfigs(req, res, next) {
    try {
      const configs = await LoginActivityService.getAllBlockingConfigs();

      res.status(200).json({
        success: true,
        data: configs,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get specific blocking configuration
  static async getBlockingConfig(req, res, next) {
    try {
      const { level } = req.params;
      const config = await LoginActivityService.getBlockingConfigByLevel(parseInt(level));

      if (!config) {
        return res.status(404).json({
          success: false,
          message: 'Blocking configuration not found',
        });
      }

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update blocking configuration
  static async updateBlockingConfig(req, res, next) {
    try {
      const { level } = req.params;
      const { max_attempts, block_duration_minutes, enabled } = req.body;

      // Validate input
      if (!max_attempts || !block_duration_minutes) {
        return res.status(400).json({
          success: false,
          message: 'max_attempts and block_duration_minutes are required',
        });
      }

      if (max_attempts < 1 || block_duration_minutes < 1) {
        return res.status(400).json({
          success: false,
          message: 'max_attempts and block_duration_minutes must be positive integers',
        });
      }

      await LoginActivityService.updateBlockingConfig(
        parseInt(level),
        parseInt(max_attempts),
        parseInt(block_duration_minutes),
        enabled !== undefined ? (enabled ? 1 : 0) : 1
      );

      const updatedConfig = await LoginActivityService.getBlockingConfigByLevel(parseInt(level));

      res.status(200).json({
        success: true,
        message: 'Blocking configuration updated successfully',
        data: updatedConfig,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new blocking configuration
  static async createBlockingConfig(req, res, next) {
    try {
      const { level, max_attempts, block_duration_minutes, enabled } = req.body;

      // Validate input
      if (!level || !max_attempts || !block_duration_minutes) {
        return res.status(400).json({
          success: false,
          message: 'level, max_attempts, and block_duration_minutes are required',
        });
      }

      if (level < 1 || max_attempts < 1 || block_duration_minutes < 1) {
        return res.status(400).json({
          success: false,
          message: 'All values must be positive integers',
        });
      }

      await LoginActivityService.createBlockingConfig(
        parseInt(level),
        parseInt(max_attempts),
        parseInt(block_duration_minutes),
        enabled !== undefined ? (enabled ? 1 : 0) : 1
      );

      const newConfig = await LoginActivityService.getBlockingConfigByLevel(parseInt(level));

      res.status(201).json({
        success: true,
        message: 'Blocking configuration created successfully',
        data: newConfig,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete blocking configuration
  static async deleteBlockingConfig(req, res, next) {
    try {
      const { level } = req.params;

      const existingConfig = await LoginActivityService.getBlockingConfigByLevel(parseInt(level));
      if (!existingConfig) {
        return res.status(404).json({
          success: false,
          message: 'Blocking configuration not found',
        });
      }

      await LoginActivityService.deleteBlockingConfig(parseInt(level));

      res.status(200).json({
        success: true,
        message: 'Blocking configuration deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Get current effective blocking configuration (from cache)
  static async getCurrentBlockingConfig(req, res, next) {
    try {
      const config = await LoginActivityService.getBlockingConfig();

      res.status(200).json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AdminBlockingController;
