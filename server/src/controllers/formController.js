import { personalInfoSchema } from '../schemas/formSchema.js';
import * as formService from '../services/formService.js';

/**
 * Controller to handle form submission: POST /api/personal-info
 */
export async function submitPersonalInfo(req, res, next) {
  try {
    // 1. Backend schema validation
    const validationResult = personalInfoSchema.safeParse(req.body);

    if (!validationResult.success) {
      // Map Zod issues into a friendly key-value object: { [field]: errorMessage }
      const errors = {};
      for (const issue of validationResult.error.issues) {
        const fieldName = issue.path[0] || 'general';
        if (!errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      }

      return res.status(400).json({
        success: false,
        message: 'Please correct the highlighted fields.',
        errors
      });
    }

    // 2. Pre-insert duplicate check: Ensure no record matching all 9 fields exists
    const isDuplicate = await formService.findDuplicateRecord(validationResult.data);
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_USER',
        message: 'User already exists. This information has already been submitted.'
      });
    }

    // 3. Persist into MySQL
    const savedRecord = await formService.savePersonalInfo(validationResult.data);

    // 4. Return 201 Created on confirmed database insert
    return res.status(201).json({
      success: true,
      message: 'Personal information submitted successfully.',
      data: savedRecord
    });
  } catch (error) {
    // Handle concurrent duplicate submission caught by MySQL UNIQUE constraint
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_USER',
        message: 'User already exists. This information has already been submitted.'
      });
    }

    // Pass unexpected errors to centralized error handling middleware
    next(error);
  }
}
