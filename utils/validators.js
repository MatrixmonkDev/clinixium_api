import Joi from 'joi';

const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      'any.required': 'Password is required',
    }),
  first_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name must not exceed 100 characters',
    'any.required': 'First name is required',
  }),
  last_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name must not exceed 100 characters',
    'any.required': 'Last name is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const staffRegisterSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      'any.required': 'Password is required',
    }),
  user_name: Joi.string().min(2).max(100).required().messages({
    'any.required': 'User name is required',
  }),
  user_mname: Joi.string().max(100).allow('', null),
  user_lname: Joi.string().max(100).allow('', null),
});

const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(2).max(100),
  last_name: Joi.string().min(2).max(100),
  phone_number: Joi.string().allow('', null),
  country_code_id: Joi.number().integer().allow(null),
  timezone_id: Joi.number().integer().allow(null),
  professional_title: Joi.string().valid('MD', 'DO'),
  language: Joi.string(),
  about_me: Joi.string().max(2000),
  career_start_year: Joi.number().integer().min(1900).max(new Date().getFullYear()),
  practice_setting: Joi.string().valid('hospital', 'private_practice', 'academic', 'clinic', 'telemedicine', 'other'),
  practice_setting_other: Joi.string().max(150),
  hospital_affiliation: Joi.string().max(255),
  ai_annotation_experience: Joi.string().valid('none', 'some', 'moderate', 'expert'),
  npi_number: Joi.string().length(10),
  board_certified: Joi.boolean(),
  profile_photo_upload_id: Joi.number().integer().allow(null),
});

const staffUpdateProfileSchema = Joi.object({
  user_name: Joi.string().min(2).max(100),
  user_mname: Joi.string().max(100).allow('', null),
  user_lname: Joi.string().max(100).allow('', null),
  thumbnail_upload_id: Joi.number().integer().allow(null),
});

const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  new_password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .invalid(Joi.ref('current_password'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
      'any.invalid': 'New password must be different from current password',
      'any.required': 'New password is required',
    }),
});

// Simple change password schema for admin/developer (less strict)
const simpleChangePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  new_password: Joi.string()
    .min(6)
    .invalid(Joi.ref('current_password'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters',
      'any.invalid': 'New password must be different from current password',
      'any.required': 'New password is required',
    }),
});

const twoFactorSetupSchema = Joi.object({
  secret: Joi.string().required().messages({
    'any.required': 'Secret is required',
  }),
  two_factor_code: Joi.string().length(6).required().messages({
    'string.length': '2FA code must be 6 digits',
    'any.required': '2FA code is required',
  }),
});

const twoFactorVerifySchema = Joi.object({
  two_factor_code: Joi.string().length(6).required().messages({
    'string.length': '2FA code must be 6 digits',
    'any.required': '2FA code is required',
  }),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

// Onboarding Step 1: Contact Info
const onboardingStep1Schema = Joi.object({
  // Step 1 is only for Two-Factor Authentication setup
  // No phone, timezone, or language fields
});

// Onboarding Step 2: Professional Details
const onboardingStep2Schema = Joi.object({
  first_name: Joi.string().min(2).max(100).required(),
  last_name: Joi.string().min(2).max(100).required(),
  phone_number: Joi.string().allow('', null),
  country_code_id: Joi.number().integer().allow(null),
  timezone_id: Joi.number().integer().allow(null),
  professional_title: Joi.string().valid('MD', 'DO').required(),
  career_start_year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required(),
  primary_department_id: Joi.number().integer().allow(null),
  category_ids: Joi.array().items(Joi.number().integer()).allow(null),
  sub_sub_category_ids: Joi.array().items(Joi.number().integer()).allow(null),
  practice_setting_ids: Joi.array().items(Joi.number().integer()).allow(null),
  imaging_modalities: Joi.array().items(
    Joi.object({
      imaging_modality_id: Joi.number().integer().allow(null),
      other_modality: Joi.string().allow('', null),
    }).or('imaging_modality_id', 'other_modality')
  ).allow(null),
  ai_annotation_experience_id: Joi.number().integer().allow(null),
  profile_photo_upload_id: Joi.number().integer().allow(null),
});

// Onboarding Step 3: Medical Credentials Verification
const onboardingStep3Schema = Joi.object({
  npi_number: Joi.string().length(10).required(),
  medical_licenses: Joi.array().items(
    Joi.object({
      license_number: Joi.string().required().min(5).max(100),
      state: Joi.string().required().min(2).max(100),
      expiry_date: Joi.date().iso().required(),
    })
  ).min(1).required(),
  medical_license_upload_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  board_certification_upload_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
});

// Onboarding Step 4: Identity Verification
const onboardingStep4Schema = Joi.object({
  identity_document_upload_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  selfie_upload_id: Joi.number().integer().required(),
});

// Onboarding Step 5: Compliance
const onboardingStep5Schema = Joi.object({
  agreed_document_ids: Joi.array().items(
    Joi.number().integer().valid(8, 9, 10, 11)
  ).min(4).required().messages({
    'array.min': 'You must agree to all compliance documents',
    'any.only': 'Invalid document type ID'
  }),
  conflict_of_interest: Joi.boolean().required(),
  conflict_of_interest_details: Joi.string().max(500).allow(null, '').when('conflict_of_interest', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.allow(null, '')
  }),
  signature_upload_id: Joi.number().integer().required(),
});

// Onboarding Step 6: Final Completion
const onboardingStep6Schema = Joi.object({});

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    req.body = value;
    next();
  };
};

export {
  registerSchema,
  loginSchema,
  staffRegisterSchema,
  updateProfileSchema,
  staffUpdateProfileSchema,
  changePasswordSchema,
  simpleChangePasswordSchema,
  twoFactorSetupSchema,
  twoFactorVerifySchema,
  refreshTokenSchema,
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
  onboardingStep6Schema,
  validate,
};
