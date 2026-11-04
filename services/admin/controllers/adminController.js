import Admin from '../models/Admin.js';
import Physician from '../../physicians/models/Physician.js';
import Developer from '../../developer/models/Developer.js';
import AuthService from '../../../services/authService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import pool from '../../../config/database.js';

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

  static async getPhysiciansList(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', status } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          id, uuid, email, first_name, last_name,
          phone_number, country_code_id, professional_title,
          profile_photo_path, status, created_on
        FROM physicians
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (status !== undefined && status !== '') {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY created_on DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [rows] = await pool.execute(query, params);

      const countQuery = `
        SELECT COUNT(*) as total FROM physicians WHERE 1=1
        ${search ? ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)` : ''}
        ${status !== undefined && status !== '' ? ` AND status = ?` : ''}
      `;
      const countParams = [];
      if (search) {
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }
      if (status !== undefined && status !== '') {
        countParams.push(status);
      }

      const [countRows] = await pool.execute(countQuery, countParams);
      const total = countRows[0].total;

      res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDevelopersList(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', status } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          id, user_id, user_name, user_mname, user_lname,
          thumbnail, user_email, insert_date, last_login, status
        FROM developer_mst
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ` AND (user_name LIKE ? OR user_lname LIKE ? OR user_email LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (status !== undefined && status !== '') {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY insert_date DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [rows] = await pool.execute(query, params);

      const countQuery = `
        SELECT COUNT(*) as total FROM developer_mst WHERE 1=1
        ${search ? ` AND (user_name LIKE ? OR user_lname LIKE ? OR user_email LIKE ?)` : ''}
        ${status !== undefined && status !== '' ? ` AND status = ?` : ''}
      `;
      const countParams = [];
      if (search) {
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }
      if (status !== undefined && status !== '') {
        countParams.push(status);
      }

      const [countRows] = await pool.execute(countQuery, countParams);
      const total = countRows[0].total;

      res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserLoginHistory(req, res, next) {
    try {
      const { userType, userId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      if (!['A', 'P', 'D'].includes(userType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user type. Must be A (Admin), P (Physician), or D (Developer)',
        });
      }

      const history = await LoginActivityService.getUserLoginHistory(userType, userId, limit);

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
