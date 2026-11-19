import FormTemplate from '../models/FormTemplate.js';
import FormField from '../models/FormField.js';
import FormTemplateCategory from '../models/FormTemplateCategory.js';
import FormVersionHistory from '../models/FormVersionHistory.js';

class FormTemplateController {
  static async create(req, res, next) {
    try {
      const adminId = req.user.id;
      const {
        title,
        description,
        version,
        specialty,
        instructions,
        estimated_completion_time,
        department_id,
      } = req.body;

      // Admin creates form - auto-approved
      const formId = await FormTemplate.create({
        title,
        description,
        version: version || '1.0',
        status: 'active', // Auto-approved for admin
        created_by_user_type: 'A',
        created_by_user_id: adminId,
        specialty,
        instructions,
        estimated_completion_time,
        department_id,
      });

      // Create version history entry
      await FormVersionHistory.create({
        form_template_id: formId,
        version: version || '1.0',
        changed_by_user_id: adminId,
        changed_by_user_type: 'A',
        change_summary: 'Form created',
        change_type: 'created',
      });

      res.status(201).json({
        success: true,
        message: 'Form created successfully',
        data: { id: formId },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req, res, next) {
    try {
      const { status, department_id, created_by_user_type, developer_status } = req.query;

      const filters = {};
      if (status) filters.status = status;
      if (department_id) filters.department_id = department_id;
      if (created_by_user_type) filters.created_by_user_type = created_by_user_type;
      if (developer_status) filters.developer_status = developer_status;

      const forms = await FormTemplate.findAll(filters);

      res.status(200).json({
        success: true,
        data: forms,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;

      const form = await FormTemplate.getWithDetails(id);

      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Get categories
      const categories = await FormTemplateCategory.findByFormTemplateId(id);

      // Get fields with options
      const fields = await FormField.findByFormTemplateId(id);

      res.status(200).json({
        success: true,
        data: {
          ...form,
          categories,
          fields,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // Get current form
      const currentForm = await FormTemplate.findById(id);
      if (!currentForm) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Extract updatable fields from request body
      const updatableFields = [
        'title',
        'description',
        'specialty',
        'instructions',
        'estimated_completion_time',
        'department_id',
      ];

      const updateData = {};
      let hasVersionTriggeringChange = false;

      for (const field of updatableFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
          // Check if any significant field changed
          if (currentForm[field] !== req.body[field]) {
            hasVersionTriggeringChange = true;
          }
        }
      }

      // If no fields to update, return early
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
      }

      // Increment version if significant changes were made
      let newVersion = currentForm.version;
      if (hasVersionTriggeringChange) {
        const versionParts = currentForm.version.split('.');
        const majorVersion = parseInt(versionParts[0]) || 1;
        const minorVersion = parseInt(versionParts[1]) || 0;
        newVersion = `${majorVersion}.${minorVersion + 1}`;
        updateData.version = newVersion;
      }

      // Update form
      await FormTemplate.update(id, updateData);

      // Create version history entry only if version changed
      if (hasVersionTriggeringChange) {
        await FormVersionHistory.create({
          form_template_id: id,
          version: newVersion,
          changed_by_user_id: adminId,
          changed_by_user_type: 'A',
          change_summary: req.body.change_summary || 'Form updated',
          change_type: 'updated',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Form updated successfully',
        data: { id, version: newVersion },
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;

      await FormTemplate.delete(id);

      res.status(200).json({
        success: true,
        message: 'Form deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async archive(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // Get current form to preserve version
      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      await FormTemplate.update(id, { status: 'archived' });

      // Create version history entry with actual version
      await FormVersionHistory.create({
        form_template_id: id,
        version: form.version,
        changed_by_user_id: adminId,
        changed_by_user_type: 'A',
        change_summary: 'Form archived',
        change_type: 'archived',
      });

      res.status(200).json({
        success: true,
        message: 'Form archived successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async restore(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      // Check if form exists and is archived
      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      if (form.status !== 'archived') {
        return res.status(400).json({
          success: false,
          message: 'Form is not archived. Only archived forms can be restored.',
        });
      }

      // Restore form to active status
      await FormTemplate.update(id, { status: 'active' });

      // Create version history entry with actual version (no version change)
      await FormVersionHistory.create({
        form_template_id: id,
        version: form.version,
        changed_by_user_id: adminId,
        changed_by_user_type: 'A',
        change_summary: 'Form restored from archive',
        change_type: 'restored',
      });

      res.status(200).json({
        success: true,
        message: 'Form restored successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignCategories(req, res, next) {
    try {
      const { id } = req.params;
      const { category_ids } = req.body;

      if (!category_ids || !Array.isArray(category_ids) || category_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'category_ids array is required',
        });
      }

      // Clear existing categories
      await FormTemplateCategory.deleteAllByFormTemplateId(id);

      // Assign new categories
      for (const categoryId of category_ids) {
        await FormTemplateCategory.create({
          form_template_id: id,
          category_id: categoryId,
        });
      }

      res.status(200).json({
        success: true,
        message: 'Categories assigned successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeCategory(req, res, next) {
    try {
      const { id, categoryId } = req.params;

      await FormTemplateCategory.delete(id, categoryId);

      res.status(200).json({
        success: true,
        message: 'Category removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCategories(req, res, next) {
    try {
      const { id } = req.params;

      const categories = await FormTemplateCategory.findByFormTemplateId(id);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPendingApprovals(req, res, next) {
    try {
      const forms = await FormTemplate.findAll({
        status: 'pending_approval',
        created_by_user_type: 'D',
      });

      res.status(200).json({
        success: true,
        data: forms,
      });
    } catch (error) {
      next(error);
    }
  }

  static async approve(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { rejection_reason } = req.body;

      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Only set approved_by for developer forms
      const updateData = {
        status: 'active',
        rejection_reason: null,
      };

      if (form.created_by_user_type === 'D') {
        updateData.approved_by_user_id = adminId;
        updateData.approved_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      }

      await FormTemplate.update(id, updateData);

      // Create version history entry for approval
      await FormVersionHistory.create({
        form_template_id: id,
        version: form.version,
        changed_by_user_id: adminId,
        changed_by_user_type: 'A',
        change_summary: 'Form approved by admin',
        change_type: 'approved',
      });

      res.status(200).json({
        success: true,
        message: 'Form approved successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async reject(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { rejection_reason } = req.body;

      if (!rejection_reason) {
        return res.status(400).json({
          success: false,
          message: 'rejection_reason is required',
        });
      }

      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      await FormTemplate.update(id, {
        status: 'rejected',
        rejection_reason,
      });

      // Create version history entry for rejection
      await FormVersionHistory.create({
        form_template_id: id,
        version: form.version,
        changed_by_user_id: adminId,
        changed_by_user_type: 'A',
        change_summary: 'Form rejected by admin',
        change_type: 'rejected',
      });

      res.status(200).json({
        success: true,
        message: 'Form rejected successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async requestCorrection(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { review_notes } = req.body;

      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      await FormTemplate.update(id, {
        status: 'corrections_requested',
        rejection_reason: review_notes,
      });

      // Create version history entry for correction request
      await FormVersionHistory.create({
        form_template_id: id,
        version: form.version,
        changed_by_user_id: adminId,
        changed_by_user_type: 'A',
        change_summary: 'Correction requested by admin',
        change_type: 'corrections_requested',
      });

      res.status(200).json({
        success: true,
        message: 'Correction requested successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVersionHistory(req, res, next) {
    try {
      const { id } = req.params;

      const versions = await FormVersionHistory.findByFormTemplateId(id);

      res.status(200).json({
        success: true,
        data: versions,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFormsWithMultipleVersions(req, res, next) {
    try {
      const { department_id } = req.query;

      const filters = {};
      if (department_id) filters.department_id = department_id;

      const forms = await FormTemplate.findWithMultipleVersions(filters);

      res.status(200).json({
        success: true,
        data: forms,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default FormTemplateController;
