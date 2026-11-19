import KasmService from '../../kasmService.js';

class KasmController {
  static async testConnection(req, res, next) {
    try {
      const result = await KasmService.testConnection();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async testSession(req, res, next) {
    try {
      const { workspace_id, image_id, user_id } = req.body;
      const targetImageId = image_id || workspace_id;

      if (!targetImageId) {
        return res.status(400).json({
          success: false,
          message: 'image_id (or workspace_id) is required',
        });
      }

      // Build payload using Kasm's expected field names
      const payload = {
        image_id: targetImageId,
        enable_sharing: true, // Optional: allows view-only sharing
      };

      // Only include user_id if a real Kasm user UUID is passed;
      // otherwise omit it so Kasm creates a temporary anonymous user
      if (user_id) {
        payload.user_id = user_id;
      }

      const result = await KasmService.requestKasm(payload);

      res.status(200).json({
        success: true,
        message: 'Workspace session request successful',
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Workspace session request failed',
        error:
          error.response?.data?.error_message ||
          error.response?.data?.message ||
          error.message,
      });
    }
  }
}

export default KasmController;
