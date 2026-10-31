import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

class AuthService {
  static async hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    });
  }

  static generateToken(payload, expiresIn = null) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '7d',
    });
  }

  static verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }

  static generateUUID() {
    return uuidv4();
  }

  static checkAccountLock(user) {
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return {
        locked: true,
        message: 'Account is temporarily locked due to too many failed attempts',
        lockedUntil: user.locked_until,
      };
    }
    return { locked: false };
  }
}

export default AuthService;
