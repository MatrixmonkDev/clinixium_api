# Admin Onboarding APIs Documentation

## Overview
These APIs allow admins to manage the onboarding options for physicians, including medical departments, categories, practice settings, imaging modalities, and AI annotation experiences.

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
| **Total** | **28** | ✅ | Complete admin management |
