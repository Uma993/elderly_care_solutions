import React, { useState } from 'react';
import { API_BASE_URL } from './api';
import LoginForm from './components/LoginForm.jsx';
import RegisterForm from './components/RegisterForm.jsx';
import PageShell from './components/ui/PageShell.jsx';
import Card from './components/ui/Card.jsx';
import Button from './components/ui/Button.jsx';
import Tag from './components/ui/Tag.jsx';
import ElderDashboard from './components/dashboards/ElderDashboard.jsx';
import FamilyDashboard from './components/dashboards/FamilyDashboard.jsx';
import PWAInstall from './components/PWAInstall.jsx';

function App() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [view, setView] = useState('auth'); // 'auth' | 'elderDashboard' | 'familyDashboard'

  const handleLoginSuccess = (user, message, jwt) => {
    setCurrentUser(user);
    setToken(jwt || null);
    setAuthMessage(message || '');
    setView(user.role === 'elderly' ? 'elderDashboard' : 'familyDashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setAuthMessage('');
    setActiveTab('login');
    setView('auth');
  };

  const handleRegistered = (message) => {
    setAuthMessage(message || 'Registration successful. You can now log in.');
    setActiveTab('login');
  };

  if (view === 'elderDashboard' && currentUser) {
    return (
      <PageShell
        title="Elderly Care"
        subtitle="Gentle reminders and quick help, all in one place."
        actions={<Tag tone="success">Logged in as Elderly User</Tag>}
      >
        <Card>
          <ElderDashboard currentUser={currentUser} token={token} onLogout={handleLogout} />
        </Card>
      </PageShell>
    );
  }

  if (view === 'familyDashboard' && currentUser) {
    return (
      <PageShell
        title="Elderly Care"
        subtitle="Stay close, even from far away. Monitor and support with ease."
        actions={
          <Tag tone="warning">
            {currentUser.relation ? `Logged in as ${currentUser.relation}` : 'Logged in as Family Member'}
          </Tag>
        }
      >
        <Card>
          <FamilyDashboard currentUser={currentUser} token={token} onLogout={handleLogout} />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Elderly Care"
      subtitle="A calm, simple space for elderly users and their families."
    >
      <Card>
        <PWAInstall />
        <div className="auth-actions">
          <Button
            variant={activeTab === 'login' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('login')}
            style={{ minHeight: '48px', fontSize: '1.15rem' }}
          >
            Log in
          </Button>
          <Button
            variant={activeTab === 'register' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('register')}
            style={{ minHeight: '48px', fontSize: '1.15rem' }}
          >
            Create account
          </Button>
        </div>

        {authMessage && <p className="info-message">{authMessage}</p>}

        {activeTab === 'login' ? (
          <LoginForm apiBaseUrl={API_BASE_URL} onSuccess={handleLoginSuccess} />
        ) : (
          <RegisterForm apiBaseUrl={API_BASE_URL} onRegistered={handleRegistered} />
        )}

        <Button
          variant="secondary"
          onClick={() => setActiveTab(activeTab === 'login' ? 'register' : 'login')}
          style={{ minHeight: '48px', fontSize: '1.15rem' }}
        >
          {activeTab === 'login' ? 'New here? Create an account' : 'Already registered? Go to login'}
        </Button>

        {currentUser && (
          <div style={{ marginTop: '1rem' }}>
            <Button onClick={handleLogout}>Log out</Button>
          </div>
        )}
      </Card>
    </PageShell>
  );
}

export default App;

