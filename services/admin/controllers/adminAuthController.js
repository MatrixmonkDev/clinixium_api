import Admin from '../models/Admin.js';
import AuthService from '../../../services/authService.js';
import RefreshTokenService from '../../../services/refreshTokenService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import { setRefreshCookie } from '../../../utils/refreshCookie.js';
import { getRequestInfo } from '../../../utils/requestInfo.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class AdminAuthController {
  static async register(req, res, next) {
    try {
      const { email, password, user_name, user_mname, user_lname } = req.body;
      const { ip, browser } = getRequestInfo(req);

      const existingAdmin = await Admin.findByEmail(email);
      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
        });
      }

      const user_password = await AuthService.hashPassword(password);
      const user_id = AuthService.generateUUID();
      const rand_key = AuthService.generateUUID();

      const adminId = await Admin.create({
        user_id,
        user_name,
        user_mname,
        user_lname,
        user_email: email,
        user_password,
        rand_key,
      });

      const accessToken = AuthService.generateAccessToken({
        id: adminId,
        userId: user_id,
        email,
        userType: 'admin',
      });

      const refreshToken = await RefreshTokenService.generateRefreshToken(adminId, 'admin');
      setRefreshCookie(res, refreshToken);

      await LoginActivityService.logLoginAttempt('A', adminId, ip, browser, 'success');

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          accessToken,
          admin: {
            id: adminId,
            userId: user_id,
            user_name,
            user_mname: user_mname || null,
            user_lname: user_lname || null,
            user_email: email,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { ip, browser } = getRequestInfo(req);

      const admin = await Admin.findByEmail(email);
      if (!admin) {
        await LoginActivityService.logLoginAttempt('A', 0, ip, browser, 'failed', 'User not found');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      if (admin.status !== 1) {
        await LoginActivityService.logLoginAttempt('A', admin.id, ip, browser, 'failed', 'Account inactive');
        return res.status(403).json({
          success: false,
          message: 'Account is inactive',
        });
      }

      const isPasswordValid = await AuthService.comparePassword(password, admin.user_password);
      if (!isPasswordValid) {
        await LoginActivityService.logLoginAttempt('A', admin.id, ip, browser, 'failed', 'Invalid password');
        const blockStatus = await LoginActivityService.checkAndHandleFailedAttempt('A', admin.id, ip);

        if (blockStatus.blocked) {
          return res.status(423).json({
            success: false,
            message: 'Account temporarily blocked due to multiple failed login attempts',
            blocked: true,
            blockLevel: blockStatus.level,
            blockedUntil: blockStatus.blockedUntil,
            remainingTime: blockStatus.remainingTime,
          });
        }

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      await Admin.update(admin.id, { last_login: getCurrentTimestampString() });

      const accessToken = AuthService.generateAccessToken({
        id: admin.id,
        userId: admin.user_id,
        email: admin.user_email,
        userType: 'admin',
      });

      const refreshToken = await RefreshTokenService.generateRefreshToken(admin.id, 'admin');
      setRefreshCookie(res, refreshToken);

      await LoginActivityService.logLoginAttempt('A', admin.id, ip, browser, 'success');
      await LoginActivityService.resetLoginAttempts('A', admin.id, ip);

      res.status(200).json({
        success: true,
        two_factor_enabled: 0,
        message: 'Login successful',
        data: {
          accessToken,
          admin: {
            id: admin.id,
            userId: admin.user_id,
            user_name: admin.user_name,
            user_mname: admin.user_mname,
            user_lname: admin.user_lname,
            thumbnail: admin.thumbnail,
            user_email: admin.user_email,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AdminAuthController;
