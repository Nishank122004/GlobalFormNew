const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Sends the validated form data to the Express backend.
 * 
 * @param {Object} data - Clean form values.
 * @returns {Promise<{ success: boolean, message?: string, data?: Object, errors?: Object, networkError?: boolean }>}
 */
export async function submitForm(data) {
  try {
    const response = await fetch(`${API_BASE_URL}/personal-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 201) {
      return {
        success: true,
        message: result.message || 'Submitted successfully',
        data: result.data
      };
    }

    if (response.status === 400) {
      return {
        success: false,
        message: result.message || 'Validation error',
        errors: result.errors || {}
      };
    }

    if (response.status === 409) {
      return {
        success: false,
        code: result.code || 'DUPLICATE_USER',
        message: result.message || 'User already exists. This information has already been submitted.'
      };
    }

    // 503 Service Unavailable or 500 Server Error
    return {
      success: false,
      message: result.message || 'Server error occurred. Please try again later.',
      errors: result.errors || { general: result.message || 'Server error' }
    };
  } catch (error) {
    // Network disconnection or backend server completely offline
    return {
      success: false,
      networkError: true,
      message: 'Network error: Unable to reach the server. Please verify your connection or backend status.'
    };
  }
}
