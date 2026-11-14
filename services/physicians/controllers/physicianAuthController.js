import Physician from '../models/Physician.js';
import PhysicianDepartment from '../models/PhysicianDepartment.js';
import PhysicianCategory from '../models/PhysicianCategory.js';
import PhysicianPracticeSetting from '../models/PhysicianPracticeSetting.js';
import PhysicianImagingModality from '../models/PhysicianImagingModality.js';
import PhysicianAIExperience from '../models/PhysicianAIExperience.js';
import PhysicianMedicalLicense from '../models/PhysicianMedicalLicense.js';
import PhysicianComplianceDocument from '../models/PhysicianComplianceDocument.js';
import AuthService from '../../../services/authService.js';
import TwoFactorService from '../../../services/twoFactorService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

      if (physician.status === 2) {
        return res.status(403).json({
          success: false,
          message: 'Account expired',
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

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const profile_photo = physician.profile_photo_path ? `${baseUrl}${physician.profile_photo_path}` : null;

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
            profile_photo,
            onboarding_step: physician.onboarding_step || 1,
            is_onboard_complete: physician.is_onboard_complete || 0,
            is_approved: physician.is_approved || 0,
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

      if (physician.status === 2) {
        return res.status(403).json({
          success: false,
          message: 'Account expired',
        });
      }

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

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const profile_photo = physician.profile_photo_path ? `${baseUrl}${physician.profile_photo_path}` : null;

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
            profile_photo,
            onboarding_step: physician.onboarding_step || 1,
            is_onboard_complete: physician.is_onboard_complete || 0,
            is_approved: physician.is_approved || 0,
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

      const physician = await Physician.findById(physicianId);
      if (!physician) {
        return res.status(404).json({
          success: false,
          message: 'Physician not found',
        });
      }

      if (physician.status === 2) {
        return res.status(403).json({
          success: false,
          message: 'Account expired',
        });
      }

      // Custom issuer with user type and email
      const issuer = `Clinixium (P: ${physician.email})`;
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
      const physicianId = req.user.id;

      const isValid = TwoFactorService.verifyToken(secret, two_factor_code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid two-factor code',
        });
      }

      const physician = await Physician.findById(physicianId);
      if (!physician) {
        return res.status(404).json({
          success: false,
          message: 'Physician not found',
        });
      }

      if (physician.status === 2) {
        return res.status(403).json({
          success: false,
          message: 'Account expired',
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

  static async getOnboardingData(req, res, next) {
    try {
      const physicianId = req.user.id;
      const connection = await pool.getConnection();

      try {
        // Step 1: Two-Factor Authentication
        const [step1Data] = await connection.execute(
          'SELECT two_factor_enabled, two_factor_method, two_factor_confirmed_at FROM physicians WHERE id = ?',
          [physicianId]
        );

        // Step 2: Clinical Profile
        const [step2Physician] = await connection.execute(
          `SELECT 
            p.first_name, p.last_name, p.phone_number, p.country_code_id, p.timezone_id,
            p.professional_title, p.career_start_year, p.profile_photo_path,
            cc.code as country_code, cc.name as country_name,
            tz.name as timezone_name, tz.utc_offset as timezone_offset
          FROM physicians p
          LEFT JOIN country_codes cc ON p.country_code_id = cc.id
          LEFT JOIN timezones tz ON p.timezone_id = tz.id
          WHERE p.id = ?`,
          [physicianId]
        );

        const [step2Departments] = await connection.execute(
          `SELECT pd.id, pd.is_primary, md.id as department_id, md.name as department_name
          FROM physician_departments pd
          JOIN medical_departments md ON pd.medical_department_id = md.id
          WHERE pd.physician_id = ? AND pd.status = 1`,
          [physicianId]
        );

        const [step2Categories] = await connection.execute(
          `SELECT pc.id, mc.id as category_id, mc.name as category_name, mc.parent_id
          FROM physician_categories pc
          JOIN medical_categories mc ON pc.medical_category_id = mc.id
          WHERE pc.physician_id = ? AND pc.status = 1`,
          [physicianId]
        );

        const [step2PracticeSettings] = await connection.execute(
          `SELECT pps.id, ps.id as practice_setting_id, ps.name as practice_setting_name, pps.other_value
          FROM physician_practice_settings pps
          JOIN practice_settings ps ON pps.practice_setting_id = ps.id
          WHERE pps.physician_id = ? AND pps.status = 1`,
          [physicianId]
        );

        const [step2ImagingModalities] = await connection.execute(
          `SELECT pim.id, pim.imaging_modality_id, pim.other_modality, im.name as modality_name
          FROM physician_imaging_modalities pim
          LEFT JOIN imaging_modalities im ON pim.imaging_modality_id = im.id
          WHERE pim.physician_id = ? AND pim.status = 1`,
          [physicianId]
        );

        const [step2AIExperience] = await connection.execute(
          `SELECT paie.id, aie.id as ai_experience_id, aie.name as ai_experience_name
          FROM physician_ai_experiences paie
          JOIN ai_annotation_experiences aie ON paie.ai_annotation_experience_id = aie.id
          WHERE paie.physician_id = ? AND paie.status = 1`,
          [physicianId]
        );

        // Step 3: Medical Credentials
        const [step3Physician] = await connection.execute(
          'SELECT npi_number FROM physicians WHERE id = ?',
          [physicianId]
        );

        const [step3Licenses] = await connection.execute(
          'SELECT * FROM physician_medical_licenses WHERE physician_id = ? AND status = 1',
          [physicianId]
        );

        const [step3LicenseDocs] = await connection.execute(
          `SELECT id, url, file_name, file_size, mime_type, created_at
          FROM user_uploads
          WHERE user_id = ? AND user_type = 'P' AND doc_type_id = 3 AND status = 1`,
          [physicianId]
        );

        const [step3BoardDocs] = await connection.execute(
          `SELECT id, url, file_name, file_size, mime_type, created_at
          FROM user_uploads
          WHERE user_id = ? AND user_type = 'P' AND doc_type_id = 5 AND status = 1`,
          [physicianId]
        );

        // Step 4: Identity Verification
        const [step4Physician] = await connection.execute(
          'SELECT identity_status, identity_provider, identity_session_id, identity_verified_at FROM physicians WHERE id = ?',
          [physicianId]
        );

        const [step4IdentityDocs] = await connection.execute(
          `SELECT id, url, file_name, file_size, mime_type, created_at
          FROM user_uploads
          WHERE user_id = ? AND user_type = 'P' AND doc_type_id = 1 AND status = 1`,
          [physicianId]
        );

        const [step4Selfie] = await connection.execute(
          `SELECT id, url, file_name, file_size, mime_type, created_at
          FROM user_uploads
          WHERE user_id = ? AND user_type = 'P' AND doc_type_id = 2 AND status = 1`,
          [physicianId]
        );

        // Step 5: Compliance
        const [step5Physician] = await connection.execute(
          'SELECT compliance_completed_at, conflict_of_interest, conflict_of_interest_details FROM physicians WHERE id = ?',
          [physicianId]
        );

        const [step5ComplianceDocs] = await connection.execute(
          `SELECT pcd.*, dt.name as document_name, dt.description as document_description, u.url as signature_url
          FROM physician_compliance_documents pcd
          LEFT JOIN doc_types dt ON pcd.doc_type_id = dt.id
          LEFT JOIN user_uploads u ON pcd.signature_upload_id = u.id AND u.status = 1
          WHERE pcd.physician_id = ? AND pcd.status = 1`,
          [physicianId]
        );

        // Step 6: Final Completion
        const [step6Physician] = await connection.execute(
          'SELECT onboarding_completed_at, is_onboard_complete, is_approved FROM physicians WHERE id = ?',
          [physicianId]
        );

        // Build response with full URLs
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        const step2Data = step2Physician[0] || {};
        if (step2Data.profile_photo_path) {
          step2Data.profile_photo = `${baseUrl}${step2Data.profile_photo_path}`;
        }

        const step3LicenseDocsWithUrl = step3LicenseDocs.map(doc => ({
          ...doc,
          url: `${baseUrl}${doc.url}`
        }));

        const step3BoardDocsWithUrl = step3BoardDocs.map(doc => ({
          ...doc,
          url: `${baseUrl}${doc.url}`
        }));

        const step4IdentityDocsWithUrl = step4IdentityDocs.map(doc => ({
          ...doc,
          url: `${baseUrl}${doc.url}`
        }));

        const step4SelfieWithUrl = step4Selfie.length > 0 ? {
          ...step4Selfie[0],
          url: `${baseUrl}${step4Selfie[0].url}`
        } : null;

        const step5ComplianceDocsWithUrl = step5ComplianceDocs.map(doc => ({
          ...doc,
          signature_url: doc.signature_url ? `${baseUrl}${doc.signature_url}` : null
        }));

        res.status(200).json({
          success: true,
          data: {
            step1: step1Data[0] || {},
            step2: {
              ...step2Data,
              departments: step2Departments,
              categories: step2Categories,
              practice_settings: step2PracticeSettings,
              imaging_modalities: step2ImagingModalities,
              ai_experience: step2AIExperience[0] || null
            },
            step3: {
              npi_number: step3Physician[0]?.npi_number,
              medical_licenses: step3Licenses,
              medical_license_documents: step3LicenseDocsWithUrl,
              board_certification_documents: step3BoardDocsWithUrl
            },
            step4: {
              ...step4Physician[0] || {},
              identity_documents: step4IdentityDocsWithUrl,
              selfie_document: step4SelfieWithUrl
            },
            step5: {
              ...step5Physician[0] || {},
              compliance_documents: step5ComplianceDocsWithUrl
            },
            step6: step6Physician[0] || {}
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  static async getOnboardingProgress(req, res, next) {
    try {
      const physicianId = req.user.id;
      const connection = await pool.getConnection();

      try {
        const physician = await Physician.getPublicProfile(physicianId);

        // Step 1: Check 2FA
        const step1Completed = !!physician.two_factor_enabled && !!physician.two_factor_confirmed_at;

        // Step 2: Check clinical profile data (major fields only)
        const step2Completed = !!physician.first_name && !!physician.last_name && !!physician.professional_title;

        // Step 3: Check medical credentials (major fields only)
        const [step3Licenses] = await connection.execute(
          'SELECT COUNT(*) as count FROM physician_medical_licenses WHERE physician_id = ? AND status = 1',
          [physicianId]
        );

        const step3Completed = !!physician.npi_number && step3Licenses[0].count > 0;

        // Step 4: Check identity verification (status only)
        const step4Completed = physician.identity_status === 'verified' || physician.identity_status === 'pending';

        // Step 5: Check compliance (major fields only)
        const step5Completed = !!physician.compliance_completed_at && physician.conflict_of_interest !== null;

        // Step 6: Check final completion
        const step6Completed = physician.onboarding_step >= 6 && !!physician.onboarding_completed_at;

        const steps = {
          step1: {
            title: 'Two-Factor Authentication',
            completed: step1Completed,
          },
          step2: {
            title: 'Clinical Profile',
            completed: step2Completed,
          },
          step3: {
            title: 'Medical Credentials Verification',
            completed: step3Completed,
          },
          step4: {
            title: 'Identity Verification',
            completed: step4Completed,
          },
          step5: {
            title: 'Compliance',
            completed: step5Completed,
          },
          step6: {
            title: 'Final Completion',
            completed: step6Completed,
          },
        };

        const currentStep = physician.onboarding_step;
        const isCompleted = physician.onboarding_step >= 6;
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
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  static async completeStep1(req, res, next) {
    try {
      const physicianId = req.user.id;

      const physician = await Physician.getPublicProfile(physicianId);

      // Step 1 is only for Two-Factor Authentication setup
      // Check if 2FA is enabled before marking as complete
      if (!physician.two_factor_enabled || !physician.two_factor_confirmed_at) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor authentication must be enabled before completing Step 1',
        });
      }

      // Update onboarding step to 2 after 2FA is enabled
      await Physician.update(physicianId, {
        onboarding_step: 2,
      });

      const updatedPhysician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 1 completed',
        data: updatedPhysician,
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
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const physicianId = req.user.id;
      const {
        npi_number,
        medical_licenses,
        medical_license_upload_ids,
        board_certification_upload_ids,
      } = req.body;

      const now = getCurrentTimestampString();

      // Update physicians table with NPI number
      await connection.execute(
        'UPDATE physicians SET npi_number = ?, onboarding_step = 4 WHERE id = ?',
        [npi_number, physicianId]
      );

      // Delete existing medical licenses for this physician
      await connection.execute(
        'DELETE FROM physician_medical_licenses WHERE physician_id = ?',
        [physicianId]
      );

      // Insert new medical licenses
      for (const license of medical_licenses) {
        await connection.execute(
          'INSERT INTO physician_medical_licenses (physician_id, license_number, state, expiry_date, created_at) VALUES (?, ?, ?, ?, ?)',
          [physicianId, license.license_number, license.state, license.expiry_date, now]
        );
      }

      // Validate ownership of medical license uploads (doc_type_id = 3) FIRST
      for (const uploadId of medical_license_upload_ids) {
        const [upload] = await connection.execute(
          'SELECT * FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = ? AND doc_type_id = 3 AND status = 1',
          [uploadId, physicianId, 'P']
        );
        if (!upload.length) {
          throw new Error('Invalid medical license upload ID or access denied');
        }
      }

      // Validate ownership of board certification uploads (doc_type_id = 5) FIRST
      for (const uploadId of board_certification_upload_ids) {
        const [upload] = await connection.execute(
          'SELECT * FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = ? AND doc_type_id = 5 AND status = 1',
          [uploadId, physicianId, 'P']
        );
        if (!upload.length) {
          throw new Error('Invalid board certification upload ID or access denied');
        }
      }

      // Get existing medical license uploads (doc_type_id = 3) before disabling
      const [existingLicenseUploads] = await connection.execute(
        'SELECT id, url FROM user_uploads WHERE user_id = ? AND user_type = ? AND doc_type_id = 3 AND status = 1',
        [physicianId, 'P']
      );

      // Delete physical files for existing medical license uploads (excluding the ones being resubmitted)
      for (const doc of existingLicenseUploads) {
        // Don't delete if it's one of the new uploads being submitted
        if (!medical_license_upload_ids.includes(doc.id)) {
          const filePath = path.join(__dirname, '../../../uploads', path.basename(doc.url));
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error('Error deleting file:', filePath, err);
            }
          }
        }
      }

      // Mark existing medical license uploads as disabled in database (excluding the ones being resubmitted)
      if (medical_license_upload_ids.length > 0) {
        const placeholders = medical_license_upload_ids.map(() => '?').join(',');
        await connection.execute(
          `UPDATE user_uploads SET status = 0 WHERE user_id = ? AND user_type = ? AND doc_type_id = 3 AND id NOT IN (${placeholders})`,
          [physicianId, 'P', ...medical_license_upload_ids]
        );
      } else {
        await connection.execute(
          'UPDATE user_uploads SET status = 0 WHERE user_id = ? AND user_type = ? AND doc_type_id = 3',
          [physicianId, 'P']
        );
      }

      // Get existing board certification uploads (doc_type_id = 5) before disabling
      const [existingBoardUploads] = await connection.execute(
        'SELECT id, url FROM user_uploads WHERE user_id = ? AND user_type = ? AND doc_type_id = 5 AND status = 1',
        [physicianId, 'P']
      );

      // Delete physical files for existing board certification uploads (excluding the ones being resubmitted)
      for (const doc of existingBoardUploads) {
        // Don't delete if it's one of the new uploads being submitted
        if (!board_certification_upload_ids.includes(doc.id)) {
          const filePath = path.join(__dirname, '../../../uploads', path.basename(doc.url));
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error('Error deleting file:', filePath, err);
            }
          }
        }
      }

      // Mark existing board certification uploads as disabled in database (excluding the ones being resubmitted)
      if (board_certification_upload_ids.length > 0) {
        const placeholders = board_certification_upload_ids.map(() => '?').join(',');
        await connection.execute(
          `UPDATE user_uploads SET status = 0 WHERE user_id = ? AND user_type = ? AND doc_type_id = 5 AND id NOT IN (${placeholders})`,
          [physicianId, 'P', ...board_certification_upload_ids]
        );
      } else {
        await connection.execute(
          'UPDATE user_uploads SET status = 0 WHERE user_id = ? AND user_type = ? AND doc_type_id = 5',
          [physicianId, 'P']
        );
      }

      await connection.commit();

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 3 completed',
        data: physician,
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  }

  static async completeStep4(req, res, next) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const physicianId = req.user.id;
      const {
        identity_document_upload_ids,
        selfie_upload_id,
      } = req.body;

      // Validate ownership of ID documents (doc_type_id = 1) FIRST
      for (const uploadId of identity_document_upload_ids) {
        const [upload] = await connection.execute(
          'SELECT * FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = ? AND doc_type_id = 1 AND status = 1',
          [uploadId, physicianId, 'P']
        );
        if (!upload.length) {
          throw new Error('Invalid identity document upload ID or access denied');
        }
      }

      // Validate ownership of selfie (doc_type_id = 2) FIRST
      const [selfie] = await connection.execute(
        'SELECT * FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = ? AND doc_type_id = 2 AND status = 1',
        [selfie_upload_id, physicianId, 'P']
      );
      if (!selfie.length) {
        throw new Error('Invalid selfie upload ID or access denied');
      }

      // Get existing identity documents (doc_type_id = 1) before disabling
      const [existingIdDocs] = await connection.execute(
        'SELECT url FROM user_uploads WHERE user_id = ? AND user_type = ? AND doc_type_id = 1 AND status = 1',
        [physicianId, 'P']
      );

      // Delete physical files for existing identity documents (excluding the ones being resubmitted)
      for (const doc of existingIdDocs) {
        // Don't delete if it's one of the new uploads being submitted
        if (!identity_document_upload_ids.includes(doc.id)) {
          const filePath = path.join(__dirname, '../../../uploads', path.basename(doc.url));
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error('Error deleting file:', filePath, err);
            }
          }
        }
      }

      // Mark existing identity documents as disabled in database (excluding the ones being resubmitted)
      if (identity_document_upload_ids.length > 0) {
        const placeholders = identity_document_upload_ids.map(() => '?').join(',');
        await connection.execute(
          `UPDATE user_uploads SET status = 0 WHERE user_id = ? AND user_type = ? AND doc_type_id = 1 AND id NOT IN (${placeholders})`,
          [physicianId, 'P', ...identity_document_upload_ids]
        );
      } else {
        await connection.execute(
          'UPDATE user_uploads SET status = 0 WHERE user_id = ? AND user_type = ? AND doc_type_id = 1',
          [physicianId, 'P']
        );
      }

      // Get existing selfie (doc_type_id = 2) before disabling
      const [existingSelfie] = await connection.execute(
        'SELECT url FROM user_uploads WHERE user_id = ? AND user_type = ? AND doc_type_id = 2 AND status = 1',
        [physicianId, 'P']
      );

      // Delete physical file for existing selfie (excluding the one being resubmitted)
      for (const doc of existingSelfie) {
        // Don't delete if it's the new selfie being submitted
        if (doc.id !== selfie_upload_id) {
          const filePath = path.join(__dirname, '../../../uploads', path.basename(doc.url));
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error('Error deleting file:', filePath, err);
            }
          }
        }
      }

      // Mark existing selfie as disabled in database (excluding the one being resubmitted)
      await connection.execute(
        'UPDATE user_uploads SET status = 0 WHERE user_id = ? AND user_type = ? AND doc_type_id = 2 AND id != ?',
        [physicianId, 'P', selfie_upload_id]
      );

      // Update identity status to pending
      await connection.execute(
        'UPDATE physicians SET identity_status = ?, identity_provider = ?, onboarding_step = 5 WHERE id = ?',
        ['pending', 'manual', physicianId]
      );

      await connection.commit();

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 4 completed - Identity verification pending review',
        data: physician,
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  }

  static async completeStep5(req, res, next) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const physicianId = req.user.id;
      const {
        agreed_document_ids,
        conflict_of_interest,
        conflict_of_interest_details,
        signature_upload_id,
      } = req.body;

      const now = getCurrentTimestampString();

      // Validate that all required documents are agreed to
      const requiredDocTypes = [8, 9, 10, 11]; // BAA, NDA, HIPAA, Terms of Service
      const missingDocs = requiredDocTypes.filter(id => !agreed_document_ids.includes(id));
      if (missingDocs.length > 0) {
        throw new Error('You must agree to all compliance documents');
      }

      // Validate ownership of signature upload (doc_type_id = 7) FIRST
      const [signature] = await connection.execute(
        'SELECT * FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = ? AND doc_type_id = 7 AND status = 1',
        [signature_upload_id, physicianId, 'P']
      );
      if (!signature.length) {
        throw new Error('Invalid signature upload ID or access denied');
      }

      // Get existing signature uploads (doc_type_id = 7) before disabling
      const [existingSignatureUploads] = await connection.execute(
        'SELECT id, url FROM user_uploads WHERE user_id = ? AND user_type = ? AND doc_type_id = 7 AND status = 1',
        [physicianId, 'P']
      );

      // Delete physical files for existing signature uploads (excluding the one being resubmitted)
      for (const doc of existingSignatureUploads) {
        // Don't delete if it's the new signature being submitted
        if (doc.id !== signature_upload_id) {
          const filePath = path.join(__dirname, '../../../uploads', path.basename(doc.url));
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error('Error deleting file:', filePath, err);
            }
          }
        }
      }

      // Mark existing signature uploads as disabled in database (excluding the one being resubmitted)
      await connection.execute(
        'UPDATE user_uploads SET status = 0 WHERE user_id = ? AND user_type = ? AND doc_type_id = 7 AND id != ?',
        [physicianId, 'P', signature_upload_id]
      );

      // Delete existing compliance documents for this physician
      await connection.execute(
        'DELETE FROM physician_compliance_documents WHERE physician_id = ?',
        [physicianId]
      );

      // Insert agreed compliance documents
      for (const docTypeId of agreed_document_ids) {
        await connection.execute(
          'INSERT INTO physician_compliance_documents (physician_id, doc_type_id, agreed_at, signature_upload_id, created_at) VALUES (?, ?, ?, ?, ?)',
          [physicianId, docTypeId, now, signature_upload_id, now]
        );
      }

      // Update physicians table with conflict of interest and compliance status
      await connection.execute(
        'UPDATE physicians SET conflict_of_interest = ?, conflict_of_interest_details = ?, compliance_completed_at = ?, onboarding_step = 6 WHERE id = ?',
        [conflict_of_interest ? 1 : 0, conflict_of_interest_details, now, physicianId]
      );

      await connection.commit();

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: 'Step 5 completed - Compliance documents agreed',
        data: physician,
      });
    } catch (error) {
      await connection.rollback();
      next(error);
    } finally {
      connection.release();
    }
  }

  static async completeStep6(req, res, next) {
    try {
      const physicianId = req.user.id;

      await Physician.update(physicianId, {
        onboarding_step: 6,
        onboarding_completed_at: getCurrentTimestampString(),
        is_onboard_complete: 1,
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
