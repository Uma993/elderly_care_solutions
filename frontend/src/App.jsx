import React, { useState, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { playReminderBell } from './utils/reminderBell.js';
import { API_BASE_URL } from './api';
import LoginForm from './components/LoginForm.jsx';
import RegisterForm from './components/RegisterForm.jsx';
import PageShell from './components/ui/PageShell.jsx';
import Card from './components/ui/Card.jsx';
import Button from './components/ui/Button.jsx';
import Tag from './components/ui/Tag.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';
import DashboardGrid from './components/DashboardGrid.jsx';
import IndexDashboard from './components/IndexDashboard.jsx';
import PWAInstall from './components/PWAInstall.jsx';
import SosAlertPage from './pages/SosAlertPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import SosAlertsPage from './pages/SosAlertsPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import MedicinesPage from './pages/MedicinesPage.jsx';
import VoiceAssistantPage from './pages/VoiceAssistantPage.jsx';
import SosPage from './pages/SosPage.jsx';
import RoutinePage from './pages/RoutinePage.jsx';
import ElderOverviewPage from './pages/ElderOverviewPage.jsx';
import ElderProfilePage from './pages/ElderProfilePage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import TimelinePage from './pages/TimelinePage.jsx';
import InactivityPage from './pages/InactivityPage.jsx';
import WeatherPage from './pages/WeatherPage.jsx';

function MainView() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authMessage, setAuthMessage] = useState('');
  const [showAddElderModal, setShowAddElderModal] = useState(false);

  useEffect(() => {
    if (location.search.includes('from=reminder')) {
      playReminderBell();
      const params = new URLSearchParams(location.search);
      params.delete('from');
      const next = params.toString() ? `${location.pathname}?${params}` : location.pathname;
      navigate(next, { replace: true });
    }
  }, [location.search, location.pathname, navigate]);

  const handleLoginSuccess = (user, message, jwt) => {
    setCurrentUser(user);
    setToken(jwt || null);
    setAuthMessage(message || '');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setToken(null);
    setAuthMessage('');
    setActiveTab('login');
  };

  const handleRegistered = (data) => {
    if (data?.user?.role === 'family') {
      handleLoginSuccess(data.user, data.message, data.token);
      setShowAddElderModal(true);
    } else {
      setAuthMessage(data?.message || 'Registration successful. You can now log in.');
      setActiveTab('login');
    }
  };

  const shellClass = currentUser ? 'app-shell app-shell--dashboard' : 'app-shell app-shell--auth';

  if (currentUser) {
    const subtitle = currentUser.role === 'elderly'
      ? 'Gentle reminders and quick help, all in one place.'
      : 'Stay close, even from far away. Monitor and support with ease.';
    const actions = currentUser.role === 'elderly' ? (
      <Tag tone="success">Logged in as Elderly User</Tag>
    ) : (
      <Tag tone="warning">
        {currentUser.relation ? `Logged in as ${currentUser.relation}` : 'Logged in as Family Member'}
      </Tag>
    );
    const outletContext = { currentUser, token, onLogout: handleLogout };
    return (
      <div className={shellClass}>
        <div className="app-shell-content">
          <PageShell title="Elderly Care" subtitle={subtitle} actions={actions}>
            <div className="card-warm-blobs">
              <Card style={{ maxWidth: 'none' }}>
                <DashboardLayout
                  currentUser={currentUser}
                  token={token}
                  onLogout={handleLogout}
                  showAddElderModal={showAddElderModal}
                  setShowAddElderModal={setShowAddElderModal}
                >
                  <Outlet context={outletContext} />
                </DashboardLayout>
              </Card>
            </div>
          </PageShell>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="app-shell-content">
        <PageShell
          isAuthPage
          authNavLabel="Login / Signup"
        >
          <div className="card-warm-blobs">
            <Card variant="warm">
              <PWAInstall />
              <h2 className="auth-welcome-title">Welcome back!</h2>
              <p className="auth-welcome-subtitle">Sign in to stay connected.</p>

              {authMessage && <p className="info-message">{authMessage}</p>}

              {activeTab === 'login' ? (
                <LoginForm apiBaseUrl={API_BASE_URL} onSuccess={handleLoginSuccess} />
              ) : (
                <>
                  <RegisterForm apiBaseUrl={API_BASE_URL} onRegistered={handleRegistered} />
                  <p className="auth-switch">
                    Already registered?{' '}
                    <button type="button" className="auth-link" onClick={() => setActiveTab('login')}>
                      Go to login
                    </button>
                  </p>
                </>
              )}

              {activeTab === 'login' && (
                <p className="auth-switch">
                  Don&apos;t have an account?{' '}
                  <button type="button" className="auth-link" onClick={() => setActiveTab('register')}>
                    Sign Up
                  </button>
                </p>
              )}

              {currentUser && (
                <div style={{ marginTop: '1rem' }}>
                  <Button onClick={handleLogout}>Log out</Button>
                </div>
              )}
            </Card>
          </div>
        </PageShell>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/sos-alert" element={<SosAlertPage />} />
      <Route path="/" element={<MainView />}>
        <Route index element={<IndexDashboard />} />
        <Route path="wellbeing-check" element={<IndexDashboard />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="medicines" element={<MedicinesPage />} />
        <Route path="voice-assistant" element={<VoiceAssistantPage />} />
        <Route path="sos" element={<SosPage />} />
        <Route path="sos-alerts" element={<SosAlertsPage />} />
        <Route path="inactivity" element={<InactivityPage />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="home" element={<ElderOverviewPage />} />
        <Route path="profile" element={<ElderProfilePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="timeline" element={<TimelinePage />} />
        <Route path="routine" element={<RoutinePage />} />
        <Route path="weather" element={<WeatherPage />} />
      </Route>
    </Routes>
  );
}

export default App;

