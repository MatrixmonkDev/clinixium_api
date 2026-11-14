import Admin from '../models/Admin.js';
import Physician from '../../physicians/models/Physician.js';
import Developer from '../../developer/models/Developer.js';
import AuthService from '../../../services/authService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import pool from '../../../config/database.js';
import { getCurrentTimestampString } from '../../../utils/timestamp.js';

class AdminController {
  static async getProfile(req, res, next) {
    try {
      const adminId = req.user.id;

      const admin = await Admin.getPublicProfile(adminId);

      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      res.status(200).json({
        success: true,
        data: admin,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const adminId = req.user.id;
      const { thumbnail_upload_id, ...updateData } = req.body;

      // Update thumbnail if upload_id is provided
      if (thumbnail_upload_id) {
        const updatePhotoQuery = `
          UPDATE admin_mst
          SET thumbnail = (SELECT url FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = 'A')
          WHERE id = ?
        `;
        await pool.execute(updatePhotoQuery, [thumbnail_upload_id, adminId, adminId]);
      }

      // Update other fields
      if (Object.keys(updateData).length > 0) {
        await Admin.update(adminId, updateData);
      }

      const updatedAdmin = await Admin.getPublicProfile(adminId);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedAdmin,
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const adminId = req.user.id;
      const { current_password, new_password } = req.body;

      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      const isValid = await AuthService.comparePassword(current_password, admin.user_password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const user_password = await AuthService.hashPassword(new_password);
      await Admin.update(adminId, { user_password });

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
      const adminId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const history = await LoginActivityService.getUserLoginHistory('A', adminId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPhysiciansList(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', status } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          id, uuid, email, first_name, last_name,
          phone_number, country_code_id, professional_title,
          profile_photo_path, status, created_on,
          onboarding_step, onboarding_completed_at,
          is_onboard_complete, is_approved
        FROM physicians
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (status !== undefined && status !== '') {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY created_on DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [rows] = await pool.execute(query, params);

      // Add full URLs for profile photos
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const rowsWithUrls = rows.map(row => {
        if (row.profile_photo_path) {
          return {
            ...row,
            profile_photo: `${baseUrl}${row.profile_photo_path}`
          };
        }
        return row;
      });

      const countQuery = `
        SELECT COUNT(*) as total FROM physicians WHERE 1=1
        ${search ? ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)` : ''}
        ${status !== undefined && status !== '' ? ` AND status = ?` : ''}
      `;
      const countParams = [];
      if (search) {
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }
      if (status !== undefined && status !== '') {
        countParams.push(status);
      }

      const [countRows] = await pool.execute(countQuery, countParams);
      const total = countRows[0].total;

      res.status(200).json({
        success: true,
        data: rowsWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDevelopersList(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '', status } = req.query;
      const offset = (page - 1) * limit;

      let query = `
        SELECT
          id, user_id, user_name, user_mname, user_lname,
          thumbnail, user_email, insert_date, last_login, status,
          onboarding_step, onboarding_completed_at,
          is_onboard_complete, is_approved
        FROM developer_mst
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ` AND (user_name LIKE ? OR user_lname LIKE ? OR user_email LIKE ?)`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      if (status !== undefined && status !== '') {
        query += ` AND status = ?`;
        params.push(status);
      }

      query += ` ORDER BY insert_date DESC LIMIT ? OFFSET ?`;
      params.push(parseInt(limit), offset);

      const [rows] = await pool.execute(query, params);

      // Add full URLs for thumbnails
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const rowsWithUrls = rows.map(row => {
        if (row.thumbnail) {
          return {
            ...row,
            thumbnail: `${baseUrl}${row.thumbnail}`
          };
        }
        return row;
      });

      const countQuery = `
        SELECT COUNT(*) as total FROM developer_mst WHERE 1=1
        ${search ? ` AND (user_name LIKE ? OR user_lname LIKE ? OR user_email LIKE ?)` : ''}
        ${status !== undefined && status !== '' ? ` AND status = ?` : ''}
      `;
      const countParams = [];
      if (search) {
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern);
      }
      if (status !== undefined && status !== '') {
        countParams.push(status);
      }

      const [countRows] = await pool.execute(countQuery, countParams);
      const total = countRows[0].total;

      res.status(200).json({
        success: true,
        data: rowsWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserLoginHistory(req, res, next) {
    try {
      const { userType, userId } = req.params;
      const limit = parseInt(req.query.limit) || 20;

      if (!['A', 'P', 'D'].includes(userType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid user type. Must be A (Admin), P (Physician), or D (Developer)',
        });
      }

      const history = await LoginActivityService.getUserLoginHistory(userType, userId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPhysicianDetails(req, res, next) {
    try {
      const { physicianId } = req.params;
      const { include } = req.query; // include = 'onboarding', 'login_history', or 'all'
      const connection = await pool.getConnection();

      try {
        const response = {
          success: true,
          data: {}
        };

        // Get physician basic info
        const [physicianInfo] = await connection.execute(
          'SELECT id, uuid, email, first_name, last_name, phone_number, country_code_id, professional_title, profile_photo_path, status, onboarding_step, onboarding_completed_at, created_on, is_onboard_complete, is_approved FROM physicians WHERE id = ?',
          [physicianId]
        );

        if (physicianInfo.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Physician not found'
          });
        }

        const physician = physicianInfo[0];
        if (physician.profile_photo_path) {
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          physician.profile_photo = `${baseUrl}${physician.profile_photo_path}`;
        }
        response.data.physician = physician;

        // Include onboarding data if requested
        if (!include || include === 'onboarding' || include === 'all') {
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

          response.data.onboarding = {
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
          };
        }

        // Include login history if requested
        if (!include || include === 'login_history' || include === 'all') {
          const limit = parseInt(req.query.limit) || 20;
          const loginHistory = await LoginActivityService.getUserLoginHistory('P', physicianId, limit);
          response.data.login_history = loginHistory;
        }

        res.status(200).json(response);
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  static async approvePhysician(req, res, next) {
    try {
      const { physicianId } = req.params;
      const { status, rejection_reason } = req.body;

      if (!['1', '2'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be 1 (approve) or 2 (reject)',
        });
      }

      const updateData = {
        status: parseInt(status),
      };

      if (status === '2') {
        updateData.rejection_reason = rejection_reason || null;
        updateData.rejected_at = getCurrentTimestampString();
        updateData.is_approved = 0;
      } else {
        updateData.approved_at = getCurrentTimestampString();
        updateData.reviewed_by = req.user.id;
        updateData.is_approved = 1;
      }

      await Physician.update(physicianId, updateData);

      const physician = await Physician.getPublicProfile(physicianId);

      res.status(200).json({
        success: true,
        message: status === '1' ? 'Physician approved successfully' : 'Physician rejected successfully',
        data: physician,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDeveloperDetails(req, res, next) {
    try {
      const { developerId } = req.params;
      const { include } = req.query; // include = 'onboarding', 'login_history', or 'all'
      const connection = await pool.getConnection();

      try {
        const response = {
          success: true,
          data: {}
        };

        // Get developer basic info
        const [developerInfo] = await connection.execute(
          'SELECT id, user_id, user_name, user_mname, user_lname, thumbnail, user_email, insert_date, last_login, status, onboarding_step, onboarding_completed_at, is_onboard_complete, is_approved FROM developer_mst WHERE id = ?',
          [developerId]
        );

        if (developerInfo.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Developer not found'
          });
        }

        const developer = developerInfo[0];
        if (developer.thumbnail) {
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          developer.thumbnail = `${baseUrl}${developer.thumbnail}`;
        }
        response.data.developer = developer;

        // Include onboarding data if requested
        if (!include || include === 'onboarding' || include === 'all') {
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

          response.data.onboarding = {
            step1: step1Organization[0] || null,
            step2: step2Representative[0] || null,
            step3: step3Data[0] || {},
            step4: step4Billing[0] || null,
            step5: {
              agreements: step5AgreementsWithUrl
            },
            step6: step6Data[0] || {}
          };
        }

        // Include login history if requested
        if (!include || include === 'login_history' || include === 'all') {
          const limit = parseInt(req.query.limit) || 20;
          const loginHistory = await LoginActivityService.getUserLoginHistory('D', developer.user_id, limit);
          response.data.login_history = loginHistory;
        }

        res.status(200).json(response);
      } finally {
        connection.release();
      }
    } catch (error) {
      next(error);
    }
  }

  static async getPendingDevelopers(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const query = `
        SELECT
          id, user_id, user_name, user_mname, user_lname,
          thumbnail, user_email, insert_date, last_login, status,
          onboarding_step, onboarding_completed_at,
          is_onboard_complete, is_approved
        FROM developer_mst
        WHERE is_onboard_complete = 1 AND is_approved = 0
        ORDER BY insert_date DESC LIMIT ? OFFSET ?
      `;

      const [rows] = await pool.execute(query, [parseInt(limit), offset]);

      // Add full URLs for thumbnails
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const rowsWithUrls = rows.map(row => {
        if (row.thumbnail) {
          return {
            ...row,
            thumbnail: `${baseUrl}${row.thumbnail}`
          };
        }
        return row;
      });

      const [countRows] = await pool.execute(
        'SELECT COUNT(*) as total FROM developer_mst WHERE is_onboard_complete = 1 AND is_approved = 0'
      );
      const total = countRows[0].total;

      res.status(200).json({
        success: true,
        data: rowsWithUrls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async approveDeveloper(req, res, next) {
    try {
      const { developerId } = req.params;
      const { status, rejection_reason } = req.body;

      if (!['1', '2'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be 1 (approve) or 2 (reject)',
        });
      }

      const updateData = {
        status: parseInt(status),
      };

      if (status === '2') {
        updateData.rejection_reason = rejection_reason || null;
        updateData.rejected_at = getCurrentTimestampString();
        updateData.is_approved = 0;
      } else {
        updateData.approved_at = getCurrentTimestampString();
        updateData.reviewed_by = req.user.id;
        updateData.is_approved = 1;
      }

      await Developer.update(developerId, updateData);

      const developer = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: status === '1' ? 'Developer approved successfully' : 'Developer rejected successfully',
        data: developer,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default AdminController;
