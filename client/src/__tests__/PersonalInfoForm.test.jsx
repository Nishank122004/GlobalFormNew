import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import App from '../App.jsx';
import * as formService from '../services/formService.js';
import i18n from '../i18n/i18n.js';

describe('Global Personal Information Form - Frontend Integration Tests', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage('en');
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  it('renders all nine fields, the language selector, and the submit button', () => {
    render(<App />);

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Country of Residence/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Mobile Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gender/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/City/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Postal/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Preferred Language/i)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Submit Information/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^Language/i })).toBeInTheDocument();
  });

  it('shows required validation errors when submitting an empty form', async () => {
    render(<App />);
    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Full name is required.')).toBeInTheDocument();
      expect(screen.getByText('Email address is required.')).toBeInTheDocument();
      expect(screen.getByText('Country of residence is required.')).toBeInTheDocument();
      expect(screen.getByText('Mobile number is required.')).toBeInTheDocument();
      expect(screen.getByText('Date of birth is required.')).toBeInTheDocument();
      expect(screen.getByText('City/Town is required.')).toBeInTheDocument();
    });
  });

  it('rejects names containing numbers', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, 'Alex 123');
    fireEvent.blur(nameInput);

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Name cannot contain numbers.')).toBeInTheDocument();
    });
  });

  it('accepts international Unicode names (e.g. Hindi, French, Arabic)', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, 'राहुल शर्मा');
    fireEvent.blur(nameInput);

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText('Name cannot contain numbers.')).not.toBeInTheDocument();
      expect(screen.queryByText('Please enter a valid name.')).not.toBeInTheDocument();
    });
  });

  it('rejects invalid email formats', async () => {
    const user = userEvent.setup();
    render(<App />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    await user.type(emailInput, 'invalid-email@');
    fireEvent.blur(emailInput);

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    });
  });

  it('rejects dates of birth in the future', async () => {
    render(<App />);

    const dobInput = screen.getByLabelText(/Date of Birth/i);
    fireEvent.change(dobInput, { target: { value: '2099-12-31' } });
    fireEvent.blur(dobInput);

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Date of birth cannot be in the future.')).toBeInTheDocument();
    });
  });

  it('validates mobile number against the selected country', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Select United States (US)
    const countrySelect = screen.getByLabelText(/Country of Residence/i);
    await user.selectOptions(countrySelect, 'US');

    const phoneInput = screen.getByLabelText(/Mobile Number/i);
    await user.type(phoneInput, '12345'); // Invalid US number
    fireEvent.blur(phoneInput);

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid mobile number for the selected country.')).toBeInTheDocument();
    });
  });

  it('re-validates phone number when the country changes', async () => {
    const user = userEvent.setup();
    render(<App />);

    const countrySelect = screen.getByLabelText(/Country of Residence/i);
    const phoneInput = screen.getByLabelText(/Mobile Number/i);

    // Enter a valid US 10-digit number
    await user.selectOptions(countrySelect, 'US');
    await user.type(phoneInput, '4155552671');
    fireEvent.blur(phoneInput);

    // Switch country to Spain (ES)
    await user.selectOptions(countrySelect, 'ES');

    // Phone should re-validate
    await waitFor(() => {
      expect(screen.getByText('Enter a valid mobile number for the selected country.')).toBeInTheDocument();
    });
  });

  it('allows blank optional postal code without error', async () => {
    const user = userEvent.setup();
    render(<App />);

    const countrySelect = screen.getByLabelText(/Country of Residence/i);
    await user.selectOptions(countrySelect, 'US');

    const postalInput = screen.getByLabelText(/Postal/i);
    await user.clear(postalInput);
    fireEvent.blur(postalInput);

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByText('Enter a valid postal/ZIP code for the selected country.')).not.toBeInTheDocument();
    });
  });

  it('validates postal code format when provided for a supported country', async () => {
    const user = userEvent.setup();
    render(<App />);

    const countrySelect = screen.getByLabelText(/Country of Residence/i);
    await user.selectOptions(countrySelect, 'US');

    const postalInput = screen.getByLabelText(/Postal/i);
    await user.type(postalInput, 'ABCDE'); // US requires 5 digits
    fireEvent.blur(postalInput);

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Enter a valid postal/ZIP code for the selected country.')).toBeInTheDocument();
    });
  });

  it('preserves form values when switching languages and applies Arabic RTL', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    await user.type(nameInput, 'Alex Morgan');

    const langSelect = screen.getByRole('combobox', { name: /^Language/i });
    // Switch to Arabic
    await user.selectOptions(langSelect, 'ar');

    // Name field should still hold the entered value
    expect(nameInput.value).toBe('Alex Morgan');

    // RTL direction attribute must be set on <html>
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar');

    // Switch to Hindi
    await user.selectOptions(langSelect, 'hi');
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('hi');
    expect(nameInput.value).toBe('Alex Morgan');
  });

  it('handles successful submission, shows success message, and resets form', async () => {
    const user = userEvent.setup();
    vi.spyOn(formService, 'submitForm').mockResolvedValueOnce({
      success: true,
      message: 'Your personal information has been verified and saved to the database.',
      data: { id: 1 }
    });

    render(<App />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Sarah Connor');
    await user.type(screen.getByLabelText(/Email Address/i), 'sarah@example.com');
    await user.selectOptions(screen.getByLabelText(/Country of Residence/i), 'US');
    await user.type(screen.getByLabelText(/Mobile Number/i), '4155552671');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1985-05-20' } });
    await user.type(screen.getByLabelText(/City/i), 'Los Angeles');

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Submission Successful!/i)).toBeInTheDocument();
      // Inputs reset after success
      expect(screen.getByLabelText(/Full Name/i).value).toBe('');
    });
  });

  it('automatically dismisses the success message after three seconds', async () => {
    const user = userEvent.setup();
    vi.spyOn(formService, 'submitForm').mockResolvedValueOnce({ success: true, data: { id: 2 } });
    render(<App />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Sarah Connor');
    await user.type(screen.getByLabelText(/Email Address/i), 'sarah@example.com');
    await user.selectOptions(screen.getByLabelText(/Country of Residence/i), 'US');
    await user.type(screen.getByLabelText(/Mobile Number/i), '4155552671');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1985-05-20' } });
    await user.type(screen.getByLabelText(/City/i), 'Los Angeles');
    await user.click(screen.getByRole('button', { name: /Submit Information/i }));

    expect(await screen.findByText(/Submission Successful!/i)).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 3100));
    });
    expect(screen.queryByText(/Submission Successful!/i)).not.toBeInTheDocument();
  });

  it('displays server-side validation errors beside corresponding fields without clearing inputs', async () => {
    const user = userEvent.setup();
    vi.spyOn(formService, 'submitForm').mockResolvedValueOnce({
      success: false,
      message: 'Please correct the highlighted fields.',
      errors: {
        email: 'This email address has already been registered.'
      }
    });

    render(<App />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/Email Address/i), 'existing@example.com');
    await user.selectOptions(screen.getByLabelText(/Country of Residence/i), 'US');
    await user.type(screen.getByLabelText(/Mobile Number/i), '4155552671');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1990-01-01' } });
    await user.type(screen.getByLabelText(/City/i), 'Chicago');

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('This email address has already been registered.')).toBeInTheDocument();
      // Form values preserved!
      expect(screen.getByLabelText(/Email Address/i).value).toBe('existing@example.com');
    });
  });

  it('displays localized duplicate user error (409 Conflict) and preserves entered values', async () => {
    const user = userEvent.setup();
    vi.spyOn(formService, 'submitForm').mockResolvedValueOnce({
      success: false,
      code: 'DUPLICATE_USER',
      message: 'User already exists. This information has already been submitted.'
    });

    render(<App />);

    const nameInput = screen.getByLabelText(/Full Name/i);
    const emailInput = screen.getByLabelText(/Email Address/i);

    await user.type(nameInput, 'Peter Parker');
    await user.type(emailInput, 'peter@example.com');
    await user.selectOptions(screen.getByLabelText(/Country of Residence/i), 'US');
    await user.type(screen.getByLabelText(/Mobile Number/i), '4155552671');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1995-08-10' } });
    await user.type(screen.getByLabelText(/City/i), 'New York');

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      // Duplicate error message displayed in visible alert area
      expect(screen.getByText('User already exists. This information has already been submitted.')).toBeInTheDocument();
      // Form values are preserved
      expect(nameInput.value).toBe('Peter Parker');
      expect(emailInput.value).toBe('peter@example.com');
      // Success message is NOT shown
      expect(screen.queryByText(/Submission Successful!/i)).not.toBeInTheDocument();
    });
  });

  it('handles server unavailability without crashing', async () => {
    const user = userEvent.setup();
    vi.spyOn(formService, 'submitForm').mockResolvedValueOnce({
      success: false,
      networkError: true,
      message: 'Unable to connect to the server.'
    });

    render(<App />);

    await user.type(screen.getByLabelText(/Full Name/i), 'Bruce Wayne');
    await user.type(screen.getByLabelText(/Email Address/i), 'bruce@wayne.com');
    await user.selectOptions(screen.getByLabelText(/Country of Residence/i), 'US');
    await user.type(screen.getByLabelText(/Mobile Number/i), '4155552671');
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '1980-02-19' } });
    await user.type(screen.getByLabelText(/City/i), 'Gotham');

    const submitBtn = screen.getByRole('button', { name: /Submit Information/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to the server/i)).toBeInTheDocument();
    });
  });
});
