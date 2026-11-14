import Developer from '../models/Developer.js';
import AuthService from '../../../services/authService.js';
import LoginActivityService from '../../../services/loginActivityService.js';
import pool from '../../../config/database.js';

class DeveloperController {
  static async getProfile(req, res, next) {
    try {
      const developerId = req.user.id;
      const connection = await pool.getConnection();

      try {
        // Get basic developer profile
        const developer = await Developer.getPublicProfile(developerId);

        if (!developer) {
          return res.status(404).json({
            success: false,
            message: 'Developer not found',
          });
        }

        // Get onboarding data (all 6 steps)
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
            ...developer,
            onboarding: {
              step1: step1Organization[0] || null,
              step2: step2Representative[0] || null,
              step3: step3Data[0] || {},
              step4: step4Billing[0] || null,
              step5: {
                agreements: step5AgreementsWithUrl
              },
              step6: step6Data[0] || {}
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
      const developerId = req.user.id;
      const { thumbnail_upload_id, ...updateData } = req.body;

      // Update thumbnail if upload_id is provided
      if (thumbnail_upload_id) {
        const updatePhotoQuery = `
          UPDATE developer_mst
          SET thumbnail = (SELECT url FROM user_uploads WHERE id = ? AND user_id = ? AND user_type = 'D')
          WHERE id = ?
        `;
        await pool.execute(updatePhotoQuery, [thumbnail_upload_id, developerId, developerId]);
      }

      // Update other fields
      if (Object.keys(updateData).length > 0) {
        await Developer.update(developerId, updateData);
      }

      const updatedDeveloper = await Developer.getPublicProfile(developerId);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedDeveloper,
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const developerId = req.user.id;
      const { current_password, new_password } = req.body;

      const developer = await Developer.findById(developerId);
      if (!developer) {
        return res.status(404).json({
          success: false,
          message: 'Developer not found',
        });
      }

      const isValid = await AuthService.comparePassword(current_password, developer.user_password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const user_password = await AuthService.hashPassword(new_password);
      await Developer.update(developerId, { user_password });

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
      const developerId = req.user.id;
      const limit = parseInt(req.query.limit) || 20;

      const history = await LoginActivityService.getUserLoginHistory('D', developerId, limit);

      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default DeveloperController;
