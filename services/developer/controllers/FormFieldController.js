import FormField from '../../admin/models/FormField.js';
import FormFieldOption from '../../admin/models/FormFieldOption.js';
import FormTemplate from '../../admin/models/FormTemplate.js';

class FormFieldController {
  static async create(req, res, next) {
    try {
      const { id: form_template_id } = req.params;
      const developerId = req.user.id;
      const {
        field_label,
        field_name,
        field_type,
        placeholder,
        sort_order,
        is_required,
        width,
        min_length,
        max_length,
        min_value,
        max_value,
        pattern,
        validation_message,
        allowed_file_types,
        max_file_size_mb,
        default_value,
        options,
      } = req.body;

      // Validate form exists and developer owns it
      const form = await FormTemplate.findById(form_template_id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form template not found',
        });
      }

      // Check ownership
      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only add fields to your own forms',
        });
      }

      // Check if form can be edited
      if (form.status !== 'draft' && form.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Can only add fields to draft or pending approval forms',
        });
      }

      // Create field
      const fieldId = await FormField.create({
        form_template_id,
        field_label,
        field_name,
        field_type,
        placeholder,
        sort_order,
        is_required,
        width,
        min_length,
        max_length,
        min_value,
        max_value,
        pattern,
        validation_message,
        allowed_file_types,
        max_file_size_mb,
        default_value,
      });

      // Create options if provided (for dropdown, radio, checkbox)
      if (options && Array.isArray(options) && options.length > 0) {
        for (const option of options) {
          await FormFieldOption.create({
            form_field_id: fieldId,
            ...option,
          });
        }
      }

      // Update form stats
      await FormTemplate.updateStats(form_template_id);

      res.status(201).json({
        success: true,
        message: 'Field created successfully',
        data: { id: fieldId },
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const developerId = req.user.id;
      const {
        field_label,
        field_name,
        field_type,
        placeholder,
        sort_order,
        is_required,
        width,
        min_length,
        max_length,
        min_value,
        max_value,
        pattern,
        validation_message,
        allowed_file_types,
        max_file_size_mb,
        default_value,
        options,
      } = req.body;

      // Get field
      const field = await FormField.findById(id);
      if (!field) {
        return res.status(404).json({
          success: false,
          message: 'Field not found',
        });
      }

      // Get form to check ownership
      const form = await FormTemplate.findById(field.form_template_id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form template not found',
        });
      }

      // Check ownership
      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only edit fields in your own forms',
        });
      }

      // Check if form can be edited
      if (form.status !== 'draft' && form.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Can only edit fields in draft or pending approval forms',
        });
      }

      await FormField.update(id, {
        field_label,
        field_name,
        field_type,
        placeholder,
        sort_order,
        is_required,
        width,
        min_length,
        max_length,
        min_value,
        max_value,
        pattern,
        validation_message,
        allowed_file_types,
        max_file_size_mb,
        default_value,
      });

      // Handle options - if field_type changed to/from option-based types
      if (options && Array.isArray(options)) {
        // Delete existing options
        await FormFieldOption.deleteByFormFieldId(id);
        // Create new options
        for (const option of options) {
          await FormFieldOption.create({
            form_field_id: id,
            ...option,
          });
        }
      }

      // Update form stats
      await FormTemplate.updateStats(field.form_template_id);

      res.status(200).json({
        success: true,
        message: 'Field updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const developerId = req.user.id;

      const field = await FormField.findById(id);
      if (!field) {
        return res.status(404).json({
          success: false,
          message: 'Field not found',
        });
      }

      // Get form to check ownership
      const form = await FormTemplate.findById(field.form_template_id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form template not found',
        });
      }

      // Check ownership
      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete fields from your own forms',
        });
      }

      // Check if form can be edited
      if (form.status !== 'draft' && form.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Can only delete fields from draft or pending approval forms',
        });
      }

      await FormField.delete(id);

      // Update form stats
      await FormTemplate.updateStats(field.form_template_id);

      res.status(200).json({
        success: true,
        message: 'Field deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async reorder(req, res, next) {
    try {
      const { id: form_template_id } = req.params;
      const developerId = req.user.id;
      const { field_ids } = req.body;

      if (!field_ids || !Array.isArray(field_ids)) {
        return res.status(400).json({
          success: false,
          message: 'field_ids array is required',
        });
      }

      // Check form ownership
      const form = await FormTemplate.findById(form_template_id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form template not found',
        });
      }

      if (form.created_by_user_type !== 'D' || form.created_by_user_id !== developerId) {
        return res.status(403).json({
          success: false,
          message: 'You can only reorder fields in your own forms',
        });
      }

      // Check if form can be edited
      if (form.status !== 'draft' && form.status !== 'pending_approval') {
        return res.status(400).json({
          success: false,
          message: 'Can only reorder fields in draft or pending approval forms',
        });
      }

      await FormField.reorder(form_template_id, field_ids);

      // Fetch updated fields to confirm the reorder
      const updatedFields = await FormField.findByFormTemplateId(form_template_id);

      res.status(200).json({
        success: true,
        message: 'Fields reordered successfully',
        data: updatedFields,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const developerId = req.user.id;

      const field = await FormField.getWithOptions(id);

      if (!field) {
        return res.status(404).json({
          success: false,
          message: 'Field not found',
        });
      }

      // Get form to check ownership
      const form = await FormTemplate.findById(field.form_template_id);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form template not found',
        });
      }

      // Check ownership or if it's an admin form
      const isOwnForm = form.created_by_user_type === 'D' && form.created_by_user_id === developerId;
      const isAdminForm = form.created_by_user_type === 'A';

      if (!isOwnForm && !isAdminForm) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this field',
        });
      }

      res.status(200).json({
        success: true,
        data: field,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default FormFieldController;
