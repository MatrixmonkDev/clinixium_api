import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mailjet from 'node-mailjet';
import EmailTemplate from './models/EmailTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.client = mailjet.apiConnect(
      process.env.MAILJET_API_KEY,
      process.env.MAILJET_API_SECRET
    );
    this.templateCache = new Map();

    // Cache shared templates (header, footer, styles)
    this.sharedTemplates = {
      header: null,
      footer: null,
      styles: null,
    };

    // Load shared templates on initialization
    this.loadSharedTemplates();
  }

  // Load shared templates (header, footer, styles) from files
  loadSharedTemplates() {
    try {
      const templatesDir = path.join(__dirname, 'email-templates', 'shared');

      this.sharedTemplates.header = fs.readFileSync(
        path.join(templatesDir, 'header.html'),
        'utf8'
      );

      this.sharedTemplates.footer = fs.readFileSync(
        path.join(templatesDir, 'footer.html'),
        'utf8'
      );

      this.sharedTemplates.styles = fs.readFileSync(
        path.join(templatesDir, 'styles.css'),
        'utf8'
      );
    } catch (error) {
      console.error('Error loading shared email templates:', error);
    }
  }

  // Compose full HTML from header + content + footer
  composeFullHtml(content, emailTitle) {
    // Replace {{emailTitle}} in header
    const headerWithTitle = this.sharedTemplates.header.replace(/{{emailTitle}}/g, emailTitle);

    // Replace {{year}} in footer
    const currentYear = new Date().getFullYear();
    const footerWithYear = this.sharedTemplates.footer.replace(/{{year}}/g, currentYear);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailTitle}</title>
        <style>${this.sharedTemplates.styles}</style>
      </head>
      <body>
        <div class="container">
          ${headerWithTitle}
          ${content}
          ${footerWithYear}
        </div>
      </body>
      </html>
    `;
  }

  // Load template from database with caching
  async getTemplate(templateKey) {
    // Check cache first
    if (this.templateCache.has(templateKey)) {
      return this.templateCache.get(templateKey);
    }

    // Load from database
    try {
      const template = await EmailTemplate.findByKey(templateKey);
      if (template) {
        this.templateCache.set(templateKey, template);
        return template;
      }
    } catch (error) {
      console.error('Error loading template from database:', error);
    }

    return null;
  }

  // Replace variables in template content
  renderTemplate(content, variables) {
    let rendered = content;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), value || '');
    }
    return rendered;
  }

  // Clear template cache (useful when templates are updated)
  clearTemplateCache(templateKey = null) {
    if (templateKey) {
      this.templateCache.delete(templateKey);
    } else {
      this.templateCache.clear();
      // Reload shared templates when full cache is cleared
      this.loadSharedTemplates();
    }
  }

  // Main method to send email using template
  async sendEmailWithTemplate(templateKey, toEmail, variables) {
    try {
      const template = await this.getTemplate(templateKey);

      if (!template) {
        console.error(`Template not found: ${templateKey}`);
        return { success: false, error: 'Template not found' };
      }

      // Add common variables
      const allVariables = {
        ...variables,
        greeting: variables.userName ? `Dear ${variables.userName},` : 'Dear User,',
      };

      // Render content template (middle part only)
      const renderedContent = this.renderTemplate(template.html_content, allVariables);

      // Compose full HTML with header and footer
      const fullHtml = this.composeFullHtml(renderedContent, template.subject);

      // Render text content
      const renderedText = template.text_content
        ? this.renderTemplate(template.text_content, allVariables)
        : null;

      // Send email
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
                  Email: toEmail,
                },
              ],
              Subject: template.subject,
              HTMLPart: fullHtml,
              TextPart: renderedText,
            },
          ],
        });

      return { success: true, messageId: result.body.Messages[0].MessageID };
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(userEmail, userType, token, userName = null) {
    try {
      const resetUrl = this.getResetUrl(userType, token);

      // Map user type code to template key
      const templateKeyMap = {
        'D': 'developer_reset_password',
        'P': 'physician_reset_password',
        'A': 'admin_reset_password',
      };
      const templateKey = templateKeyMap[userType] || `${userType.toLowerCase()}_reset_password`;

      // Use template system
      const templateResult = await this.sendEmailWithTemplate(
        templateKey,
        userEmail,
        { userName, userEmail, resetUrl }
      );

      return templateResult;
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendEmailVerificationEmail(userEmail, token, userName = null) {
    try {
      const verificationUrl = this.getEmailVerificationUrl(token);
      const templateKey = 'developer_verify_email';

      // Use template system
      const templateResult = await this.sendEmailWithTemplate(
        templateKey,
        userEmail,
        { userName, userEmail, verificationUrl }
      );

      return templateResult;
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

  getEmailVerificationUrl(token) {
    const baseUrl = process.env.DEV_FRONTEND_URL;
    return `${baseUrl}/email_verify?token=${token}`;
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

  getEmailVerificationTemplate(verificationUrl, userName) {
    const greeting = userName ? `Dear ${userName},` : 'Dear User,';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email Address</title>
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
          .info {
            background-color: #d1ecf1;
            border-left: 4px solid #17a2b8;
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
            <h2>Verify Your Email Address</h2>
          </div>

          <div class="content">
            <p>${greeting}</p>
            <p>Thank you for creating a Clinixium Developer account. To complete your registration, please verify your email address.</p>
            <p>Click the button below to verify your email:</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #007bff;">${verificationUrl}</p>
          </div>

          <div class="info">
            <strong>ℹ️ Information:</strong>
            <ul>
              <li>This link will expire in 24 hours</li>
              <li>After verification, you can proceed to complete your onboarding</li>
              <li>If you did not create a Clinixium developer account, please ignore this email</li>
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
