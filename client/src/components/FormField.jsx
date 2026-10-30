import React from 'react';

/**
 * Reusable FormField component.
 * 
 * Ensures consistent layout, accessibility attributes (aria-invalid, aria-describedby),
 * required indicator (*), and inline error messages directly underneath the field.
 */
export default function FormField({
  id,
  label,
  required = false,
  error,
  helpText,
  children
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`form-field ${error ? 'has-error' : ''}`}>
      <label htmlFor={id} className="form-label">
        {label}
        {required && <span className="required-star" aria-hidden="true"> *</span>}
      </label>

      <div className="input-wrapper">
        {children}
      </div>

      {helpText && !error && (
        <span className="field-help-text">{helpText}</span>
      )}

      {error && (
        <p id={errorId} className="field-error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
