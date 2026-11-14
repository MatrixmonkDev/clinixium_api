import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class TwoFactorService {
  static generateSecret(issuer = null) {
    return speakeasy.generateSecret({
      name: issuer || process.env.TWO_FACTOR_ISSUER || 'Clinixium',
      length: 32,
    });
  }

  static async generateQRCode(secret) {
    try {
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
      return qrCodeUrl;
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2, // Allow 2 time steps tolerance
    });
  }

  static generateRecoveryCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(speakeasy.generateSecret({ length: 32 }).base32);
    }
    return codes;
  }

  static verifyRecoveryCode(recoveryCodes, code) {
    if (!recoveryCodes) return false;
    const codes = JSON.parse(recoveryCodes);
    const index = codes.indexOf(code);
    if (index > -1) {
      codes.splice(index, 1); // Remove used code
      return { valid: true, remainingCodes: codes };
    }
    return { valid: false };
  }
}

export default TwoFactorService;
