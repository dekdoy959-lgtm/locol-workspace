const linkStyle = { color: '#99CE24' };

export function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#101010' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'sans-serif', lineHeight: 1.7, color: '#FFFFFF' }}>
        <h1>Privacy Policy</h1>
        <p><strong>Last updated:</strong> May 2026</p>
        <p>
          LOCOL OPMS ("the App") is an internal opportunity management tool operated by LOCOL.
          This policy explains what data we collect and how we use it.
        </p>

        <h2>1. Data We Collect</h2>
        <ul>
          <li><strong>Google account info</strong> — your name and email address, obtained via Google Sign-In.</li>
          <li><strong>Google Calendar</strong> — read-only access to your calendar events, used to surface upcoming meetings relevant to your contacts and opportunities.</li>
          <li><strong>Gmail</strong> — read-only access to your email threads, used to display recent correspondence with your contacts inside the App.</li>
          <li><strong>App data</strong> — contacts, organizations, groups, opportunities, and notes you create inside the App.</li>
        </ul>

        <h2>2. How We Use Your Data</h2>
        <ul>
          <li>To authenticate you and manage your session.</li>
          <li>To display your calendar events and emails alongside relevant contacts and opportunities.</li>
          <li>To store your CRM data (contacts, opportunities, etc.) in a private database accessible only to your team.</li>
        </ul>

        <h2>3. Data Sharing</h2>
        <p>
          We do not sell, share, or transfer your data to any third parties. Google Calendar and Gmail data
          is accessed in real time and is never stored on our servers.
        </p>

        <h2>4. Data Retention</h2>
        <p>
          App data (contacts, opportunities) is retained until you delete it. Google OAuth tokens are stored
          only for the duration of your session.
        </p>

        <h2>5. Security</h2>
        <p>
          All data is stored in a self-hosted Supabase instance protected by JWT authentication.
          Access is restricted to authorized team members only.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          You may revoke the App's access to your Google account at any time via
          your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" style={linkStyle}>Google Account permissions page</a>.
          To request deletion of your app data, contact <a href="mailto:locol.beef@gmail.com" style={linkStyle}>locol.beef@gmail.com</a>.
        </p>

        <h2>7. Contact</h2>
        <p>
          For any privacy questions, email <a href="mailto:locol.beef@gmail.com" style={linkStyle}>locol.beef@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
