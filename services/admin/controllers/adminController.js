import Admin from '../models/Admin.js';
import AuthService from '../../../services/authService.js';
import LoginActivityService from '../../../services/loginActivityService.js';

class AdminController {
  static async getProfile(req, res, next) {
    try {
      const adminId = req.user.id;

      const admin = await Admin.getPublicProfile(adminId);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      res.status(200).json({
        success: true,
        data: admin,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const adminId = req.user.id;
      const updateData = req.body;

      await Admin.update(adminId, updateData);

      const updatedAdmin = await Admin.getPublicProfile(adminId);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedAdmin,
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const adminId = req.user.id;
      const { current_password, new_password } = req.body;

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      const isValid = await AuthService.comparePassword(current_password, admin.user_password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const user_password = await AuthService.hashPassword(new_password);
      await Admin.update(adminId, { user_password });

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
      const adminId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const history = await LoginActivityService.getUserLoginHistory('A', adminId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AdminController;
