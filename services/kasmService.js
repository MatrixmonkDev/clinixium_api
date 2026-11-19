import axios from 'axios';
import https from 'https';

class KasmService {
  static client = null;
  static useOldApi = false;

  static init() {
    // Remove trailing slash if present
    const baseUrl = process.env.KASM_URL.replace(/\/$/, '');

    console.log('Kasm Service initializing with URL:', baseUrl);

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      // For self-signed certificates in development
      httpsAgent: process.env.NODE_ENV === 'development' ? new https.Agent({
        rejectUnauthorized: false
      }) : undefined,
    });
  }

  static getAuthData() {
    return {
      api_key: process.env.KASM_API_KEY,
      api_key_secret: process.env.KASM_API_SECRET,
    };
  }

  /**
   * Request a Kasm session for a user
   * Uses old API: POST /api/public/request_kasm
   */
  static async requestKasm(config) {
  if (!this.client) {
    this.init();
  }

  try {
    const response = await this.client.post('/api/public/request_kasm', {
      ...this.getAuthData(),
      ...config,
    });

    return response.data;
  } catch (error) {
    console.error('Kasm API Error:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.error_message ||
        error.response?.data?.message ||
        'Failed to request Kasm session'
    );
  }
}

  /**
   * Get Kasm session details
   * Uses old API: POST /api/public/get_kasm
   */
  static async getKasm(kasmId) {
    if (!this.client) {
      this.init();
    }

    try {
      const response = await this.client.post('/api/public/get_kasm', {
        ...this.getAuthData(),
        kasm_id: kasmId,
      });

      return response.data;
    } catch (error) {
      console.error('Kasm API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_message || error.response?.data?.message || 'Failed to get Kasm session');
    }
  }

  /**
   * Stop a Kasm session
   * Uses old API: POST /api/public/stop_kasm
   */
  static async stopKasm(kasmId) {
    if (!this.client) {
      this.init();
    }

    try {
      const response = await this.client.post('/api/public/stop_kasm', {
        ...this.getAuthData(),
        kasm_id: kasmId,
      });

      return response.data;
    } catch (error) {
      console.error('Kasm API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_message || error.response?.data?.message || 'Failed to stop Kasm session');
    }
  }

  /**
   * Terminate a Kasm session
   * Uses old API: POST /api/public/terminate_kasm
   */
  static async terminateKasm(kasmId) {
    if (!this.client) {
      this.init();
    }

    try {
      const response = await this.client.post('/api/public/terminate_kasm', {
        ...this.getAuthData(),
        kasm_id: kasmId,
      });

      return response.data;
    } catch (error) {
      console.error('Kasm API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error_message || error.response?.data?.message || 'Failed to terminate Kasm session');
    }
  }

  /**
   * Create a session for a specific user and workspace
   * This is the main method to create a workspace session for a physician
   */
  static async createSessionForUser(userId, workspaceId, options = {}) {
    const config = {
      user_id: userId,
      workspace_id: workspaceId,
      ...options,
    };

    return await this.requestKasm(config);
  }

  /**
   * Test connection to Kasm API
   * Uses old API: POST /api/public/get_images
   */
  static async testConnection() {
    if (!this.client) {
      this.init();
    }

    try {
      const response = await this.client.post('/api/public/get_images', {
        ...this.getAuthData(),
      });

      return {
        success: true,
        message: 'Kasm API connection successful',
        data: response.data,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Kasm API connection failed',
        error:
          error.response?.data?.error_message ||
          error.response?.data?.message ||
          error.message,
      };
    }
  }
}

export default KasmService;
