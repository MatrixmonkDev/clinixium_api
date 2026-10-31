import AuthService from '../../../services/authService.js';
import RefreshTokenService from '../../../services/refreshTokenService.js';
import { getRefreshTokenFromCookie, setRefreshCookie, clearRefreshCookie } from '../../../utils/refreshCookie.js';

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
}

export default AuthController;
