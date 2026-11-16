-- Seed email templates (production-level design)
-- Only middle content - header/footer/styles are loaded from files

-- Developer Email Verification
INSERT INTO email_template (template_key, template_name, subject, html_content, text_content, status, version) VALUES
('developer_verify_email', 'Developer Email Verification', 'Verify Your Email Address',
'<div class="content">
  <p>{{greeting}}</p>
  <p>Thank you for registering with Clinixium. We are excited to have you as part of our developer community.</p>
  <p>To complete your registration and start building amazing healthcare applications, please verify your email address by clicking the button below:</p>

  <div style="text-align: center;">
    <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
  </div>

  <p style="margin-top: 24px;">If the button above does not work, you can also copy and paste the following link into your browser:</p>
  <p style="word-break: break-all; color: #007bff; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">{{verificationUrl}}</p>
</div>

<div class="info">
  <strong>ℹ️ Important Information:</strong>
  <ul>
    <li>This verification link will expire in 24 hours</li>
    <li>After verification, you can proceed to complete your onboarding process</li>
    <li>If you did not create a Clinixium developer account, please ignore this email</li>
  </ul>
</div>',
'Hello {{userName}},

Thank you for registering with Clinixium. We are excited to have you as part of our developer community.

To complete your registration, please verify your email by visiting:
{{verificationUrl}}

Important Information:
- This link will expire in 24 hours
- After verification, you can proceed to complete your onboarding
- If you did not create this account, please ignore this email',
1, 1);

-- Developer Password Reset
INSERT INTO email_template (template_key, template_name, subject, html_content, text_content, status, version) VALUES
('developer_reset_password', 'Developer Password Reset', 'Reset Your Clinixium Password',
'<div class="content">
  <p>{{greeting}}</p>
  <p>We received a request to reset the password for your Clinixium Developer account associated with the email: <strong>{{userEmail}}</strong></p>
  <p>If you made this request, please click the button below to set a new password:</p>

  <div style="text-align: center;">
    <a href="{{resetUrl}}" class="button">Reset Password</a>
  </div>

  <p style="margin-top: 24px;">If the button above does not work, you can also copy and paste the following link into your browser:</p>
  <p style="word-break: break-all; color: #007bff; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">{{resetUrl}}</p>
</div>

<div class="warning">
  <strong>⚠️ Security Notice:</strong>
  <ul>
    <li>This password reset link will expire in 30 minutes</li>
    <li>The link can only be used once</li>
    <li>If you did not request this password reset, please ignore this email and your password will remain unchanged</li>
    <li>For your security, never share your password with anyone</li>
  </ul>
</div>',
'Hello {{userName}},

We received a request to reset the password for your Clinixium Developer account.

If you made this request, please visit the following link to reset your password:
{{resetUrl}}

Security Notice:
- This link will expire in 30 minutes
- The link can only be used once
- If you did not request this reset, please ignore this email
- Never share your password with anyone',
1, 1);

-- Physician Password Reset
INSERT INTO email_template (template_key, template_name, subject, html_content, text_content, status, version) VALUES
('physician_reset_password', 'Physician Password Reset', 'Reset Your Clinixium Password',
'<div class="content">
  <p>{{greeting}}</p>
  <p>We received a request to reset the password for your Clinixium Physician account associated with the email: <strong>{{userEmail}}</strong></p>
  <p>If you made this request, please click the button below to set a new password:</p>

  <div style="text-align: center;">
    <a href="{{resetUrl}}" class="button">Reset Password</a>
  </div>

  <p style="margin-top: 24px;">If the button above does not work, you can also copy and paste the following link into your browser:</p>
  <p style="word-break: break-all; color: #007bff; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">{{resetUrl}}</p>
</div>

<div class="warning">
  <strong>⚠️ Security Notice:</strong>
  <ul>
    <li>This password reset link will expire in 30 minutes</li>
    <li>The link can only be used once</li>
    <li>If you did not request this password reset, please ignore this email and your password will remain unchanged</li>
    <li>For your security, never share your password with anyone</li>
  </ul>
</div>',
'Hello {{userName}},

We received a request to reset the password for your Clinixium Physician account.

If you made this request, please visit the following link to reset your password:
{{resetUrl}}

Security Notice:
- This link will expire in 30 minutes
- The link can only be used once
- If you did not request this reset, please ignore this email
- Never share your password with anyone',
1, 1);

-- Admin Password Reset
INSERT INTO email_template (template_key, template_name, subject, html_content, text_content, status, version) VALUES
('admin_reset_password', 'Admin Password Reset', 'Reset Your Clinixium Password',
'<div class="content">
  <p>{{greeting}}</p>
  <p>We received a request to reset the password for your Clinixium Admin account associated with the email: <strong>{{userEmail}}</strong></p>
  <p>If you made this request, please click the button below to set a new password:</p>

  <div style="text-align: center;">
    <a href="{{resetUrl}}" class="button">Reset Password</a>
  </div>

  <p style="margin-top: 24px;">If the button above does not work, you can also copy and paste the following link into your browser:</p>
  <p style="word-break: break-all; color: #007bff; background-color: #f8f9fa; padding: 12px; border-radius: 4px;">{{resetUrl}}</p>
</div>

<div class="warning">
  <strong>⚠️ Security Notice:</strong>
  <ul>
    <li>This password reset link will expire in 30 minutes</li>
    <li>The link can only be used once</li>
    <li>If you did not request this password reset, please ignore this email and your password will remain unchanged</li>
    <li>For your security, never share your password with anyone</li>
  </ul>
</div>',
'Hello {{userName}},

We received a request to reset the password for your Clinixium Admin account.

If you made this request, please visit the following link to reset your password:
{{resetUrl}}

Security Notice:
- This link will expire in 30 minutes
- The link can only be used once
- If you did not request this reset, please ignore this email
- Never share your password with anyone',
1, 1);
