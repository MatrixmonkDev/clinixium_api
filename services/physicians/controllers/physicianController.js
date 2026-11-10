import Physician from '../models/Physician.js';
import AuthService from '../../../services/authService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import pool from '../../../config/database.js';

class PhysicianController {
  static async getProfile(req, res, next) {
    try {
      const physicianId = req.user.id;
      const connection = await pool.getConnection();

      try {
        // Get basic physician profile
        const physician = await Physician.getPublicProfile(physicianId);

        if (!physician) {
          return res.status(404).json({
            success: false,
            message: 'Physician not found',
          });
        }

        // Get onboarding data (all 6 steps)
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
          LEFT JOIN user_uploads u ON pcd.signature_upload_id = u.id
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
            ...physician,
            onboarding: {
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
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { profile_photo_upload_id, ...updateData } = req.body;

      // Update profile photo if upload_id is provided
      if (profile_photo_upload_id) {
        const updatePhotoQuery = `
          UPDATE physicians
          SET profile_photo_path = (SELECT url FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = 'P')
          WHERE id = ?
        `;
        await pool.execute(updatePhotoQuery, [profile_photo_upload_id, physicianId, physicianId]);
      }

      // Update other fields
      if (Object.keys(updateData).length > 0) {
        await Physician.update(physicianId, updateData);
      }

      // Get full profile with onboarding data (reuse getProfile logic)
      const connection = await pool.getConnection();

      try {
        const physician = await Physician.getPublicProfile(physicianId);

        if (!physician) {
          return res.status(404).json({
            success: false,
            message: 'Physician not found',
          });
        }

        // Get onboarding data (all 6 steps)
        const [step1Data] = await connection.execute(
          'SELECT two_factor_enabled, two_factor_method, two_factor_confirmed_at FROM physicians WHERE id = ?',
          [physicianId]
        );

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

        const [step5Physician] = await connection.execute(
          'SELECT compliance_completed_at, conflict_of_interest, conflict_of_interest_details FROM physicians WHERE id = ?',
          [physicianId]
        );

        const [step5ComplianceDocs] = await connection.execute(
          `SELECT pcd.*, dt.name as document_name, dt.description as document_description, u.url as signature_url
          FROM physician_compliance_documents pcd
          LEFT JOIN doc_types dt ON pcd.doc_type_id = dt.id
          LEFT JOIN user_uploads u ON pcd.signature_upload_id = u.id
          WHERE pcd.physician_id = ? AND pcd.status = 1`,
          [physicianId]
        );

        const [step6Physician] = await connection.execute(
          'SELECT onboarding_completed_at, is_onboard_complete, is_approved FROM physicians WHERE id = ?',
          [physicianId]
        );

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
          message: 'Profile updated successfully',
          data: {
            ...physician,
            onboarding: {
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
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const physicianId = req.user.id;
      const { current_password, new_password } = req.body;

      const physician = await Physician.findById(physicianId);
      if (!physician) {
        return res.status(404).json({
          success: false,
          message: 'Physician not found',
        });
      }

      const isValid = await AuthService.comparePassword(current_password, physician.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const password_hash = await AuthService.hashPassword(new_password);
      await Physician.update(physicianId, { password_hash });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLoginHistory(req, res, next) {
    try {
      const physicianId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const history = await LoginActivityService.getUserLoginHistory('P', physicianId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default PhysicianController;
