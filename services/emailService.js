import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mailjet from 'node-mailjet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.client = mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_API_SECRET
    );
  }

  async sendPasswordResetEmail(userEmail, userType, token, userName = null) {
    try {
      const resetUrl = this.getResetUrl(userType, token);
      const emailTemplate = this.getPasswordResetTemplate(resetUrl, userName, userType);

      const result = await this.client
        .post('send', { version: 'v3.1' })
        .request({
          Messages: [
            {
              From: {
                Email: process.env.MAILJET_FROM_EMAIL,
                Name: process.env.MAILJET_FROM_NAME || 'Clinixium',
              },
              To: [
                {
                  Email: userEmail,
                },
              ],
              Subject: 'Reset Your Clinixium Password',
              HTMLPart: emailTemplate,
              TextPart: `Reset your password by clicking this link: ${resetUrl}\n\nThis link will expire in 30 minutes.\n\nIf you did not request this password reset, please ignore this email.`,
            },
          ],
        });

      return { success: true, messageId: result.body.Messages[0].MessageID };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  getResetUrl(userType, token) {
    const baseUrl = userType === 'A'
      ? process.env.ADMIN_FRONTEND_URL
      : process.env.DEV_FRONTEND_URL;

    return `${baseUrl}/reset_password/${token}`;
  }

  getPasswordResetTemplate(resetUrl, userName, userType) {
    const greeting = userName ? `Dear ${userName},` : 'Dear User,';
    const userTypeText = userType === 'A' ? 'Admin' : userType === 'P' ? 'Physician' : 'Developer';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
          }
          .content {
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #0056b3;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 10px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">Clinixium</div>
            <h2>Password Reset Request</h2>
          </div>
          
          <div class="content">
            <p>${greeting}</p>
            <p>We received a request to reset your password for your Clinixium ${userTypeText} account.</p>
            <p>Click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${resetUrl}</p>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong>
            <ul>
              <li>This link will expire in 30 minutes</li>
              <li>It can only be used once</li>
              <li>If you did not request this password reset, please ignore this email</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>If you have any questions or concerns, please contact our support team.</p>
            <p>&copy; ${new Date().getFullYear()} Clinixium. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export default new EmailService();
