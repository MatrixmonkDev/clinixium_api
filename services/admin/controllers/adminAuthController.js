import Admin from '../models/Admin.js';
import AuthService from '../../../services/authService.js';
import RefreshTokenService from '../../../services/refreshTokenService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import TwoFactorService from '../../../services/twoFactorService.js';
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

      if (admin.two_factor_enabled) {
        const tempToken = AuthService.generateToken({
          id: admin.id,
          userId: admin.user_id,
          email: admin.user_email,
          userType: 'admin',
          twoFactorPending: true,
        }, '5m');

        return res.status(200).json({
          success: true,
          two_factor_enabled: 1,
          message: 'Two-factor authentication required',
          data: { tempToken },
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

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const thumbnail = admin.thumbnail ? `${baseUrl}${admin.thumbnail}` : null;

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
            thumbnail,
            user_email: admin.user_email,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifyTwoFactor(req, res, next) {
    try {
      const { two_factor_code } = req.body;
      const adminId = req.user.id;
      const { ip, browser } = getRequestInfo(req);

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      if (!admin.two_factor_secret) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor authentication is not enabled for this account',
        });
      }

      const isValid = TwoFactorService.verifyToken(
        admin.two_factor_secret.toString('utf8'),
        two_factor_code
      );

      if (!isValid) {
        await LoginActivityService.logLoginAttempt('A', adminId, ip, browser, 'failed', 'Invalid 2FA code');
        const blockStatus = await LoginActivityService.checkAndHandleFailedAttempt('A', adminId, ip);

        if (blockStatus.blocked) {
          return res.status(423).json({
            success: false,
            message: 'Account temporarily blocked due to multiple failed 2FA attempts',
            blocked: true,
            blockLevel: blockStatus.level,
            blockedUntil: blockStatus.blockedUntil,
            remainingTime: blockStatus.remainingTime,
          });
        }

        return res.status(401).json({
          success: false,
          message: 'Invalid two-factor code',
        });
      }

      await Admin.update(admin.id, { last_login: getCurrentTimestampString() });

      const accessToken = AuthService.generateAccessToken({
        id: admin.id,
        userId: admin.user_id,
        email: admin.user_email,
        userType: 'admin',
      });

      const refreshToken = await RefreshTokenService.generateRefreshToken(adminId, 'admin');
      setRefreshCookie(res, refreshToken);

      await LoginActivityService.logLoginAttempt('A', adminId, ip, browser, 'success');
      await LoginActivityService.resetLoginAttempts('A', adminId, ip);

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const thumbnail = admin.thumbnail ? `${baseUrl}${admin.thumbnail}` : null;

      res.status(200).json({
        success: true,
        two_factor_enabled: 1,
        message: 'Two-factor verification successful',
        data: {
          accessToken,
          admin: {
            id: admin.id,
            userId: admin.user_id,
            user_name: admin.user_name,
            user_mname: admin.user_mname,
            user_lname: admin.user_lname,
            thumbnail,
            user_email: admin.user_email,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async setupTwoFactor(req, res, next) {
    try {
      const adminId = req.user.id;

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      // Custom issuer with user type and email
      const issuer = `Clinixium (A: ${admin.user_email})`;
      const secret = TwoFactorService.generateSecret(issuer);
      const qrCode = await TwoFactorService.generateQRCode(secret);
      const recoveryCodes = TwoFactorService.generateRecoveryCodes();

      res.status(200).json({
        success: true,
        message: 'Two-factor setup initiated',
        data: {
          secret: secret.base32,
          qrCode,
          recoveryCodes,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmTwoFactor(req, res, next) {
    try {
      const { secret, two_factor_code } = req.body;
      const adminId = req.user.id;

      const isValid = TwoFactorService.verifyToken(secret, two_factor_code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid two-factor code',
        });
      }

      const recoveryCodes = TwoFactorService.generateRecoveryCodes();

      await Admin.updateTwoFactor(adminId, {
        two_factor_enabled: true,
        two_factor_method: 'authenticator',
        two_factor_secret: Buffer.from(secret, 'utf8'),
        two_factor_recovery_codes: JSON.stringify(recoveryCodes),
        two_factor_confirmed_at: getCurrentTimestampString(),
      });

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled',
        data: { recoveryCodes },
      });
    } catch (error) {
      next(error);
    }
  }

  static async disableTwoFactor(req, res, next) {
    try {
      const adminId = req.user.id;

      await Admin.updateTwoFactor(adminId, {
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_recovery_codes: null,
        two_factor_confirmed_at: null,
      });

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AdminAuthController;
