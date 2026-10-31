import Physician from '../models/Physician.js';
import AuthService from '../../../services/authService.js';
import LoginActivityService from '../../../services/loginActivityService.js';

class PhysicianController {
  static async getProfile(req, res, next) {
    try {
      const physicianId = req.user.id;

      const physician = await Physician.getPublicProfile(physicianId);

      if (!physician) {
        return res.status(404).json({
          success: false,
          message: 'Physician not found',
        });
      }

      res.status(200).json({
        success: true,
        data: physician,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const physicianId = req.user.id;
      const updateData = req.body;

      await Physician.update(physicianId, updateData);

      const updatedPhysician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedPhysician,
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { current_password, new_password } = req.body;

      const physician = await Physician.findById(physicianId);
      if (!physician) {
        return res.status(404).json({
          success: false,
          message: 'Physician not found',
        });
      }

      const isValid = await AuthService.comparePassword(current_password, physician.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const password_hash = await AuthService.hashPassword(new_password);
      await Physician.update(physicianId, { password_hash });

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
      const physicianId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const history = await LoginActivityService.getUserLoginHistory('P', physicianId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PhysicianController;
