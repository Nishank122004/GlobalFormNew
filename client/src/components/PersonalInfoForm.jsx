import React, { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';

import FormField from './FormField.jsx';
import { createFormSchema } from '../validation/formSchema.js';
import { submitForm } from '../services/formService.js';

export default function PersonalInfoForm() {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').split('-')[0];

  const [submissionStatus, setSubmissionStatus] = useState({
    state: 'idle', // 'idle' | 'success' | 'error'
    message: ''
  });

  // Dynamically compile the Zod schema with localized messages
  const schema = useMemo(() => createFormSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setError,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched', // Validate on touch for immediate feedback
    defaultValues: {
      fullName: '',
      email: '',
      countryCode: '',
      mobileNumber: '',
      dateOfBirth: '',
      gender: '',
      city: '',
      postalCode: '',
      preferredLanguage: ''
    }
  });

  const selectedCountry = watch('countryCode');
  const enteredMobile = watch('mobileNumber');
  const enteredPostal = watch('postalCode');

  // Compute international calling code for the selected country
  const callingCode = useMemo(() => {
    if (!selectedCountry) return '';
    try {
      return `+${getCountryCallingCode(selectedCountry)}`;
    } catch {
      return '';
    }
  }, [selectedCountry]);

  // Revalidate phone and postal code when the selected country changes
  useEffect(() => {
    if (selectedCountry) {
      if (enteredMobile) trigger('mobileNumber');
      if (enteredPostal) trigger('postalCode');
    }
  }, [selectedCountry, trigger]);

  // Revalidate entire schema when the UI language changes so messages update in place
  useEffect(() => {
    // Only re-trigger fields that already have errors
    Object.keys(errors).forEach((fieldName) => {
      trigger(fieldName);
    });
  }, [i18n.language, trigger]);

  // Generate localized, alphabetically-sorted country list using standard Intl.DisplayNames
  const countryOptions = useMemo(() => {
    const rawCountries = getCountries();
    let displayNames;
    try {
      displayNames = new Intl.DisplayNames([currentLang, 'en'], { type: 'region' });
    } catch {
      displayNames = { of: (code) => code };
    }

    return rawCountries
      .map((code) => {
        let name = code;
        try {
          name = displayNames.of(code) || code;
        } catch {
          name = code;
        }
        return { code, name };
      })
      .sort((a, b) => a.name.localeCompare(b.name, currentLang));
  }, [currentLang]);

  // Max date for date picker = today (YYYY-MM-DD)
  const maxDateToday = useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  const onSubmit = async (formData) => {
    setSubmissionStatus({ state: 'idle', message: '' });

    // Ensure phone number includes country calling code if user entered national format
    let phoneToSend = formData.mobileNumber.trim();
    if (callingCode && !phoneToSend.startsWith('+')) {
      phoneToSend = `${callingCode}${phoneToSend}`;
    }

    const payload = {
      ...formData,
      mobileNumber: phoneToSend
    };

    const response = await submitForm(payload);

    if (response.success) {
      setSubmissionStatus({
        state: 'success',
        message: t('status.successMessage')
      });
      // Reset form fields ONLY after the backend confirms database insert succeeded
      reset();
    } else {
      // Backend returned validation errors or server error
      if (response.errors) {
        Object.entries(response.errors).forEach(([field, msg]) => {
          if (field !== 'general' && field !== 'database') {
            setError(field, { type: 'server', message: msg });
          }
        });
      }

      const errorMessage = response.code === 'DUPLICATE_USER'
        ? t('status.duplicateError')
        : (response.networkError
          ? t('status.networkError')
          : (response.message || t('status.generalError')));

      setSubmissionStatus({
        state: 'error',
        message: errorMessage
      });
    }
  };

  return (
    <div className="form-card">
      {/* Success Notification Banner */}
      {submissionStatus.state === 'success' && (
        <div className="status-banner success-banner" role="status">
          <div className="banner-icon">✅</div>
          <div className="banner-text">
            <strong>{t('status.successTitle')}</strong>
            <p>{submissionStatus.message}</p>
          </div>
        </div>
      )}

      {/* General Error Notification Banner */}
      {submissionStatus.state === 'error' && (
        <div className="status-banner error-banner" role="alert">
          <div className="banner-icon">⚠️</div>
          <div className="banner-text">
            <strong>{t('status.errorTitle')}</strong>
            <p>{submissionStatus.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="personal-info-form">
        <div className="form-grid">
          {/* 1. Full Name (Required) */}
          <FormField
            id="fullName"
            label={t('fields.fullName.label')}
            required
            error={errors.fullName?.message}
          >
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder={t('fields.fullName.placeholder')}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              className={`form-input ${errors.fullName ? 'input-error' : ''}`}
              {...register('fullName')}
            />
          </FormField>

          {/* 2. Email Address (Required) */}
          <FormField
            id="email"
            label={t('fields.email.label')}
            required
            error={errors.email?.message}
          >
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={t('fields.email.placeholder')}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              {...register('email')}
            />
          </FormField>

          {/* 3. Country of Residence (Required) */}
          <FormField
            id="countryCode"
            label={t('fields.countryCode.label')}
            required
            error={errors.countryCode?.message}
          >
            <select
              id="countryCode"
              autoComplete="country"
              aria-invalid={Boolean(errors.countryCode)}
              aria-describedby={errors.countryCode ? 'countryCode-error' : undefined}
              className={`form-select ${errors.countryCode ? 'input-error' : ''}`}
              {...register('countryCode')}
            >
              <option value="">{t('fields.countryCode.selectPrompt')}</option>
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </option>
              ))}
            </select>
          </FormField>

          {/* 4. Mobile Number (Required) */}
          <FormField
            id="mobileNumber"
            label={t('fields.mobileNumber.label')}
            required
            error={errors.mobileNumber?.message}
          >
            <div className="phone-input-group">
              {callingCode && (
                <span className="phone-prefix" title="Calling Code">
                  {callingCode}
                </span>
              )}
              <input
                id="mobileNumber"
                type="tel"
                autoComplete="tel-national"
                placeholder={t('fields.mobileNumber.placeholder')}
                aria-invalid={Boolean(errors.mobileNumber)}
                aria-describedby={errors.mobileNumber ? 'mobileNumber-error' : undefined}
                className={`form-input phone-input ${errors.mobileNumber ? 'input-error' : ''}`}
                {...register('mobileNumber')}
              />
            </div>
          </FormField>

          {/* 5. Date of Birth (Required) */}
          <FormField
            id="dateOfBirth"
            label={t('fields.dateOfBirth.label')}
            required
            error={errors.dateOfBirth?.message}
          >
            <input
              id="dateOfBirth"
              type="date"
              max={maxDateToday}
              aria-invalid={Boolean(errors.dateOfBirth)}
              aria-describedby={errors.dateOfBirth ? 'dateOfBirth-error' : undefined}
              className={`form-input ${errors.dateOfBirth ? 'input-error' : ''}`}
              {...register('dateOfBirth')}
            />
          </FormField>

          {/* 6. Gender (Optional) */}
          <FormField
            id="gender"
            label={t('fields.gender.label')}
            error={errors.gender?.message}
          >
            <select
              id="gender"
              autoComplete="sex"
              aria-invalid={Boolean(errors.gender)}
              aria-describedby={errors.gender ? 'gender-error' : undefined}
              className={`form-select ${errors.gender ? 'input-error' : ''}`}
              {...register('gender')}
            >
              <option value="">{t('fields.gender.selectPrompt')}</option>
              <option value="male">{t('fields.gender.options.male')}</option>
              <option value="female">{t('fields.gender.options.female')}</option>
              <option value="other">{t('fields.gender.options.other')}</option>
              <option value="prefer_not_to_say">{t('fields.gender.options.prefer_not_to_say')}</option>
            </select>
          </FormField>

          {/* 7. City/Town (Required) */}
          <FormField
            id="city"
            label={t('fields.city.label')}
            required
            error={errors.city?.message}
          >
            <input
              id="city"
              type="text"
              autoComplete="address-level2"
              placeholder={t('fields.city.placeholder')}
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? 'city-error' : undefined}
              className={`form-input ${errors.city ? 'input-error' : ''}`}
              {...register('city')}
            />
          </FormField>

          {/* 8. Postal/ZIP Code (Optional) */}
          <FormField
            id="postalCode"
            label={t('fields.postalCode.label')}
            error={errors.postalCode?.message}
          >
            <input
              id="postalCode"
              type="text"
              autoComplete="postal-code"
              placeholder={t('fields.postalCode.placeholder')}
              aria-invalid={Boolean(errors.postalCode)}
              aria-describedby={errors.postalCode ? 'postalCode-error' : undefined}
              className={`form-input ${errors.postalCode ? 'input-error' : ''}`}
              {...register('postalCode')}
            />
          </FormField>

          {/* 9. Preferred Language (Optional) */}
          <FormField
            id="preferredLanguage"
            label={t('fields.preferredLanguage.label')}
            error={errors.preferredLanguage?.message}
          >
            <select
              id="preferredLanguage"
              aria-invalid={Boolean(errors.preferredLanguage)}
              aria-describedby={errors.preferredLanguage ? 'preferredLanguage-error' : undefined}
              className={`form-select ${errors.preferredLanguage ? 'input-error' : ''}`}
              {...register('preferredLanguage')}
            >
              <option value="">{t('fields.preferredLanguage.selectPrompt')}</option>
              <option value="en">{t('fields.preferredLanguage.options.en')}</option>
              <option value="hi">{t('fields.preferredLanguage.options.hi')}</option>
              <option value="fr">{t('fields.preferredLanguage.options.fr')}</option>
              <option value="es">{t('fields.preferredLanguage.options.es')}</option>
              <option value="ar">{t('fields.preferredLanguage.options.ar')}</option>
            </select>
          </FormField>
        </div>

        {/* Single Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn-submit ${isSubmitting ? 'btn-loading' : ''}`}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" aria-hidden="true"></span>
                <span>{t('buttons.submitting')}</span>
              </>
            ) : (
              t('buttons.submit')
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
