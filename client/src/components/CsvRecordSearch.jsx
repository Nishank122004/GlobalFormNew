import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export default function CsvRecordSearch() {
  const [username, setUsername] = useState('');
  const [record, setRecord] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function search(event) {
    event.preventDefault();
    const value = username.trim();
    setRecord(null);
    setMessage('');
    if (!value) { setMessage('Enter a username.'); return; }
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/csv-records/${encodeURIComponent(value)}`, { cache: 'no-store' });
      const body = await response.json();
      if (response.ok) setRecord(body.data);
      else setMessage(body.message || 'Unable to complete the lookup.');
    } catch {
      setMessage('The lookup service is unavailable. Please try again.');
    } finally { setLoading(false); }
  }

  function clear() { setUsername(''); setRecord(null); setMessage(''); }

  return <section className="form-card csv-search-card" aria-labelledby="csv-search-title">
    <h2 id="csv-search-title">Find a demonstration record</h2>
    <p className="search-demo-note">Synthetic demonstration data only. Do not use this unauthenticated demo with real personal information.</p>
    <form onSubmit={search}>
      <label htmlFor="csv-username">Username</label>
      <div className="csv-search-controls">
        <input id="csv-username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={64} autoComplete="off" />
        <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        <button type="button" onClick={clear} disabled={loading}>Clear</button>
      </div>
    </form>
    {message && <p role="alert" className="search-message">{message}</p>}
    {record && <dl className="csv-result">
      <dt>Username</dt><dd>{record.username}</dd><dt>Email</dt><dd>{record.email}</dd>
      <dt>Mobile</dt><dd>{record.mobile || '—'}</dd><dt>City</dt><dd>{record.city || '—'}</dd>
      <dt>Postal Code</dt><dd>{record.postal_code || '—'}</dd>
    </dl>}
  </section>;
}
