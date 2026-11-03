import AuthService from '../../../services/authService.js';
import RefreshTokenService from '../../../services/refreshTokenService.js';
import PasswordResetService from '../../../services/passwordResetService.js';
import EmailService from '../../../services/emailService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import { getRefreshTokenFromCookie, setRefreshCookie, clearRefreshCookie } from '../../../utils/refreshCookie.js';
import Joi from 'joi';

class AuthController {
  static async refreshToken(req, res, next) {
    try {
      const refreshToken = getRefreshTokenFromCookie(req);

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required',
        });
      }

      const tokenData = await RefreshTokenService.verifyRefreshToken(refreshToken);

      if (!tokenData) {
        clearRefreshCookie(res);
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
      }

      const accessToken = AuthService.generateAccessToken({
        id: tokenData.user_id,
        userType: tokenData.user_type,
      });

      const newRefreshToken = await RefreshTokenService.generateRefreshToken(tokenData.user_id, tokenData.user_type);
      await RefreshTokenService.revokeRefreshToken(refreshToken);
      setRefreshCookie(res, newRefreshToken);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      const refreshToken = getRefreshTokenFromCookie(req);
      const userId = req.user.id;
      const userType = req.user.userType;

      if (refreshToken) {
        await RefreshTokenService.revokeRefreshToken(refreshToken);
      }

      await RefreshTokenService.revokeAllUserTokens(userId, userType);
      clearRefreshCookie(res);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      next(error);
    }
  }

  static async forgotPassword(req, res, next) {
    try {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        userType: Joi.string().valid('admin', 'physician', 'developer').required(),
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const { email, userType } = value;

      const userTypeMap = {
        admin: 'A',
        physician: 'P',
        developer: 'D',
      };

      const userTypeCode = userTypeMap[userType];

      const user = await PasswordResetService.getUserByEmailAndType(email, userTypeCode);

      if (!user) {
        return res.status(200).json({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
      }

      const token = await PasswordResetService.generateResetToken(user.id, userTypeCode);

      const userName = user.firstName ? `${user.firstName} ${user.lastName}` : null;

      const emailResult = await EmailService.sendPasswordResetEmail(
        user.email,
        userTypeCode,
        token,
        userName
      );

      await LoginActivityService.logLoginAttempt(
        userTypeCode,
        user.id,
        req.ip,
        req.headers['user-agent'] || 'Unknown',
        'failed',
        'Password reset requested'
      );

      if (!emailResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to send reset email. Please try again later.',
        });
      }

      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const schema = Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string()
          .min(8)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
          .required()
          .messages({
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
          }),
        confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
          'any.only': 'Passwords do not match',
        }),
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message,
        });
      }

      const { token, newPassword } = value;

      const validationResult = await PasswordResetService.validateResetToken(token);

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: validationResult.reason,
        });
      }

      const { userId, userType } = validationResult;

      const hashedPassword = await AuthService.hashPassword(newPassword);

      await PasswordResetService.updateUserPassword(userId, userType, hashedPassword);

      await PasswordResetService.markTokenAsUsed(token);

      await RefreshTokenService.revokeAllUserTokens(userId, userType);

      await LoginActivityService.logLoginAttempt(
        userType,
        userId,
        req.ip,
        req.headers['user-agent'] || 'Unknown',
        'failed',
        'Password reset successful'
      );

      res.status(200).json({
        success: true,
        message: 'Password reset successful. Please login with your new password.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async validateResetToken(req, res, next) {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required',
        });
      }

      const validationResult = await PasswordResetService.validateResetToken(token);

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          message: validationResult.reason,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Token is valid',
        userType: validationResult.userType,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AuthController;
