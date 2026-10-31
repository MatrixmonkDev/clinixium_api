import Physician from '../models/Physician.js';
import AuthService from '../../../services/authService.js';
import TwoFactorService from '../../../services/twoFactorService.js';
import RefreshTokenService from '../../../services/refreshTokenService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import { setRefreshCookie } from '../../../utils/refreshCookie.js';
import { getRequestInfo } from '../../../utils/requestInfo.js';
import { getCurrentTimestampString, getCurrentTimestamp } from '../../../utils/timestamp.js';

class PhysicianAuthController {
  // Register - Simple: only email, password, first_name, last_name
  static async register(req, res, next) {
    try {
      const { email, password, first_name, last_name } = req.body;
      const { ip, browser } = getRequestInfo(req);

      const existingPhysician = await Physician.findByEmail(email);
      if (existingPhysician) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
        });
      }

      const password_hash = await AuthService.hashPassword(password);

      const uuid = AuthService.generateUUID();

      const physicianId = await Physician.create({
        uuid,
        email,
        password_hash,
        first_name,
        last_name,
        professional_title: 'MD',
        timezone: 'America/New_York',
        language: 'en',
      });

      const accessToken = AuthService.generateAccessToken({
        id: physicianId,
        uuid,
        email,
        userType: 'physician',
      });

      const refreshToken = await RefreshTokenService.generateRefreshToken(physicianId, 'physician');
      setRefreshCookie(res, refreshToken);

      await LoginActivityService.logLoginAttempt('P', physicianId, ip, browser, 'success');

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          accessToken,
          physician: {
            id: physicianId,
            uuid,
            email,
            first_name,
            last_name,
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

      const physician = await Physician.findByEmail(email);
      if (!physician) {
        await LoginActivityService.logLoginAttempt('P', 0, ip, browser, 'failed', 'User not found');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const lockStatus = AuthService.checkAccountLock(physician);
      if (lockStatus.locked) {
        await LoginActivityService.logLoginAttempt('P', physician.id, ip, browser, 'failed', 'Account locked');
        return res.status(423).json({
          success: false,
          message: lockStatus.message,
          lockedUntil: lockStatus.lockedUntil,
        });
      }

      const isPasswordValid = await AuthService.comparePassword(password, physician.password_hash);
      if (!isPasswordValid) {
        await LoginActivityService.logLoginAttempt('P', physician.id, ip, browser, 'failed', 'Invalid password');
        const blockStatus = await LoginActivityService.checkAndHandleFailedAttempt('P', physician.id, ip);

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

      if (physician.two_factor_enabled) {
        const tempToken = AuthService.generateToken({
          id: physician.id,
          uuid: physician.uuid,
          email: physician.email,
          userType: 'physician',
          twoFactorPending: true,
        }, '5m');

        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          message: 'Two-factor authentication required',
          data: { tempToken },
        });
      }

      await Physician.updateLoginAttempts(physician.id, 0, null);
      await Physician.update(physician.id, { last_login_at: getCurrentTimestampString() });

      const accessToken = AuthService.generateAccessToken({
        id: physician.id,
        uuid: physician.uuid,
        email: physician.email,
        userType: 'physician',
      });

      const refreshToken = await RefreshTokenService.generateRefreshToken(physician.id, 'physician');
      setRefreshCookie(res, refreshToken);

      await LoginActivityService.logLoginAttempt('P', physician.id, ip, browser, 'success');
      await LoginActivityService.resetLoginAttempts('P', physician.id, ip);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          accessToken,
          physician: {
            id: physician.id,
            uuid: physician.uuid,
            email: physician.email,
            first_name: physician.first_name,
            last_name: physician.last_name,
            two_factor_enabled: physician.two_factor_enabled,
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
      const physicianId = req.user.id;
      const { ip, browser } = getRequestInfo(req);

      const physician = await Physician.findById(physicianId);
      if (!physician) {
        return res.status(404).json({
          success: false,
          message: 'Physician not found',
        });
      }

      const isValid = TwoFactorService.verifyToken(
        physician.two_factor_secret.toString('utf8'),
        two_factor_code
      );

      if (!isValid) {
        await LoginActivityService.logLoginAttempt('P', physicianId, ip, browser, 'failed', 'Invalid 2FA code');
        const blockStatus = await LoginActivityService.checkAndHandleFailedAttempt('P', physicianId, ip);

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

      await Physician.updateLoginAttempts(physicianId, 0, null);
      await Physician.update(physicianId, { last_login_at: getCurrentTimestampString() });

      const accessToken = AuthService.generateAccessToken({
        id: physician.id,
        uuid: physician.uuid,
        email: physician.email,
        userType: 'physician',
      });

      const refreshToken = await RefreshTokenService.generateRefreshToken(physicianId, 'physician');
      setRefreshCookie(res, refreshToken);

      await LoginActivityService.logLoginAttempt('P', physicianId, ip, browser, 'success');
      await LoginActivityService.resetLoginAttempts('P', physicianId, ip);

      res.status(200).json({
        success: true,
        message: 'Two-factor verification successful',
        data: {
          accessToken,
          physician: {
            id: physician.id,
            uuid: physician.uuid,
            email: physician.email,
            first_name: physician.first_name,
            last_name: physician.last_name,
            two_factor_enabled: physician.two_factor_enabled,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async setupTwoFactor(req, res, next) {
    try {
      const physicianId = req.user.id;

      const secret = TwoFactorService.generateSecret();
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
      const physicianId = req.user.id;

      const isValid = TwoFactorService.verifyToken(secret, two_factor_code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid two-factor code',
        });
      }

      const recoveryCodes = TwoFactorService.generateRecoveryCodes();

      await Physician.updateTwoFactor(physicianId, {
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
      const physicianId = req.user.id;

      await Physician.updateTwoFactor(physicianId, {
        two_factor_enabled: false,
        two_factor_method: null,
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

  // ============ ONBOARDING STEPS ============

  static async getOnboardingProgress(req, res, next) {
    try {
      const physicianId = req.user.id;
      const physician = await Physician.getPublicProfile(physicianId);

      const steps = {
        step1: {
          title: 'Basic Profile',
          completed: !!physician.first_name && !!physician.last_name && !!physician.email,
        },
        step2: {
          title: 'Professional Details',
          completed: !!physician.professional_title && !!physician.primary_specialty,
        },
        step3: {
          title: 'Hospital Affiliation',
          completed: !!physician.hospital_affiliation,
        },
        step4: {
          title: 'NPI Verification',
          completed: !!physician.npi_number && !!physician.npi_verified_at,
        },
        step5: {
          title: 'Identity Verification',
          completed: physician.identity_status === 'verified',
        },
        step6: {
          title: 'Compliance',
          completed: !!physician.compliance_completed_at,
        },
      };

      const currentStep = physician.onboarding_step;
      const isCompleted = physician.onboarding_step >= 7;
      const completedSteps = Object.values(steps).filter(step => step.completed).length;
      const progressPercentage = Math.round((completedSteps / 6) * 100);

      res.status(200).json({
        success: true,
        data: {
          currentStep,
          isCompleted,
          completedSteps,
          totalSteps: 6,
          progressPercentage,
          onboardingCompletedAt: physician.onboarding_completed_at,
          steps,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async completeStep1(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { phone_country_code, phone_number, timezone, language } = req.body;

      await Physician.update(physicianId, {
        phone_country_code,
        phone_number,
        timezone,
        language,
        onboarding_step: 2,
      });

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 1 completed',
        data: physician,
      });
    } catch (error) {
      next(error);
    }
  }

  static async completeStep2(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { professional_title, primary_specialty, career_start_year, practice_setting, ai_annotation_experience } = req.body;

      await Physician.update(physicianId, {
        professional_title,
        primary_specialty,
        career_start_year,
        practice_setting,
        ai_annotation_experience,
        onboarding_step: 3,
      });

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 2 completed',
        data: physician,
      });
    } catch (error) {
      next(error);
    }
  }

  static async completeStep3(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { hospital_affiliation, practice_setting_other } = req.body;

      await Physician.update(physicianId, {
        hospital_affiliation,
        practice_setting_other,
        onboarding_step: 4,
      });

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 3 completed',
        data: physician,
      });
    } catch (error) {
      next(error);
    }
  }

  static async completeStep4(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { npi_number, board_certified } = req.body;

      await Physician.update(physicianId, {
        npi_number,
        board_certified,
        npi_verified_at: getCurrentTimestampString(),
        onboarding_step: 5,
      });

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 4 completed',
        data: physician,
      });
    } catch (error) {
      next(error);
    }
  }

  static async completeStep5(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { identity_status, identity_provider, identity_session_id } = req.body;

      const updateData = {
        identity_status,
        identity_provider,
        identity_session_id,
        onboarding_step: 6,
      };

      if (identity_status === 'verified') {
        updateData.identity_verified_at = getCurrentTimestampString();
      }

      await Physician.update(physicianId, updateData);

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 5 completed',
        data: physician,
      });
    } catch (error) {
      next(error);
    }
  }

  static async completeStep6(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { conflict_of_interest, conflict_of_interest_details } = req.body;

      await Physician.update(physicianId, {
        conflict_of_interest,
        conflict_of_interest_details,
        compliance_completed_at: getCurrentTimestampString(),
        onboarding_step: 7,
        onboarding_completed_at: getCurrentTimestampString(),
      });

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Onboarding completed',
        data: physician,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PhysicianAuthController;
