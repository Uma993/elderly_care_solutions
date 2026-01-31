import React, { useState, useEffect } from 'react';
import Button from './ui/Button.jsx';

export default function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowButton(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) setIsInstalled(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowButton(false);
      setIsInstalled(true);
    }
    setInstallPrompt(null);
  };

  if (!showButton || isInstalled) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <Button variant="secondary" onClick={handleInstall} style={{ minHeight: '44px', fontSize: '1rem' }}>
        Install app (add to desktop)
      </Button>
    </div>
  );
}
