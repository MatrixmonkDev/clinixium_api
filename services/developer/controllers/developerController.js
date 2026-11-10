import Developer from '../models/Developer.js';
import AuthService from '../../../services/authService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import pool from '../../../config/database.js';

class DeveloperController {
  static async getProfile(req, res, next) {
    try {
      const developerId = req.user.id;

      const developer = await Developer.getPublicProfile(developerId);

      if (!developer) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found',
        });
      }

      res.status(200).json({
        success: true,
        data: developer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const developerId = req.user.id;
      const { thumbnail_upload_id, ...updateData } = req.body;

      // Update thumbnail if upload_id is provided
      if (thumbnail_upload_id) {
        const updatePhotoQuery = `
          UPDATE developer_mst
          SET thumbnail = (SELECT url FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = 'D')
          WHERE id = ?
        `;
        await pool.execute(updatePhotoQuery, [thumbnail_upload_id, developerId, developerId]);
      }

      // Update other fields
      if (Object.keys(updateData).length > 0) {
        await Developer.update(developerId, updateData);
      }

      const updatedDeveloper = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedDeveloper,
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const developerId = req.user.id;
      const { current_password, new_password } = req.body;

      const developer = await Developer.findById(developerId);
      if (!developer) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found',
        });
      }

      const isValid = await AuthService.comparePassword(current_password, developer.user_password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const user_password = await AuthService.hashPassword(new_password);
      await Developer.update(developerId, { user_password });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLoginHistory(req, res, next) {
    try {
      const developerId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const history = await LoginActivityService.getUserLoginHistory('D', developerId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default DeveloperController;
