/**
 * Centralized Express Error Handling Middleware.
 * 
 * Why centralized error handling?
 * - Single source of truth for all API errors.
 * - Prevents the server process from crashing on unhandled promise rejections.
 * - Security: Guarantees that internal system paths, passwords, and SQL syntax details
 *   are NEVER leaked to the client browser.
 */
export function errorHandler(err, req, res, next) {
  // Always log internal details to the server console for debugging
  console.error('[SERVER ERROR]:', err);

  // 1. Handle malformed JSON body errors from express.json()
  if (err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400 && 'body' in err)) {
    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload. Please send valid JSON data.',
      errors: { general: 'Malformed JSON payload.' }
    });
  }

  // 2. Handle Database connection failure or service unavailable
  if (
    err.code === 'ECONNREFUSED' ||
    err.code === 'PROTOCOL_CONNECTION_LOST' ||
    err.code === 'ER_ACCESS_DENIED_ERROR' ||
    err.code === 'ER_BAD_DB_ERROR'
  ) {
    return res.status(503).json({
      success: false,
      message: 'The database service is temporarily unavailable. Please try again shortly.',
      errors: { database: 'Database service unavailable.' }
    });
  }

  // 3. Handle Duplicate Key constraint errors
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_USER',
      message: 'User already exists. This information has already been submitted.'
    });
  }

  // 4. Default fallback: 500 Internal Server Error
  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    message: 'An unexpected server error occurred. Please try again later.',
    errors: { general: 'Internal server error.' }
  });
}
