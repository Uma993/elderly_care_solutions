/**
 * useActionState – small state machine for async actions (SOS, wellbeing, voice, add reminder, link elder).
 *
 * States: idle | pending | success | error
 * Transitions:
 *   - User click -> setPending() -> pending
 *   - API returns ok -> setSuccess() -> success (optional auto-reset to idle after timeout)
 *   - API fails -> setError(message) -> error
 *   - reset() -> idle
 *
 * Flows documented in plan:
 *   - SOS: idle -> pending (sending) -> success | error -> idle
 *   - Wellbeing submit: idle -> pending (submitting) -> success | error -> idle
 *   - Voice assistant: idle -> pending (listening/thinking) -> success | error -> idle
 *   - Add reminder: idle -> pending -> success | error -> idle
 *   - Link elder: idle -> pending -> success | error -> idle
 */

import { useState, useCallback } from 'react';

export const ACTION_STATUS = Object.freeze({
  IDLE: 'idle',
  PENDING: 'pending',
  SUCCESS: 'success',
  ERROR: 'error'
});

export function useActionState(options = {}) {
  const { autoResetMs = 3000 } = options;
  const [status, setStatus] = useState(ACTION_STATUS.IDLE);
  const [error, setErrorState] = useState('');

  const reset = useCallback(() => {
    setStatus(ACTION_STATUS.IDLE);
    setErrorState('');
  }, []);

  const setPending = useCallback(() => {
    setStatus(ACTION_STATUS.PENDING);
    setErrorState('');
  }, []);

  const setSuccess = useCallback(() => {
    setStatus(ACTION_STATUS.SUCCESS);
    setErrorState('');
    if (autoResetMs > 0) {
      setTimeout(reset, autoResetMs);
    }
  }, [autoResetMs, reset]);

  const setError = useCallback((message = 'Something went wrong') => {
    setStatus(ACTION_STATUS.ERROR);
    setErrorState(message);
  }, []);

  return {
    status,
    error,
    setPending,
    setSuccess,
    setError,
    reset
  };
}
