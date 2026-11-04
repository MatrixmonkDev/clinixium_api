import Physician from '../models/Physician.js';
import PhysicianDepartment from '../models/PhysicianDepartment.js';
import PhysicianCategory from '../models/PhysicianCategory.js';
import PhysicianPracticeSetting from '../models/PhysicianPracticeSetting.js';
import PhysicianImagingModality from '../models/PhysicianImagingModality.js';
import PhysicianAIExperience from '../models/PhysicianAIExperience.js';
import AuthService from '../../../services/authService.js';
import TwoFactorService from '../../../services/twoFactorService.js';
import RefreshTokenService from '../../../services/refreshTokenService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import { setRefreshCookie } from '../../../utils/refreshCookie.js';
import { getRequestInfo } from '../../../utils/requestInfo.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';
import pool from '../../../config/database.js';

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
          two_factor_enabled: 1,
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
        two_factor_enabled: 0,
        message: 'Login successful',
        data: {
          accessToken,
          physician: {
            id: physician.id,
            uuid: physician.uuid,
            email: physician.email,
            first_name: physician.first_name,
            last_name: physician.last_name,
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

      //console.log('physician found', physician);

      if (!physician.two_factor_secret) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor authentication is not enabled for this account',
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
        two_factor_enabled: 1,
        message: 'Two-factor verification successful',
        data: {
          accessToken,
          physician: {
            id: physician.id,
            uuid: physician.uuid,
            email: physician.email,
            first_name: physician.first_name,
            last_name: physician.last_name,
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
          title: 'Clinical Profile',
          completed: !!physician.first_name && !!physician.last_name && !!physician.professional_title,
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

      // Step 1 is only for Two-Factor Authentication setup
      // No phone number, timezone, or language here
      // Only update onboarding step to 2 after 2FA is enabled

      await Physician.update(physicianId, {
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
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const physicianId = req.user.id;
      const {
        first_name,
        last_name,
        phone_number,
        country_code_id,
        timezone_id,
        professional_title,
        career_start_year,
        primary_department_id,
        category_ids,
        sub_sub_category_ids,
        practice_setting_ids,
        imaging_modalities,
        ai_annotation_experience_id,
        profile_photo_upload_id
      } = req.body;

      const now = getCurrentTimestampString();

      // Update physician basic info (all dropdown fields store IDs)
      const updatePhysicianQuery = `
        UPDATE physicians
        SET first_name = ?, last_name = ?, phone_number = ?,
            country_code_id = ?, timezone_id = ?, professional_title = ?, career_start_year = ?, onboarding_step = 3
        WHERE id = ?
      `;
      await connection.execute(updatePhysicianQuery, [
        first_name,
        last_name,
        phone_number,
        country_code_id,
        timezone_id,
        professional_title,
        career_start_year,
        physicianId
      ]);

      // Update profile photo if provided
      if (profile_photo_upload_id) {
        const updatePhotoQuery = `
          UPDATE physicians
          SET profile_photo_path = (SELECT url FROM user_uploads WHERE id = ?)
          WHERE id = ?
        `;
        await connection.execute(updatePhotoQuery, [profile_photo_upload_id, physicianId]);
      }

      // Delete existing departments, categories, practice settings, imaging modalities, AI experiences
      await connection.execute('DELETE FROM physician_departments WHERE physician_id = ?', [physicianId]);
      await connection.execute('DELETE FROM physician_categories WHERE physician_id = ?', [physicianId]);
      await connection.execute('DELETE FROM physician_practice_settings WHERE physician_id = ?', [physicianId]);
      await connection.execute('DELETE FROM physician_imaging_modalities WHERE physician_id = ?', [physicianId]);
      await connection.execute('DELETE FROM physician_ai_experiences WHERE physician_id = ?', [physicianId]);

      // Insert primary department (stores medical_department_id)
      if (primary_department_id) {
        const deptQuery = `
          INSERT INTO physician_departments (physician_id, medical_department_id, is_primary, created_at)
          VALUES (?, ?, 1, ?)
        `;
        await connection.execute(deptQuery, [physicianId, primary_department_id, now]);
      }

      // Insert categories (sub-specialties - stores medical_category_id)
      if (category_ids && Array.isArray(category_ids) && category_ids.length > 0) {
        for (const categoryId of category_ids) {
          const catQuery = `
            INSERT INTO physician_categories (physician_id, medical_category_id, created_at)
            VALUES (?, ?, ?)
          `;
          await connection.execute(catQuery, [physicianId, categoryId, now]);
        }
      }

      // Insert sub-sub-categories (children of selected sub-specialties - stores medical_category_id)
      if (sub_sub_category_ids && Array.isArray(sub_sub_category_ids) && sub_sub_category_ids.length > 0) {
        for (const subSubCategoryId of sub_sub_category_ids) {
          const subSubCatQuery = `
            INSERT INTO physician_categories (physician_id, medical_category_id, created_at)
            VALUES (?, ?, ?)
          `;
          await connection.execute(subSubCatQuery, [physicianId, subSubCategoryId, now]);
        }
      }

      // Insert practice settings (stores practice_setting_id)
      if (practice_setting_ids && Array.isArray(practice_setting_ids) && practice_setting_ids.length > 0) {
        for (const settingId of practice_setting_ids) {
          const settingQuery = `
            INSERT INTO physician_practice_settings (physician_id, practice_setting_id, created_at)
            VALUES (?, ?, ?)
          `;
          await connection.execute(settingQuery, [physicianId, settingId, now]);
        }
      }

      // Insert imaging modalities (stores imaging_modality_id for dropdown, custom text for others)
      if (imaging_modalities && Array.isArray(imaging_modalities) && imaging_modalities.length > 0) {
        for (const modality of imaging_modalities) {
          const modalityQuery = `
            INSERT INTO physician_imaging_modalities (physician_id, imaging_modality_id, other_modality, created_at)
            VALUES (?, ?, ?, ?)
          `;
          await connection.execute(modalityQuery, [
            physicianId,
            modality.imaging_modality_id || null,
            modality.other_modality || null,
            now
          ]);
        }
      }

      // Insert AI annotation experience (stores ai_annotation_experience_id)
      if (ai_annotation_experience_id) {
        const aiQuery = `
          INSERT INTO physician_ai_experiences (physician_id, ai_annotation_experience_id, created_at)
          VALUES (?, ?, ?)
        `;
        await connection.execute(aiQuery, [physicianId, ai_annotation_experience_id, now]);
      }

      await connection.commit();

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 2 completed',
        data: physician,
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
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
