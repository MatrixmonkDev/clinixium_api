import Developer from '../models/Developer.js';
import DeveloperOrganization from '../models/DeveloperOrganization.js';
import DeveloperRepresentative from '../models/DeveloperRepresentative.js';
import DeveloperBilling from '../models/DeveloperBilling.js';
import DeveloperAgreement from '../models/DeveloperAgreement.js';
import AuthService from '../../../services/authService.js';
import RefreshTokenService from '../../../services/refreshTokenService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import TwoFactorService from '../../../services/twoFactorService.js';
import EmailService from '../../../services/emailService.js';
import { setRefreshCookie } from '../../../utils/refreshCookie.js';
import { getRequestInfo } from '../../../utils/requestInfo.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';
import crypto from 'crypto';
import pool from '../../../config/database.js';

class DeveloperAuthController {
  static async register(req, res, next) {
    try {
      const { email, password, confirm_password, user_name, user_mname, user_lname } = req.body;
      const { ip, browser } = getRequestInfo(req);

      // Validate confirm password
      if (password !== confirm_password) {
        return res.status(400).json({
          success: false,
          message: 'Passwords do not match',
        });
      }

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

      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const developerId = await Developer.create({
        user_id,
        user_name,
        user_mname,
        user_lname,
        user_email: email,
        user_password,
        rand_key,
        email_verification_token: emailVerificationToken,
        email_verification_expires_at: emailVerificationExpiresAt,
        status: 0, // Pending email verification
        onboarding_step: 1, // Ready for onboarding after email verification
      });

      // Send verification email
      const fullName = user_name + (user_lname ? ` ${user_lname}` : '');
      const emailResult = await EmailService.sendEmailVerificationEmail(
        email,
        emailVerificationToken,
        fullName
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
      }

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email to verify your account.',
        data: {
          email: email,
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

      // Check if email is verified
      if (!developer.email_verified_at) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in',
        });
      }

      if (developer.status === 2) {
        return res.status(403).json({
          success: false,
          message: 'Account expired',
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

      if (developer.two_factor_enabled) {
        const tempToken = AuthService.generateToken({
          id: developer.id,
          userId: developer.user_id,
          email: developer.user_email,
          userType: 'developer',
          twoFactorPending: true,
        }, '5m');

        return res.status(200).json({
          success: true,
          two_factor_enabled: 1,
          message: 'Two-factor authentication required',
          data: { tempToken },
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

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const thumbnail = developer.thumbnail ? `${baseUrl}${developer.thumbnail}` : null;

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
            thumbnail,
            user_email: developer.user_email,
            onboarding_step: developer.onboarding_step || 1,
            is_onboard_complete: developer.is_onboard_complete || 0,
            is_approved: developer.is_approved || 0,
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
      const developerId = req.user.id;
      const { ip, browser } = getRequestInfo(req);

      const developer = await Developer.findById(developerId);
      if (!developer) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found',
        });
      }

      if (developer.status === 2) {
        return res.status(403).json({
          success: false,
          message: 'Account expired',
        });
      }

      if (!developer.two_factor_secret) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor authentication is not enabled for this account',
        });
      }

      const isValid = TwoFactorService.verifyToken(
        developer.two_factor_secret.toString('utf8'),
        two_factor_code
      );

      if (!isValid) {
        await LoginActivityService.logLoginAttempt('D', developerId, ip, browser, 'failed', 'Invalid 2FA code');
        const blockStatus = await LoginActivityService.checkAndHandleFailedAttempt('D', developerId, ip);

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

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const thumbnail = developer.thumbnail ? `${baseUrl}${developer.thumbnail}` : null;

      res.status(200).json({
        success: true,
        two_factor_enabled: 1,
        message: 'Two-factor verification successful',
        data: {
          accessToken,
          developer: {
            id: developer.id,
            userId: developer.user_id,
            user_name: developer.user_name,
            user_mname: developer.user_mname,
            user_lname: developer.user_lname,
            thumbnail,
            user_email: developer.user_email,
            onboarding_step: developer.onboarding_step || 1,
            is_onboard_complete: developer.is_onboard_complete || 0,
            is_approved: developer.is_approved || 0,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async setupTwoFactor(req, res, next) {
    try {
      const developerId = req.user.id;

      const developer = await Developer.findById(developerId);
      if (!developer) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found',
        });
      }

      if (developer.status === 2) {
        return res.status(403).json({
          success: false,
          message: 'Account expired',
        });
      }

      // Custom issuer with user type and email
      const issuer = `Clinixium (D: ${developer.user_email})`;
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
      const developerId = req.user.id;

      const isValid = TwoFactorService.verifyToken(secret, two_factor_code);

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid two-factor code',
        });
      }

      const developer = await Developer.findById(developerId);
      if (!developer) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found',
        });
      }

      if (developer.status === 2) {
        return res.status(403).json({
          success: false,
          message: 'Account expired',
        });
      }

      const recoveryCodes = TwoFactorService.generateRecoveryCodes();

      await Developer.updateTwoFactor(developerId, {
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
      const developerId = req.user.id;

      await Developer.updateTwoFactor(developerId, {
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

  static async verifyEmail(req, res, next) {
    try {
      const { token } = req.query;

      const developer = await Developer.findByEmailVerificationToken(token);

      if (!developer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token',
        });
      }

      // Check if token is expired
      if (developer.email_verification_expires_at && new Date(developer.email_verification_expires_at) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Verification token has expired. Please request a new verification email.',
        });
      }

      // Check if already verified
      if (developer.email_verified_at) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified',
        });
      }

      // Mark email as verified
      await Developer.update(developer.id, {
        email_verified_at: getCurrentTimestampString(),
        email_verification_token: null,
        email_verification_expires_at: null,
        status: 1, // Active
        onboarding_step: 1, // Initialize onboarding step
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully. You can now login and complete your onboarding.',
      });
    } catch (error) {
      next(error);
    }
  }

  static async resendVerificationEmail(req, res, next) {
    try {
      const { email } = req.body;

      const developer = await Developer.findByEmail(email);

      if (!developer) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found',
        });
      }

      if (developer.email_verified_at) {
        return res.status(400).json({
          success: false,
          message: 'Email already verified',
        });
      }

      // Generate new verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await Developer.update(developer.id, {
        email_verification_token: emailVerificationToken,
        email_verification_expires_at: emailVerificationExpiresAt,
      });

      // Send verification email
      const fullName = developer.user_name + (developer.user_lname ? ` ${developer.user_lname}` : '');
      const emailResult = await EmailService.sendEmailVerificationEmail(
        email,
        emailVerificationToken,
        fullName
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
      }

      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // Onboarding Step 1: Organization Details
  static async completeOnboardingStep1(req, res, next) {
    try {
      const developerId = req.user.id;
      const {
        legal_organization_name,
        organization_type,
        organization_website,
        business_registration_number,
        country_id,
        street_address,
        city,
        state,
        zip_code,
      } = req.body;

      // Check that at least one field is filled
      const hasData = [
        legal_organization_name,
        organization_type,
        organization_website,
        business_registration_number,
        country_id,
        street_address,
        city,
        state,
        zip_code,
      ].some(field => field !== undefined && field !== null && field !== '');

      if (!hasData) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be filled',
        });
      }

      // Check if organization already exists for this developer
      const existingOrg = await DeveloperOrganization.findByDeveloperId(developerId);

      if (existingOrg) {
        // Update existing organization
        await DeveloperOrganization.update(existingOrg.id, {
          legal_organization_name,
          organization_type,
          organization_website,
          business_registration_number,
          country_id,
          street_address,
          city,
          state,
          zip_code,
        });
      } else {
        // Create new organization
        await DeveloperOrganization.create({
          developer_id: developerId,
          legal_organization_name,
          organization_type,
          organization_website,
          business_registration_number,
          country_id,
          street_address,
          city,
          state,
          zip_code,
        });
      }

      // Update onboarding step to 2
      await Developer.update(developerId, {
        onboarding_step: 2,
      });

      const updatedDeveloper = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: 'Step 1 completed successfully',
        data: updatedDeveloper,
      });
    } catch (error) {
      next(error);
    }
  }

  // Onboarding Step 2: Representative Details
  static async completeOnboardingStep2(req, res, next) {
    try {
      const developerId = req.user.id;
      const {
        first_name,
        last_name,
        email,
        phone_number,
        country_code_id,
        role,
      } = req.body;

      // Check that at least one field is filled
      const hasData = [
        first_name,
        last_name,
        email,
        phone_number,
        country_code_id,
        role,
      ].some(field => field !== undefined && field !== null && field !== '');

      if (!hasData) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be filled',
        });
      }

      // Get organization for this developer
      const organization = await DeveloperOrganization.findByDeveloperId(developerId);

      if (!organization) {
        return res.status(400).json({
          success: false,
          message: 'Please complete Step 1 (Organization) first',
        });
      }

      // Check if representative already exists for this developer
      const existingRep = await DeveloperRepresentative.findByDeveloperId(developerId);

      if (existingRep) {
        // Update existing representative
        await DeveloperRepresentative.update(existingRep.id, {
          first_name,
          last_name,
          email,
          phone_number,
          country_code_id,
          role,
        });
      } else {
        // Create new representative
        await DeveloperRepresentative.create({
          developer_id: developerId,
          organization_id: organization.id,
          first_name,
          last_name,
          email,
          phone_number,
          country_code_id,
          role,
        });
      }

      // Update onboarding step to 3
      await Developer.update(developerId, {
        onboarding_step: 3,
      });

      const updatedDeveloper = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: 'Step 2 completed successfully',
        data: updatedDeveloper,
      });
    } catch (error) {
      next(error);
    }
  }

  // Onboarding Step 3: Security (Two-Factor Authentication)
  static async completeOnboardingStep3(req, res, next) {
    try {
      const developerId = req.user.id;

      const developer = await Developer.getPublicProfile(developerId);

      // Step 3 is only for Two-Factor Authentication setup
      // Check if 2FA is enabled before marking as complete
      if (!developer.two_factor_enabled || !developer.two_factor_confirmed_at) {
        return res.status(400).json({
          success: false,
          message: 'Two-factor authentication must be enabled before completing Step 3',
        });
      }

      // Update onboarding step to 4 after 2FA is enabled
      await Developer.update(developerId, {
        onboarding_step: 4,
      });

      const updatedDeveloper = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: 'Step 3 completed successfully',
        data: updatedDeveloper,
      });
    } catch (error) {
      next(error);
    }
  }

  // Onboarding Step 4: Billing Details
  static async completeOnboardingStep4(req, res, next) {
    try {
      const developerId = req.user.id;
      const {
        billing_email,
        billing_phone,
        billing_address,
        billing_city,
        billing_state,
        billing_zip_code,
        billing_country_id,
        tax_id,
      } = req.body;

      // Check that at least one field is filled
      const hasData = [
        billing_email,
        billing_phone,
        billing_address,
        billing_city,
        billing_state,
        billing_zip_code,
        billing_country_id,
        tax_id,
      ].some(field => field !== undefined && field !== null && field !== '');

      if (!hasData) {
        return res.status(400).json({
          success: false,
          message: 'At least one field must be filled',
        });
      }

      // Get organization for this developer
      const organization = await DeveloperOrganization.findByDeveloperId(developerId);

      if (!organization) {
        return res.status(400).json({
          success: false,
          message: 'Please complete Step 1 (Organization) first',
        });
      }

      // Check if billing already exists for this developer
      const existingBilling = await DeveloperBilling.findByDeveloperId(developerId);

      if (existingBilling) {
        // Update existing billing
        await DeveloperBilling.update(existingBilling.id, {
          billing_email,
          billing_phone,
          billing_address,
          billing_city,
          billing_state,
          billing_zip_code,
          billing_country_id,
          tax_id,
        });
      } else {
        // Create new billing
        await DeveloperBilling.create({
          developer_id: developerId,
          organization_id: organization.id,
          billing_email,
          billing_phone,
          billing_address,
          billing_city,
          billing_state,
          billing_zip_code,
          billing_country_id,
          tax_id,
        });
      }

      // Update onboarding step to 5
      await Developer.update(developerId, {
        onboarding_step: 5,
      });

      const updatedDeveloper = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: 'Step 4 completed successfully',
        data: updatedDeveloper,
      });
    } catch (error) {
      next(error);
    }
  }

  // Onboarding Step 5: Agreements
  static async completeOnboardingStep5(req, res, next) {
    try {
      const developerId = req.user.id;
      const {
        agreed_document_ids,
        signature_upload_id,
      } = req.body;

      // Validate that at least one document is agreed
      if (!agreed_document_ids || !Array.isArray(agreed_document_ids) || agreed_document_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one agreement must be accepted',
        });
      }

      // Validate signature is provided
      if (!signature_upload_id) {
        return res.status(400).json({
          success: false,
          message: 'Signature upload is required',
        });
      }

      const now = getCurrentTimestampString();

      // Delete existing agreements for this developer (replace with new ones)
      await DeveloperAgreement.deleteByDeveloperId(developerId);

      // Insert new agreements
      for (const docTypeId of agreed_document_ids) {
        await DeveloperAgreement.create({
          developer_id: developerId,
          doc_type_id: docTypeId,
          agreed_at: now,
          signature_upload_id: signature_upload_id,
        });
      }

      // Update onboarding step to 6
      await Developer.update(developerId, {
        onboarding_step: 6,
      });

      const updatedDeveloper = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: 'Step 5 completed successfully',
        data: updatedDeveloper,
      });
    } catch (error) {
      next(error);
    }
  }

  // Onboarding Step 6: Final Completion
  static async completeOnboardingStep6(req, res, next) {
    try {
      const developerId = req.user.id;

      const now = getCurrentTimestampString();

      // Update onboarding completion fields
      await Developer.update(developerId, {
        onboarding_step: 6,
        onboarding_completed_at: now,
        is_onboard_complete: 1,
        is_approved: 0, // Pending approval
      });

      const updatedDeveloper = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: 'Onboarding completed successfully. Your account is pending approval.',
        data: updatedDeveloper,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get Onboarding Data
  static async getOnboardingData(req, res, next) {
    try {
      const developerId = req.user.id;
      const connection = await pool.getConnection();

      try {
        // Step 1: Organization Details
        const [step1Organization] = await connection.execute(
          `SELECT do.*, cc.name as country_name
          FROM developer_organizations do
          LEFT JOIN country_codes cc ON do.country_id = cc.id
          WHERE do.developer_id = ? AND do.status = 1`,
          [developerId]
        );

        // Step 2: Representative Details
        const [step2Representative] = await connection.execute(
          `SELECT dr.*, cc.code as country_code, cc.name as country_name
          FROM developer_representatives dr
          LEFT JOIN country_codes cc ON dr.country_code_id = cc.id
          WHERE dr.developer_id = ? AND dr.status = 1`,
          [developerId]
        );

        // Step 3: Security (Two-Factor Authentication)
        const [step3Data] = await connection.execute(
          'SELECT two_factor_enabled, two_factor_method, two_factor_confirmed_at FROM developer_mst WHERE id = ?',
          [developerId]
        );

        // Step 4: Billing Details
        const [step4Billing] = await connection.execute(
          `SELECT db.*, cc.name as country_name
          FROM developer_billing db
          LEFT JOIN country_codes cc ON db.billing_country_id = cc.id
          WHERE db.developer_id = ? AND db.status = 1`,
          [developerId]
        );

        // Step 5: Agreements
        const [step5Agreements] = await connection.execute(
          `SELECT da.*, dt.name as document_name, dt.description as document_description, u.url as signature_url
          FROM developer_agreements da
          LEFT JOIN doc_types dt ON da.doc_type_id = dt.id
          LEFT JOIN user_uploads u ON da.signature_upload_id = u.id AND u.status = 1
          WHERE da.developer_id = ? AND da.status = 1`,
          [developerId]
        );

        // Step 6: Final Completion
        const [step6Data] = await connection.execute(
          'SELECT onboarding_completed_at, is_onboard_complete, is_approved FROM developer_mst WHERE id = ?',
          [developerId]
        );

        // Build response with full URLs
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

        const step5AgreementsWithUrl = step5Agreements.map(doc => ({
          ...doc,
          signature_url: doc.signature_url ? `${baseUrl}${doc.signature_url}` : null
        }));

        res.status(200).json({
          success: true,
          data: {
            step1: step1Organization[0] || null,
            step2: step2Representative[0] || null,
            step3: step3Data[0] || {},
            step4: step4Billing[0] || null,
            step5: {
              agreements: step5AgreementsWithUrl
            },
            step6: step6Data[0] || {}
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  // Get Onboarding Progress
  static async getOnboardingProgress(req, res, next) {
    try {
      const developerId = req.user.id;
      const connection = await pool.getConnection();

      try {
        const developer = await Developer.getPublicProfile(developerId);

        // Step 1: Check Organization
        const [step1Org] = await connection.execute(
          'SELECT COUNT(*) as count FROM developer_organizations WHERE developer_id = ? AND status = 1',
          [developerId]
        );
        const step1Completed = step1Org[0].count > 0;

        // Step 2: Check Representative
        const [step2Rep] = await connection.execute(
          'SELECT COUNT(*) as count FROM developer_representatives WHERE developer_id = ? AND status = 1',
          [developerId]
        );
        const step2Completed = step2Rep[0].count > 0;

        // Step 3: Check 2FA
        const step3Completed = !!developer.two_factor_enabled && !!developer.two_factor_confirmed_at;

        // Step 4: Check Billing
        const [step4Billing] = await connection.execute(
          'SELECT COUNT(*) as count FROM developer_billing WHERE developer_id = ? AND status = 1',
          [developerId]
        );
        const step4Completed = step4Billing[0].count > 0;

        // Step 5: Check Agreements
        const [step5Agreements] = await connection.execute(
          'SELECT COUNT(*) as count FROM developer_agreements WHERE developer_id = ? AND status = 1',
          [developerId]
        );
        const step5Completed = step5Agreements[0].count > 0;

        // Step 6: Check final completion
        const step6Completed = developer.onboarding_step >= 6 && !!developer.onboarding_completed_at;

        const steps = {
          step1: {
            title: 'Organization Details',
            completed: step1Completed,
          },
          step2: {
            title: 'Representative Details',
            completed: step2Completed,
          },
          step3: {
            title: 'Security (Two-Factor Authentication)',
            completed: step3Completed,
          },
          step4: {
            title: 'Billing Details',
            completed: step4Completed,
          },
          step5: {
            title: 'Agreements',
            completed: step5Completed,
          },
          step6: {
            title: 'Final Completion',
            completed: step6Completed,
          },
        };

        const currentStep = developer.onboarding_step;
        const isCompleted = developer.onboarding_step >= 6;
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
            onboardingCompletedAt: developer.onboarding_completed_at,
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
}

export default DeveloperAuthController;
