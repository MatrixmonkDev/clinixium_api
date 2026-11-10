# Clinixium API Documentation

## Overview
This documentation covers all APIs for the Clinixium platform, including admin management, physician onboarding, and shared services.

## Physician Registration Status
When a physician registers, their account status is set to **0 (Pending)**. They must complete all 6 onboarding steps before their account can be reviewed by an admin. After onboarding completion, an admin must approve the account (change status to **1**) before the physician can access full platform features.

**Status Values:**
- **0** - Pending (registration completed, awaiting onboarding and approval)
- **1** - Approved (account active, full access)
- **2** - Rejected (account denied)

---

# Physician Onboarding APIs

## Overview
Physician onboarding is a multi-step process that collects essential information for medical professionals.

---

## Step 1: Two-Factor Authentication Setup

### Complete Step 1
```
POST /api/physicians/auth/onboarding/step1
```
**Auth:** Bearer Token (Physician)
**Description:** Completes Step 1 after 2FA is enabled.

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Step 1 completed",
  "data": {
    "id": 1,
    "email": "physician@example.com",
    "onboarding_step": 2,
    "two_factor_enabled": 1
  }
}
```

**Error Response (2FA not enabled):**
```json
{
  "success": false,
  "message": "Two-factor authentication must be enabled before completing Step 1"
}
```

---

## Step 2: Clinical Profile

### Complete Step 2
```
POST /api/physicians/auth/onboarding/step2
```
**Auth:** Bearer Token (Physician)
**Description:** Submits clinical profile information including personal details, professional title, department, categories, practice settings, imaging modalities, and AI experience.

**Request Body:**
```json
{
  "first_name": "Emily",
  "last_name": "Carter",
  "phone_number": "4155550187",
  "country_code_id": 1,
  "timezone_id": 1,
  "professional_title": "MD",
  "career_start_year": 2016,
  "primary_department_id": 1,
  "category_ids": [1, 2, 3],
  "sub_sub_category_ids": [4, 5, 6],
  "practice_setting_ids": [1],
  "imaging_modalities": [
    { "imaging_modality_id": 1 },
    { "imaging_modality_id": 2 },
    { "other_modality": "PET Scan" }
  ],
  "ai_annotation_experience_id": 1,
  "profile_photo_upload_id": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Step 2 completed",
  "data": {
    "id": 1,
    "first_name": "Emily",
    "last_name": "Carter",
    "onboarding_step": 3
  }
}
```

---

## Step 3: Medical Credentials Verification

### Complete Step 3
```
POST /api/physicians/auth/onboarding/step3
```
**Auth:** Bearer Token (Physician)
**Description:** Submits NPI number, board certification status, multiple state medical licenses, and document uploads.

**Request Body:**
```json
{
  "npi_number": "1234567890",
  "medical_licenses": [
    {
      "license_number": "MD12345",
      "state": "California",
      "expiry_date": "2025-12-31"
    },
    {
      "license_number": "MD67890",
      "state": "New York",
      "expiry_date": "2026-06-30"
    }
  ],
  "medical_license_upload_ids": [10, 11, 12],
  "board_certification_upload_ids": [13, 14]
}
```

**Field Descriptions:**
- `npi_number`: 10-digit NPI number (verification not implemented yet)
- `medical_licenses`: Array of medical license objects with license number, state, and expiry date
- `medical_license_upload_ids`: Array of upload IDs from user_uploads table (doc_type_id = 3)
- `board_certification_upload_ids`: Array of upload IDs from user_uploads table (doc_type_id = 5)

**Response:**
```json
{
  "success": true,
  "message": "Step 3 completed",
  "data": {
    "id": 1,
    "npi_number": "1234567890",
    "onboarding_step": 4
  }
}
```

**Error Response (Invalid upload ID):**
```json
{
  "success": false,
  "message": "Invalid medical license upload ID or access denied"
}
```

---

## Step 4: Identity Verification

### Complete Step 4
```
POST /api/physicians/auth/onboarding/step4
```
**Auth:** Bearer Token (Physician)
**Description:** Submits identity verification documents (government ID and selfie). Status is set to 'pending' for admin review.

**Prerequisites:**
1. Upload government ID document(s) via `POST /api/uploads` with `doc_type_id = 1`
2. Upload selfie photo via `POST /api/uploads` with `doc_type_id = 2`

**Request Body:**
```json
{
  "identity_document_upload_ids": [20, 21],
  "selfie_upload_id": 22
}
```

**Field Descriptions:**
- `identity_document_upload_ids`: Array of upload IDs for government ID documents (doc_type_id = 1)
- `selfie_upload_id`: Upload ID for selfie photo (doc_type_id = 2)

**Response:**
```json
{
  "success": true,
  "message": "Step 4 completed - Identity verification pending review",
  "data": {
    "id": 1,
    "identity_status": "pending",
    "identity_provider": "manual",
    "onboarding_step": 5
  }
}
```

**Error Response (Invalid upload ID):**
```json
{
  "success": false,
  "message": "Invalid identity document upload ID or access denied"
}
```

---

## Step 5: Compliance

### Complete Step 5
```
POST /api/physicians/auth/onboarding/step5
```
**Auth:** Bearer Token (Physician)
**Description:** Completes the compliance step by agreeing to all required documents, disclosing conflict of interest, and providing electronic signature.

**Prerequisites:**
1. Upload electronic signature image via `POST /api/uploads` with `doc_type_id = 7`

**Request Body:**
```json
{
  "agreed_document_ids": [8, 9, 10, 11],
  "conflict_of_interest": false,
  "conflict_of_interest_details": null,
  "signature_upload_id": 30
}
```

**Field Descriptions:**
- `agreed_document_ids`: Array of document type IDs for agreed documents (must include all: 8=BAA, 9=NDA, 10=HIPAA, 11=Terms of Service)
- `conflict_of_interest`: Boolean indicating if there's a conflict of interest
- `conflict_of_interest_details`: Required if `conflict_of_interest` is true, optional otherwise
- `signature_upload_id`: Upload ID for electronic signature image (doc_type_id = 7)

**Request Body (with conflict of interest):**
```json
{
  "agreed_document_ids": [8, 9, 10, 11],
  "conflict_of_interest": true,
  "conflict_of_interest_details": "I have a financial interest in a medical device company",
  "signature_upload_id": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Step 5 completed - Compliance documents agreed",
  "data": {
    "id": 1,
    "conflict_of_interest": 0,
    "conflict_of_interest_details": null,
    "compliance_completed_at": "2026-11-05 10:00:00",
    "onboarding_step": 6
  }
}
```

**Error Response (Missing documents):**
```json
{
  "success": false,
  "message": "You must agree to all compliance documents"
}
```

**Error Response (Invalid signature):**
```json
{
  "success": false,
  "message": "Invalid signature upload ID or access denied"
}
```

---

## Step 6: Final Completion

### Complete Step 6
```
POST /api/physicians/auth/onboarding/step6
```
**Auth:** Bearer Token (Physician)
**Description:** Final step to complete the onboarding process. Marked as complete when all previous steps are done.

**Request Body:** None

**Response:**
```json
{
  "success": true,
  "message": "Onboarding completed",
  "data": {
    "id": 1,
    "onboarding_step": 7,
    "onboarding_completed_at": "2026-11-05 10:00:00"
  }
}
```

---

## Onboarding Progress

### Get Onboarding Progress
```
GET /api/physicians/auth/onboarding/progress
```
**Auth:** Bearer Token (Physician)
**Description:** Returns the current onboarding progress with enhanced data validation checks for each step.

**Step Completion Logic:**
- **Step 1:** Two-factor enabled and secret exists
- **Step 2:** First name, last name, and professional title exist
- **Step 3:** NPI number exists and at least one medical license
- **Step 4:** Identity status is 'pending' or 'verified'
- **Step 5:** Compliance completed and conflict of interest is set
- **Step 6:** Onboarding step >= 7 and completion timestamp exists

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStep": 3,
    "isCompleted": false,
    "completedSteps": 2,
    "totalSteps": 6,
    "progressPercentage": 33,
    "onboardingCompletedAt": null,
    "steps": {
      "step1": {
        "title": "Two-Factor Authentication",
        "completed": true
      },
      "step2": {
        "title": "Clinical Profile",
        "completed": true
      },
      "step3": {
        "title": "Medical Credentials Verification",
        "completed": false
      },
      "step4": {
        "title": "Identity Verification",
        "completed": false
      },
      "step5": {
        "title": "Compliance",
        "completed": false
      },
      "step6": {
        "title": "Final Completion",
        "completed": false
      }
    }
  }
}
```

---

## Get All Onboarding Data

### Get Onboarding Data
```
GET /api/physicians/auth/onboarding/data
```
**Auth:** Bearer Token (Physician)
**Description:** Returns comprehensive data from all onboarding steps in a single response, including documents with full URLs.

**Response:**
```json
{
  "success": true,
  "data": {
    "step1": {
      "two_factor_enabled": 1,
      "two_factor_method": "app",
      "two_factor_confirmed_at": "2026-11-05 10:00:00"
    },
    "step2": {
      "first_name": "Emily",
      "last_name": "Carter",
      "phone_number": "4155550187",
      "country_code_id": 1,
      "country_code": "+1",
      "country_name": "United States",
      "timezone_id": 1,
      "timezone_name": "America/New_York",
      "timezone_offset": "-05:00",
      "professional_title": "MD",
      "career_start_year": 2016,
      "profile_photo_path": "/uploads/...",
      "profile_photo": "http://localhost:3000/uploads/...",
      "departments": [
        {
          "id": 1,
          "is_primary": 1,
          "department_id": 1,
          "department_name": "Cardiology"
        }
      ],
      "categories": [
        {
          "id": 1,
          "category_id": 1,
          "category_name": "Interventional Cardiology",
          "parent_id": null
        }
      ],
      "practice_settings": [
        {
          "id": 1,
          "practice_setting_id": 1,
          "practice_setting_name": "Hospital",
          "other_value": null
        }
      ],
      "imaging_modalities": [
        {
          "id": 1,
          "imaging_modality_id": 1,
          "other_modality": null,
          "modality_name": "MRI"
        }
      ],
      "ai_experience": {
        "id": 1,
        "ai_experience_id": 1,
        "ai_experience_name": "Expert"
      }
    },
    "step3": {
      "npi_number": "1234567890",
      "medical_licenses": [
        {
          "id": 1,
          "physician_id": 1,
          "license_number": "MD12345",
          "state": "California",
          "expiry_date": "2025-12-31",
          "status": 1,
          "created_at": "2026-11-05 10:00:00"
        }
      ],
      "medical_license_documents": [
        {
          "id": 10,
          "url": "http://localhost:3000/uploads/license.pdf",
          "file_name": "license.pdf",
          "file_size": 2048000,
          "mime_type": "application/pdf",
          "created_at": "2026-11-05 10:00:00"
        }
      ],
      "board_certification_documents": [
        {
          "id": 13,
          "url": "http://localhost:3000/uploads/board-cert.pdf",
          "file_name": "board-cert.pdf",
          "file_size": 1024000,
          "mime_type": "application/pdf",
          "created_at": "2026-11-05 10:00:00"
        }
      ]
    },
    "step4": {
      "identity_status": "pending",
      "identity_provider": "manual",
      "identity_session_id": null,
      "identity_verified_at": null,
      "identity_documents": [
        {
          "id": 20,
          "url": "http://localhost:3000/uploads/id-front.jpg",
          "file_name": "id-front.jpg",
          "file_size": 512000,
          "mime_type": "image/jpeg",
          "created_at": "2026-11-05 10:00:00"
        }
      ],
      "selfie_document": {
        "id": 22,
        "url": "http://localhost:3000/uploads/selfie.jpg",
        "file_name": "selfie.jpg",
        "file_size": 384000,
        "mime_type": "image/jpeg",
        "created_at": "2026-11-05 10:00:00"
      }
    },
    "step5": {
      "compliance_completed_at": "2026-11-05 10:00:00",
      "conflict_of_interest": 0,
      "conflict_of_interest_details": null,
      "compliance_documents": [
        {
          "id": 1,
          "physician_id": 1,
          "doc_type_id": 8,
          "agreed_at": "2026-11-05 10:00:00",
          "signature_upload_id": 30,
          "document_name": "BAA Document",
          "document_description": "Business Associate Agreement",
          "signature_url": "http://localhost:3000/uploads/signature.png"
        }
      ]
    },
    "step6": {
      "onboarding_completed_at": null
    }
  }
}
```

---

# File Upload APIs

## Overview
Upload APIs allow physicians, admins, and developers to upload files with document type categorization.

---

## Upload File

### Upload File
```
POST /api/uploads
```
**Auth:** Bearer Token (Physician, Admin, or Developer)
**Content-Type:** multipart/form-data
**Description:** Uploads a file and stores it with document type metadata.

**Request Body (multipart/form-data):**
- `file`: Binary file (JPG, PNG, PDF, Word documents up to 5MB)
- `doc_type_id`: Integer ID from doc_types table
- `description`: Optional text description

**Response:**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "id": 1,
    "url": "http://localhost:3000/uploads/1793787196949-367911582.jpg",
    "file_name": "profile-photo.jpg",
    "file_size": 1024000,
    "mime_type": "image/jpeg"
  }
}
```

**Error Response (Invalid file type):**
```json
{
  "success": false,
  "message": "Invalid file type. Only JPG, PNG, PDF, and Word documents are allowed."
}
```

**Error Response (File too large):**
```json
{
  "success": false,
  "message": "File size exceeds 5MB limit"
}
```

---

## Get All Uploads

### Get User Uploads
```
GET /api/uploads
```
**Auth:** Bearer Token (Physician, Admin, or Developer)
**Description:** Returns all files uploaded by the authenticated user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "user_type": "P",
      "doc_type_id": 3,
      "url": "http://localhost:3000/uploads/1793787196949-367911582.jpg",
      "file_name": "license.pdf",
      "file_size": 2048000,
      "mime_type": "application/pdf",
      "storage_provider": "local",
      "description": "Medical License",
      "is_verified": 0,
      "status": 1,
      "created_at": "2026-11-05 10:00:00"
    }
  ]
}
```

---

## Get Upload by ID

### Get Upload Details
```
GET /api/uploads/:id
```
**Auth:** Bearer Token (Physician, Admin, or Developer)
**Description:** Returns details of a specific upload. Only accessible by the file owner.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "user_id": 1,
    "user_type": "P",
    "doc_type_id": 3,
    "url": "http://localhost:3000/uploads/1793787196949-367911582.jpg",
    "file_name": "license.pdf",
    "file_size": 2048000,
    "mime_type": "application/pdf",
    "storage_provider": "local",
    "description": "Medical License",
    "is_verified": 0,
    "status": 1,
    "created_at": "2026-11-05 10:00:00"
  }
}
```

**Error Response (Access denied):**
```json
{
  "success": false,
  "message": "Access denied"
}
```

---

## Delete Upload

### Delete File
```
DELETE /api/uploads/:id
```
**Auth:** Bearer Token (Physician, Admin, or Developer)
**Description:** Deletes a file upload. Only accessible by the file owner. Removes both database record and physical file.

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Error Response (Access denied):**
```json
{
  "success": false,
  "message": "Access denied"
}
```

---

# Admin Onboarding APIs Documentation

## Overview
These APIs allow admins to manage the onboarding options for physicians, including medical departments, categories, practice settings, imaging modalities, and AI annotation experiences. Also includes physician approval workflow.

---

## Physician Approval Workflow

### Status Values
- **0** - Pending (registration completed, awaiting admin approval)
- **1** - Approved (account active, full access)
- **2** - Rejected (account denied)

### Get Physicians List
```
GET /api/admin/physicians
```
**Auth:** Bearer Token (Admin)
**Description:** Get list of physicians with optional status filter.

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page
- `search` (optional) - Search by first_name, last_name, or email
- `status` (optional) - Filter by status: 0 (pending), 1 (approved), 2 (rejected)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "physician@example.com",
      "first_name": "Emily",
      "last_name": "Carter",
      "phone_number": "4155550187",
      "country_code_id": 1,
      "professional_title": "MD",
      "profile_photo_path": "/uploads/profile.jpg",
      "status": 0,
      "onboarding_step": 1,
      "onboarding_completed_at": null,
      "created_on": "2026-11-04 10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

**Examples:**
- Get all physicians: `GET /api/admin/physicians`
- Get pending physicians: `GET /api/admin/physicians?status=0`
- Get approved physicians: `GET /api/admin/physicians?status=1`
- Get rejected physicians: `GET /api/admin/physicians?status=2`
- Search physicians: `GET /api/admin/physicians?search=Emily`

---

### Get Physician Details
```
GET /api/admin/physicians/:physicianId
```
**Auth:** Bearer Token (Admin)
**Description:** Get physician details with optional onboarding data and login history.

**Query Parameters:**
- `include` (optional) - What data to include:
  - `onboarding` - Include onboarding data (all 6 steps)
  - `login_history` - Include login history
  - `all` - Include both onboarding data and login history
  - Omit parameter to include both by default

**Response (include=all):**
```json
{
  "success": true,
  "data": {
    "physician": {
      "id": 1,
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "email": "physician@example.com",
      "first_name": "Emily",
      "last_name": "Carter",
      "phone_number": "4155550187",
      "country_code_id": 1,
      "professional_title": "MD",
      "profile_photo_path": "/uploads/profile.jpg",
      "status": 0,
      "onboarding_step": 6,
      "onboarding_completed_at": "2026-11-04 10:00:00",
      "created_on": "2026-11-04 10:00:00"
    },
    "onboarding": {
      "step1": {
        "two_factor_enabled": 1,
        "two_factor_method": "authenticator",
        "two_factor_confirmed_at": "2026-11-04 10:30:00"
      },
      "step2": {
        "first_name": "Emily",
        "last_name": "Carter",
        "phone_number": "4155550187",
        "country_code_id": 1,
        "country_code": "+1",
        "country_name": "United States",
        "timezone_id": 1,
        "timezone_name": "Asia/Kolkata",
        "timezone_offset": "+05:30",
        "professional_title": "MD",
        "career_start_year": 2016,
        "profile_photo_path": "/uploads/profile.jpg",
        "profile_photo": "http://localhost:3000/uploads/profile.jpg",
        "departments": [
          {
            "id": 1,
            "is_primary": 1,
            "department_id": 1,
            "department_name": "Cardiology"
          }
        ],
        "categories": [
          {
            "id": 1,
            "category_id": 1,
            "category_name": "Interventional Cardiology",
            "parent_id": null
          }
        ],
        "practice_settings": [
          {
            "id": 1,
            "practice_setting_id": 1,
            "practice_setting_name": "Hospital",
            "other_value": null
          }
        ],
        "imaging_modalities": [
          {
            "id": 1,
            "imaging_modality_id": 1,
            "other_modality": null,
            "modality_name": "CT Scan"
          }
        ],
        "ai_experience": {
          "id": 1,
          "ai_experience_id": 1,
          "ai_experience_name": "Beginner"
        }
      },
      "step3": {
        "npi_number": "1234567890",
        "medical_licenses": [
          {
            "id": 1,
            "license_number": "MD12345",
            "state": "California",
            "expiry_date": "2026-12-31"
          }
        ],
        "medical_license_documents": [
          {
            "id": 1,
            "url": "http://localhost:3000/uploads/license.pdf",
            "file_name": "license.pdf",
            "file_size": 102400,
            "mime_type": "application/pdf",
            "created_at": "2026-11-04 10:00:00"
          }
        ],
        "board_certification_documents": [
          {
            "id": 2,
            "url": "http://localhost:3000/uploads/cert.pdf",
            "file_name": "cert.pdf",
            "file_size": 204800,
            "mime_type": "application/pdf",
            "created_at": "2026-11-04 10:00:00"
          }
        ]
      },
      "step4": {
        "identity_status": "pending",
        "identity_provider": "manual",
        "identity_session_id": null,
        "identity_verified_at": null,
        "identity_documents": [
          {
            "id": 3,
            "url": "http://localhost:3000/uploads/id.pdf",
            "file_name": "id.pdf",
            "file_size": 512000,
            "mime_type": "application/pdf",
            "created_at": "2026-11-04 10:00:00"
          }
        ],
        "selfie_document": {
          "id": 4,
          "url": "http://localhost:3000/uploads/selfie.jpg",
          "file_name": "selfie.jpg",
          "file_size": 256000,
          "mime_type": "image/jpeg",
          "created_at": "2026-11-04 10:00:00"
        }
      },
      "step5": {
        "compliance_completed_at": "2026-11-04 10:00:00",
        "conflict_of_interest": false,
        "conflict_of_interest_details": null,
        "compliance_documents": [
          {
            "id": 1,
            "physician_id": 1,
            "doc_type_id": 8,
            "agreed": 1,
            "agreed_at": "2026-11-04 10:00:00",
            "signature_upload_id": 5,
            "document_name": "Terms of Service",
            "document_description": "Clinixium Terms of Service",
            "signature_url": "http://localhost:3000/uploads/signature.jpg"
          }
        ]
      },
      "step6": {
        "onboarding_completed_at": "2026-11-04 10:00:00"
      }
    },
    "login_history": [
      {
        "id": 1,
        "user_type": "P",
        "user_id": 1,
        "ip_address": "192.168.1.1",
        "browser": "Chrome",
        "status": "success",
        "attempt_count": 1,
        "created_at": "2026-11-04 10:00:00"
      }
    ]
  }
}
```

**Examples:**
- Get basic physician info: `GET /api/admin/physicians/1`
- Get physician with onboarding data: `GET /api/admin/physicians/1?include=onboarding`
- Get physician with login history: `GET /api/admin/physicians/1?include=login_history`
- Get physician with all data: `GET /api/admin/physicians/1?include=all`

---

### Approve/Reject Physician
```
PUT /api/admin/physicians/:physicianId/approve
```
**Auth:** Bearer Token (Admin)
**Description:** Approve or reject a physician account.

**Request Body:**
```json
{
  "status": "1",
  "rejection_reason": null
}
```

**Body Parameters:**
- `status` (required) - "1" for approve, "2" for reject
- `rejection_reason` (optional) - Required when status = "2"

**Response (Approve):**
```json
{
  "success": true,
  "message": "Physician approved successfully",
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "physician@example.com",
    "first_name": "Emily",
    "last_name": "Carter",
    "status": 1,
    "approved_at": "2026-11-04 10:00:00",
    "reviewed_by": 1
  }
}
```

**Response (Reject):**
```json
{
  "success": true,
  "message": "Physician rejected successfully",
  "data": {
    "id": 1,
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "email": "physician@example.com",
    "first_name": "Emily",
    "last_name": "Carter",
    "status": 2,
    "rejection_reason": "Incomplete documentation",
    "rejected_at": "2026-11-04 10:00:00"
  }
}
```

---

## 1. Medical Departments (Primary Speciality)

### Get All Medical Departments
```
GET /api/admin/medical-departments
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Cardiology",
      "description": "Heart and cardiovascular system",
      "is_active": 1,
      "created_at": "2026-11-04 10:00:00",
      "updated_at": "2026-11-04 10:00:00"
    }
  ]
}
```

### Get Medical Department by ID
```
GET /api/admin/medical-departments/:id
```

### Create Medical Department
```
POST /api/admin/medical-departments
Body: {
  "name": "Cardiology",
  "description": "Heart and cardiovascular system"
}
```

### Update Medical Department
```
PUT /api/admin/medical-departments/:id
Body: {
  "name": "Cardiology",
  "description": "Heart and cardiovascular system",
  "is_active": true
}
```

### Delete Medical Department
```
DELETE /api/admin/medical-departments/:id
```

---

## 2. Medical Categories (Sub-speciality & Sub-sub-speciality)

### Get All Medical Categories
```
GET /api/admin/medical-categories
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Interventional Cardiology",
      "parent_id": null,
      "medical_department_id": 1,
      "description": "Catheter-based treatment",
      "is_active": 1,
      "department_name": "Cardiology",
      "parent_name": null
    }
  ]
}
```

### Get Categories by Department
```
GET /api/admin/medical-categories/department/:departmentId
```
**Description:** Get all sub-specialities for a specific department (parent_id = null)

### Get All Sub-Specialties
```
GET /api/admin/medical-categories/sub-specialties
```
**Description:** Get all sub-specialities across all departments (parent_id = null)
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Interventional Cardiology",
      "parent_id": null,
      "medical_department_id": 1,
      "description": "Catheter-based treatment",
      "is_active": 1,
      "status": 1,
      "department_name": "Cardiology",
      "parent_name": null
    }
  ]
}
```

### Get Child Categories
```
GET /api/admin/medical-categories/:parentId/children
```
**Description:** Get all sub-sub-specialities for a specific sub-speciality

### Get Category by ID
```
GET /api/admin/medical-categories/:id
```

### Create Medical Category
```
POST /api/admin/medical-categories
Body: {
  "name": "Interventional Cardiology",
  "parent_id": null,  // null for sub-speciality, category ID for sub-sub-speciality
  "medical_department_id": 1,
  "description": "Catheter-based treatment"
}
```

### Update Medical Category
```
PUT /api/admin/medical-categories/:id
Body: {
  "name": "Interventional Cardiology",
  "parent_id": null,
  "medical_department_id": 1,
  "description": "Catheter-based treatment",
  "is_active": true
}
```

### Delete Medical Category
```
DELETE /api/admin/medical-categories/:id
```

---

## 3. Practice Settings

### Get All Practice Settings
```
GET /api/admin/practice-settings
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Private Practice",
      "description": "Independent physician practice",
      "is_active": 1,
      "created_at": "2026-11-04 10:00:00",
      "updated_at": "2026-11-04 10:00:00"
    }
  ]
}
```

### Get Practice Setting by ID
```
GET /api/admin/practice-settings/:id
```

### Create Practice Setting
```
POST /api/admin/practice-settings
Body: {
  "name": "Private Practice",
  "description": "Independent physician practice"
}
```

### Update Practice Setting
```
PUT /api/admin/practice-settings/:id
Body: {
  "name": "Private Practice",
  "description": "Independent physician practice",
  "is_active": true
}
```

### Delete Practice Setting
```
DELETE /api/admin/practice-settings/:id
```

---

## 4. Imaging Modalities

### Get All Imaging Modalities
```
GET /api/admin/imaging-modalities
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "MRI",
      "description": "Magnetic Resonance Imaging",
      "is_active": 1,
      "created_at": "2026-11-04 10:00:00",
      "updated_at": "2026-11-04 10:00:00"
    }
  ]
}
```

### Get Imaging Modality by ID
```
GET /api/admin/imaging-modalities/:id
```

### Create Imaging Modality
```
POST /api/admin/imaging-modalities
Body: {
  "name": "MRI",
  "description": "Magnetic Resonance Imaging"
}
```

### Update Imaging Modality
```
PUT /api/admin/imaging-modalities/:id
Body: {
  "name": "MRI",
  "description": "Magnetic Resonance Imaging",
  "is_active": true
}
```

### Delete Imaging Modality
```
DELETE /api/admin/imaging-modalities/:id
```

---

## 5. AI Annotation Experiences

### Get All AI Annotation Experiences
```
GET /api/admin/ai-annotation-experiences
```
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "0-6 months",
      "description": "Less than 6 months of experience",
      "is_active": 1,
      "created_at": "2026-11-04 10:00:00",
      "updated_at": "2026-11-04 10:00:00"
    }
  ]
}
```

### Get AI Annotation Experience by ID
```
GET /api/admin/ai-annotation-experiences/:id
```

### Create AI Annotation Experience
```
POST /api/admin/ai-annotation-experiences
Body: {
  "name": "0-6 months",
  "description": "Less than 6 months of experience"
}
```

### Update AI Annotation Experience
```
PUT /api/admin/ai-annotation-experiences/:id
Body: {
  "name": "0-6 months",
  "description": "Less than 6 months of experience",
  "is_active": true
}
```

### Delete AI Annotation Experience
```
DELETE /api/admin/ai-annotation-experiences/:id
```

---

## Authentication
All endpoints require admin authentication with a valid JWT token.

**Header:**
```
Authorization: Bearer <access_token>
```

---

## Validation Rules

### Medical Department
- `name`: Required, 2-255 characters
- `description`: Optional, text

### Medical Category
- `name`: Required, 2-255 characters
- `parent_id`: Optional, integer (null for sub-speciality)
- `medical_department_id`: Required, integer
- `description`: Optional, text

### Practice Setting
- `name`: Required, 2-255 characters
- `description`: Optional, text

### Imaging Modality
- `name`: Required, 2-255 characters
- `description`: Optional, text

### AI Annotation Experience
- `name`: Required, 2-255 characters
- `description`: Optional, text

---

## Hierarchy Structure

**Medical Department (Primary Speciality)**
```
Cardiology
  ├─ Interventional Cardiology (Sub-speciality, parent_id = null)
  │   ├─ Cardiac Catheterization (Sub-sub-speciality, parent_id = Interventional Cardiology ID)
  │   └─ Angioplasty (Sub-sub-speciality, parent_id = Interventional Cardiology ID)
  └─ Electrophysiology (Sub-speciality, parent_id = null)
      ├─ Ablation (Sub-sub-speciality, parent_id = Electrophysiology ID)
      └─ Pacemaker Implantation (Sub-sub-speciality, parent_id = Electrophysiology ID)
```

---

## Public Options Endpoints

These endpoints are publicly accessible (no authentication required) and are used by the frontend to populate dropdowns.

### Get All Sub-Specialties
```
GET /api/options/categories/sub-specialties
```
**Description:** Get all sub-specialities across all departments (parent_id = null)
**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Interventional Cardiology",
      "parent_id": null,
      "medical_department_id": 1,
      "description": "Catheter-based treatment",
      "is_active": 1,
      "status": 1,
      "department_name": "Cardiology",
      "parent_name": null
    }
  ]
}
```

### Get Categories by Department
```
GET /api/options/categories/department/:departmentId
```
**Description:** Get all sub-specialities for a specific department (parent_id = null)

### Get Child Categories
```
GET /api/options/categories/:parentId/children
```
**Description:** Get all sub-sub-specialities for a specific sub-speciality

### Get Child Categories by Multiple Parent IDs
```
GET /api/options/categories/children?parentIds=1,2,3
```
**Description:** Get all sub-sub-specialities for multiple parent sub-specialities

### Get All Categories
```
GET /api/options/categories
```
**Description:** Get all categories (both sub-specialities and sub-sub-specialities)

### Get All Departments
```
GET /api/options/departments
```
**Description:** Get all medical departments (primary specialities)

### Get Country Codes
```
GET /api/options/countries
```
**Description:** Get all country codes for phone number dropdown

### Get Timezones
```
GET /api/options/timezones
```
**Description:** Get all timezones for timezone dropdown

### Get Practice Settings
```
GET /api/options/practice-settings
```
**Description:** Get all practice settings

### Get Imaging Modalities
```
GET /api/options/imaging-modalities
```
**Description:** Get all imaging modalities

### Get AI Annotation Experiences
```
GET /api/options/ai-experiences
```
**Description:** Get all AI annotation experience levels

### Get Document Types
```
GET /api/options/doc-types
```
**Description:** Get all document types for file uploads

---

## Fixed Data (No CRUD)

These tables are fixed and seeded via SQL migrations:
- **Country Codes** - Available at frontend for dropdown
- **Timezones** - Available at frontend for dropdown
- **Document Types** - Used for media uploads (identity, medical, profile, compliance)

---

## Summary

| Resource | Endpoints | CRUD | Purpose |
|----------|-----------|------|---------|
| Medical Departments | 5 | ✅ | Primary specialities |
| Medical Categories | 8 | ✅ | Sub-specialities & sub-sub-specialities |
| Practice Settings | 5 | ✅ | Practice setting options |
| Imaging Modalities | 5 | ✅ | Imaging modality options |
| AI Annotation Experiences | 5 | ✅ | AI experience levels |
| Physician Management | 2 | ✅ | Get physicians list (with status filter), get physician details (with onboarding + login history), approve/reject |
| **Admin Total** | **30** | ✅ | Complete admin management |

### Physician APIs

|| Resource | Endpoints | Purpose |
||----------|-----------|---------|
|| Onboarding Steps | 6 | Multi-step physician onboarding |
|| Onboarding Progress | 1 | Track onboarding completion with data validation |
|| Onboarding Data | 1 | Get all onboarding data in single response |
|| **Physician Total** | **8** | Complete physician onboarding |

### Shared APIs

|| Resource | Endpoints | Purpose |
||----------|-----------|---------|
|| File Uploads | 4 | Upload, view, delete files |
|| Options | 11 | Public dropdown data |
|| **Shared Total** | **15** | File management & options |

### Grand Total: **53 APIs**
