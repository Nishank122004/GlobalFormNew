import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CsvRecordSearch from '../components/CsvRecordSearch.jsx';

describe('CsvRecordSearch - CSV Record Lookup Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRecord = {
    username: 'umber_quail0028',
    email: 'umber_quail0028@example.com',
    mobile: '0465066497',
    city: 'Dunewell',
    postal_code: '07711'
  };

  it('renders the search input, submit button, clear button, and demo note', () => {
    render(<CsvRecordSearch />);

    expect(screen.getByRole('heading', { name: /Find a demonstration record/i })).toBeInTheDocument();
    expect(screen.getByText(/Synthetic demonstration data only/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Search$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Clear$/i })).toBeInTheDocument();
  });

  it('shows validation message when searching with an empty input', async () => {
    render(<CsvRecordSearch />);
    const searchBtn = screen.getByRole('button', { name: /^Search$/i });

    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Enter a username.');
    });
  });

  it('displays record details on successful lookup', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        message: 'Record retrieved successfully.',
        data: mockRecord
      })
    });

    render(<CsvRecordSearch />);
    const input = screen.getByLabelText(/Username/i);
    const searchBtn = screen.getByRole('button', { name: /^Search$/i });

    await user.type(input, 'umber_quail0028');
    await user.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('umber_quail0028')).toBeInTheDocument();
      expect(screen.getByText('umber_quail0028@example.com')).toBeInTheDocument();
      expect(screen.getByText('0465066497')).toBeInTheDocument();
      expect(screen.getByText('Dunewell')).toBeInTheDocument();
      expect(screen.getByText('07711')).toBeInTheDocument();
    });
  });

  it('displays API error message when record is not found (404)', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        message: 'No matching record found.'
      })
    });

    render(<CsvRecordSearch />);
    const input = screen.getByLabelText(/Username/i);
    const searchBtn = screen.getByRole('button', { name: /^Search$/i });

    await user.type(input, 'unknown_user');
    await user.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('No matching record found.');
    });
    expect(screen.queryByText('unknown_user@example.com')).not.toBeInTheDocument();
  });

  it('handles network failure gracefully without crashing', async () => {
    const user = userEvent.setup();
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    render(<CsvRecordSearch />);
    const input = screen.getByLabelText(/Username/i);
    const searchBtn = screen.getByRole('button', { name: /^Search$/i });

    await user.type(input, 'test_user');
    await user.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('The lookup service is unavailable. Please try again.');
    });
  });

  it('clears username, record results, and alert messages when Clear is clicked', async () => {
    const user = userEvent.setup();
    render(<CsvRecordSearch />);
    const input = screen.getByLabelText(/Username/i);
    const clearBtn = screen.getByRole('button', { name: /^Clear$/i });
    const searchBtn = screen.getByRole('button', { name: /^Search$/i });

    // Trigger validation alert
    await user.click(searchBtn);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.type(input, 'sample');
    expect(input).toHaveValue('sample');

    // Click clear
    await user.click(clearBtn);
    expect(input).toHaveValue('');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
