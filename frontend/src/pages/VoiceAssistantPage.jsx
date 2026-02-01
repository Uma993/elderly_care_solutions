import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';
import VoiceAssistant from '../components/VoiceAssistant.jsx';
import WellbeingCheck from '../components/WellbeingCheck.jsx';
import { colors } from '../design/tokens';

function VoiceAssistantPage() {
  const { currentUser, token } = useOutletContext();
  const [showWellbeingCheck, setShowWellbeingCheck] = useState(false);

  if (!currentUser) return null;

  return (
    <div>
      <Link
        to="/"
        style={{
          display: 'inline-block',
          marginBottom: '1rem',
          fontSize: '1rem',
          color: colors.primary,
          textDecoration: 'none',
          fontWeight: 500
        }}
      >
        Back to Dashboard
      </Link>
      {showWellbeingCheck && (
        <WellbeingCheck
          token={token}
          onClose={() => setShowWellbeingCheck(false)}
          onSubmitted={() => {}}
        />
      )}
      <section style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, fontSize: '1.2rem' }}>Voice assistant</h3>
        <p style={{ marginTop: '0.2rem', marginBottom: '0.5rem', color: colors.textMuted, fontSize: '0.95rem' }}>
          {currentUser.role === 'elderly'
            ? 'Hold the mic and ask about your medicines, tasks, or say "I need help" for SOS.'
            : 'Hold the mic to ask about your elder\'s medicines and tasks, or get quick help.'}
        </p>
        <VoiceAssistant token={token} onAction={() => {}} />
      </section>
      {currentUser.role === 'elderly' && (
        <section style={{ marginBottom: '1.5rem' }}>
          <Button
            variant="secondary"
            onClick={() => setShowWellbeingCheck(true)}
            style={{ minHeight: '44px', fontSize: '1rem' }}
          >
            How are you feeling?
          </Button>
        </section>
      )}
    </div>
  );
}

export default VoiceAssistantPage;
