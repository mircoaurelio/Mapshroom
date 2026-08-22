import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type AdminUser = {
  id: string;
  email_normalized: string;
  locale: string;
  source: string;
  verified_at: string | null;
  marketing_opt_in: number;
  marketing_confirmed_at: string | null;
  created_at: string;
  last_download_at: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
};

type AdminFeedback = {
  id: string;
  email_normalized: string | null;
  category: string;
  rating: number | null;
  message: string;
  app_version: string | null;
  surface: string | null;
  route: string | null;
  created_at: string;
};

export function AdminRoute() {
  const [token, setToken] = useState(() => sessionStorage.getItem('mapshroom-admin-token') || '');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedback, setFeedback] = useState<AdminFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const headers = (): HeadersInit =>
    token ? { 'x-admin-token': token } : {};

  const load = async () => {
    setError(null);
    sessionStorage.setItem('mapshroom-admin-token', token);
    try {
      const [usersRes, feedbackRes] = await Promise.all([
        fetch('/api/admin/users', { headers: headers(), credentials: 'include' }),
        fetch('/api/admin/feedback', { headers: headers(), credentials: 'include' }),
      ]);
      if (!usersRes.ok || !feedbackRes.ok) {
        setError('Admin authentication failed. Use Cloudflare Access or the admin token.');
        setLoaded(false);
        return;
      }
      const usersJson = (await usersRes.json()) as { users: AdminUser[] };
      const feedbackJson = (await feedbackRes.json()) as { feedback: AdminFeedback[] };
      setUsers(usersJson.users || []);
      setFeedback(feedbackJson.feedback || []);
      setLoaded(true);
    } catch {
      setError('Failed to load admin data.');
    }
  };

  useEffect(() => {
    document.body.classList.add('download-page-active');
    if (token) {
      void load();
    }
    return () => document.body.classList.remove('download-page-active');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="download-page growth-page admin-page">
      <div className="download-page-inner">
        <header className="download-page-header">
          <Link to="/" className="download-page-back">
            ← Workspace
          </Link>
          <p className="download-page-kicker">Private</p>
          <h1 className="download-page-title">Growth admin</h1>
          <p className="download-page-lead">
            Verified emails, newsletter status, and feedback. Protect this route with Cloudflare
            Access in production.
          </p>
        </header>

        <section className="download-actions">
          <div className="download-link-card">
            <label className="growth-field">
              <span className="download-link-label">Admin token (local/dev fallback)</span>
              <input
                className="text-field"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="x-admin-token"
              />
            </label>
            <div className="download-link-actions">
              <button type="button" className="primary-button" onClick={() => void load()}>
                Refresh
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  void (async () => {
                    const response = await fetch('/api/admin/export.csv', {
                      headers: headers(),
                      credentials: 'include',
                    });
                    if (!response.ok) {
                      setError('CSV export failed. Check admin authentication.');
                      return;
                    }
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = 'mapshroom-leads.csv';
                    anchor.click();
                    URL.revokeObjectURL(url);
                  })();
                }}
              >
                Export CSV
              </button>
            </div>
            {error ? <p className="growth-form-error">{error}</p> : null}
          </div>
        </section>

        {loaded ? (
          <>
            <section className="admin-table-wrap">
              <h2>Leads ({users.length})</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Source</th>
                    <th>Verified</th>
                    <th>Marketing</th>
                    <th>Created</th>
                    <th>UTM</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email_normalized}</td>
                      <td>{user.source}</td>
                      <td>{user.verified_at ? 'yes' : 'no'}</td>
                      <td>
                        {user.marketing_confirmed_at
                          ? 'confirmed'
                          : user.marketing_opt_in
                            ? 'requested'
                            : 'no'}
                      </td>
                      <td>{user.created_at}</td>
                      <td>
                        {[user.utm_source, user.utm_campaign].filter(Boolean).join(' / ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="admin-table-wrap">
              <h2>Feedback ({feedback.length})</h2>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Category</th>
                    <th>Rating</th>
                    <th>Surface</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.map((item) => (
                    <tr key={item.id}>
                      <td>{item.created_at}</td>
                      <td>{item.category}</td>
                      <td>{item.rating ?? '—'}</td>
                      <td>{item.surface ?? '—'}</td>
                      <td>{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
