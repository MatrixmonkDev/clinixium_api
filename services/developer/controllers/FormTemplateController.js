import FormTemplate from '../../admin/models/FormTemplate.js';
import FormField from '../../admin/models/FormField.js';
import FormTemplateCategory from '../../admin/models/FormTemplateCategory.js';
import FormVersionHistory from '../../admin/models/FormVersionHistory.js';

class FormTemplateController {
  static async create(req, res, next) {
    try {
      const developerId = req.user.id;
      const {
        title,
        description,
        version,
        specialty,
        instructions,
        estimated_completion_time,
        department_id,
      } = req.body;

      // Developer creates form - starts as draft
      const formId = await FormTemplate.create({
        title,
        description,
        version: version || '1.0',
        status: 'draft', // Draft initially, needs approval
        created_by_user_type: 'D',
        created_by_user_id: developerId,
        specialty,
        instructions,
        estimated_completion_time,
        department_id,
      });

      // Create version history entry
      await FormVersionHistory.create({
        form_template_id: formId,
        version: version || '1.0',
        changed_by_user_id: developerId,
        changed_by_user_type: 'D',
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
      const developerId = req.user.id;
      const { status, department_id, user_type } = req.query;

      let allForms = [];

      // Filter by user_type if provided
      if (user_type === 'A') {
        // Show admin forms AND developer's own forms (not other developers' forms)
        const adminFilters = { created_by_user_type: 'A' };
        // If status is provided, use it. Otherwise default to 'active'
        if (status) {
          adminFilters.status = status;
        } else {
          adminFilters.status = 'active';
        }
        if (department_id) adminFilters.department_id = department_id;

        const adminForms = await FormTemplate.findAll(adminFilters);

        // Also get developer's own forms
        const ownFilters = { created_by_user_type: 'D', created_by_user_id: developerId };
        if (status) ownFilters.status = status;
        if (department_id) ownFilters.department_id = department_id;

        const ownForms = await FormTemplate.findAll(ownFilters);

        allForms = [
          ...adminForms.map(form => ({ ...form, is_own: false })),
          ...ownForms.map(form => ({ ...form, is_own: true }))
        ];
      } else if (user_type === 'D') {
        // Only show own forms
        const ownFilters = { created_by_user_type: 'D', created_by_user_id: developerId };
        if (status) ownFilters.status = status;
        if (department_id) ownFilters.department_id = department_id;

        const ownForms = await FormTemplate.findAll(ownFilters);
        allForms = ownForms.map(form => ({ ...form, is_own: true }));
      } else {
        // Show both own forms and admin forms (default)
        const ownFilters = { created_by_user_type: 'D', created_by_user_id: developerId };
        if (status) ownFilters.status = status;
        if (department_id) ownFilters.department_id = department_id;

        const ownForms = await FormTemplate.findAll(ownFilters);

        const adminFilters = { created_by_user_type: 'A' };
        // If status is provided, use it for admin forms too. Otherwise default to 'active'
        if (status) {
          adminFilters.status = status;
        } else {
          adminFilters.status = 'active';
        }
        if (department_id) adminFilters.department_id = department_id;

        const adminForms = await FormTemplate.findAll(adminFilters);

        allForms = [
          ...ownForms.map(form => ({ ...form, is_own: true })),
          ...adminForms.map(form => ({ ...form, is_own: false }))
        ];
      }

      res.status(200).json({
        success: true,
        data: allForms,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const developerId = req.user.id;

      const form = await FormTemplate.getWithDetails(id);

      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Check if developer can view this form
      const isOwnForm = form.created_by_user_type === 'D' && form.created_by_user_id === developerId;
      const isAdminForm = form.created_by_user_type === 'A';

      if (!isOwnForm && !isAdminForm) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this form',
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
          is_editable: isOwnForm && (form.status === 'draft' || form.status === 'pending_approval'),
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
      const developerId = req.user.id;

      // Get current form
      const currentForm = await FormTemplate.findById(id);
      if (!currentForm) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Check ownership
      if (currentForm.created_by_user_type !== 'D' || currentForm.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit your own forms',
        });
      }

      // Check if form can be edited (only draft or pending)
      if (currentForm.status !== 'draft' && currentForm.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Can only edit draft or pending approval forms',
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
          changed_by_user_id: developerId,
          changed_by_user_type: 'D',
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
      const developerId = req.user.id;

      // Get current form
      const currentForm = await FormTemplate.findById(id);
      if (!currentForm) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Check ownership
      if (currentForm.created_by_user_type !== 'D' || currentForm.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own forms',
        });
      }

      // Check if form can be deleted (only draft or pending)
      if (currentForm.status !== 'draft' && currentForm.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Can only delete draft or pending approval forms',
        });
      }

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
      const developerId = req.user.id;

      // Get current form
      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Check ownership
      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only archive your own forms',
        });
      }

      await FormTemplate.update(id, { status: 'archived' });

      // Create version history entry with actual version
      await FormVersionHistory.create({
        form_template_id: id,
        version: form.version,
        changed_by_user_id: developerId,
        changed_by_user_type: 'D',
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
      const developerId = req.user.id;

      // Check if form exists and is archived
      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Check ownership
      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only restore your own forms',
        });
      }

      if (form.status !== 'archived') {
        return res.status(400).json({
          success: false,
          message: 'Form is not archived. Only archived forms can be restored.',
        });
      }

      // Restore form to draft status
      await FormTemplate.update(id, { status: 'draft' });

      // Create version history entry with actual version
      await FormVersionHistory.create({
        form_template_id: id,
        version: form.version,
        changed_by_user_id: developerId,
        changed_by_user_type: 'D',
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

  static async submitForApproval(req, res, next) {
    try {
      const { id } = req.params;
      const developerId = req.user.id;

      // Get current form
      const currentForm = await FormTemplate.findById(id);
      if (!currentForm) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      // Check ownership
      if (currentForm.created_by_user_type !== 'D' || currentForm.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only submit your own forms for approval',
        });
      }

      // Check if form can be submitted (only draft)
      if (currentForm.status !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Only draft forms can be submitted for approval',
        });
      }

      // Update status to pending approval
      await FormTemplate.update(id, { status: 'pending_approval' });

      // Create version history entry
      await FormVersionHistory.create({
        form_template_id: id,
        version: currentForm.version,
        changed_by_user_id: developerId,
        changed_by_user_type: 'D',
        change_summary: 'Form submitted for approval',
        change_type: 'updated',
      });

      res.status(200).json({
        success: true,
        message: 'Form submitted for approval successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async assignCategories(req, res, next) {
    try {
      const { id } = req.params;
      const developerId = req.user.id;
      const { category_ids } = req.body;

      if (!category_ids || !Array.isArray(category_ids) || category_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'category_ids array is required',
        });
      }

      // Check ownership
      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only assign categories to your own forms',
        });
      }

      // Get existing categories to avoid duplicates
      const existingCategories = await FormTemplateCategory.findByFormTemplateId(id);
      const existingCategoryIds = existingCategories.map(cat => cat.category_id);

      // Add new categories (don't clear existing ones)
      for (const categoryId of category_ids) {
        if (!existingCategoryIds.includes(categoryId)) {
          await FormTemplateCategory.create({
            form_template_id: id,
            category_id: categoryId,
          });
        }
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
      const developerId = req.user.id;

      // Check ownership
      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only remove categories from your own forms',
        });
      }

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
      const developerId = req.user.id;

      // Check ownership or if it's an admin form
      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      const isOwnForm = form.created_by_user_type === 'D' && form.created_by_user_id === developerId;
      const isAdminForm = form.created_by_user_type === 'A';

      if (!isOwnForm && !isAdminForm) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this form',
        });
      }

      const categories = await FormTemplateCategory.findByFormTemplateId(id);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getVersionHistory(req, res, next) {
    try {
      const { id } = req.params;
      const developerId = req.user.id;

      // Check ownership
      const form = await FormTemplate.findById(id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found',
        });
      }

      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only view version history of your own forms',
        });
      }

      const versions = await FormVersionHistory.findByFormTemplateId(id);

      res.status(200).json({
        success: true,
        data: versions,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default FormTemplateController;
