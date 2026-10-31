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
  phone_country_code: Joi.string().allow('', null),
  phone_number: Joi.string().allow('', null),
  professional_title: Joi.string().valid('MD', 'DO'),
  timezone: Joi.string(),
  language: Joi.string(),
  about_me: Joi.string().max(2000),
  primary_specialty: Joi.string().max(150),
  career_start_year: Joi.number().integer().min(1900).max(new Date().getFullYear()),
  practice_setting: Joi.string().valid('hospital', 'private_practice', 'academic', 'clinic', 'telemedicine', 'other'),
  practice_setting_other: Joi.string().max(150),
  hospital_affiliation: Joi.string().max(255),
  ai_annotation_experience: Joi.string().valid('none', 'some', 'moderate', 'expert'),
  npi_number: Joi.string().length(10),
  board_certified: Joi.boolean(),
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
  phone_country_code: Joi.string().allow('', null),
  phone_number: Joi.string().allow('', null),
  timezone: Joi.string().default('America/New_York'),
  language: Joi.string().default('en'),
});

// Onboarding Step 2: Professional Details
const onboardingStep2Schema = Joi.object({
  professional_title: Joi.string().valid('MD', 'DO').required(),
  primary_specialty: Joi.string().max(150).required(),
  career_start_year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required(),
  practice_setting: Joi.string().valid('hospital', 'private_practice', 'academic', 'clinic', 'telemedicine', 'other').required(),
  ai_annotation_experience: Joi.string().valid('none', 'some', 'moderate', 'expert').required(),
});

// Onboarding Step 3: Hospital Affiliation
const onboardingStep3Schema = Joi.object({
  hospital_affiliation: Joi.string().max(255).required(),
  practice_setting_other: Joi.string().max(150).allow(null, ''),
});

// Onboarding Step 4: NPI Verification
const onboardingStep4Schema = Joi.object({
  npi_number: Joi.string().length(10).required(),
  board_certified: Joi.boolean().required(),
});

// Onboarding Step 5: Identity Verification
const onboardingStep5Schema = Joi.object({
  identity_status: Joi.string().valid('not_started', 'pending', 'verified', 'failed').required(),
  identity_provider: Joi.string().max(30).default('stripe_identity'),
  identity_session_id: Joi.string().max(255).allow(null, ''),
});

// Onboarding Step 6: Compliance
const onboardingStep6Schema = Joi.object({
  conflict_of_interest: Joi.boolean().required(),
  conflict_of_interest_details: Joi.string().max(500).allow(null, ''),
});

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
