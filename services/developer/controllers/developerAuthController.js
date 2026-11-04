import Developer from '../models/Developer.js';
import AuthService from '../../../services/authService.js';
import RefreshTokenService from '../../../services/refreshTokenService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import { setRefreshCookie } from '../../../utils/refreshCookie.js';
import { getRequestInfo } from '../../../utils/requestInfo.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class DeveloperAuthController {
  static async register(req, res, next) {
    try {
      const { email, password, user_name, user_mname, user_lname } = req.body;
      const { ip, browser } = getRequestInfo(req);

      const existingDeveloper = await Developer.findByEmail(email);
      if (existingDeveloper) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
        });
      }

      const user_password = await AuthService.hashPassword(password);
      const user_id = AuthService.generateUUID();
      const rand_key = AuthService.generateUUID();

      const developerId = await Developer.create({
        user_id,
        user_name,
        user_mname,
        user_lname,
        user_email: email,
        user_password,
        rand_key,
      });

      const accessToken = AuthService.generateAccessToken({
        id: developerId,
        userId: user_id,
        email,
        userType: 'developer',
      });

      const refreshToken = await RefreshTokenService.generateRefreshToken(developerId, 'developer');
      setRefreshCookie(res, refreshToken);

      await LoginActivityService.logLoginAttempt('D', developerId, ip, browser, 'success');

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          accessToken,
          developer: {
            id: developerId,
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

      const developer = await Developer.findByEmail(email);
      if (!developer) {
        await LoginActivityService.logLoginAttempt('D', 0, ip, browser, 'failed', 'User not found');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      if (developer.status !== 1) {
        await LoginActivityService.logLoginAttempt('D', developer.id, ip, browser, 'failed', 'Account inactive');
        return res.status(403).json({
          success: false,
          message: 'Account is inactive',
        });
      }

      const isPasswordValid = await AuthService.comparePassword(password, developer.user_password);
      if (!isPasswordValid) {
        await LoginActivityService.logLoginAttempt('D', developer.id, ip, browser, 'failed', 'Invalid password');
        const blockStatus = await LoginActivityService.checkAndHandleFailedAttempt('D', developer.id, ip);

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

      await Developer.update(developer.id, { last_login: getCurrentTimestampString() });

      const accessToken = AuthService.generateAccessToken({
        id: developer.id,
        userId: developer.user_id,
        email: developer.user_email,
        userType: 'developer',
      });

      const refreshToken = await RefreshTokenService.generateRefreshToken(developer.id, 'developer');
      setRefreshCookie(res, refreshToken);

      await LoginActivityService.logLoginAttempt('D', developer.id, ip, browser, 'success');
      await LoginActivityService.resetLoginAttempts('D', developer.id, ip);

      res.status(200).json({
        success: true,
        two_factor_enabled: 0,
        message: 'Login successful',
        data: {
          accessToken,
          developer: {
            id: developer.id,
            userId: developer.user_id,
            user_name: developer.user_name,
            user_mname: developer.user_mname,
            user_lname: developer.user_lname,
            thumbnail: developer.thumbnail,
            user_email: developer.user_email,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default DeveloperAuthController;
