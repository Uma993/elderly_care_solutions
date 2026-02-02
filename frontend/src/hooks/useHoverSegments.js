/**
 * useHoverSegments – state machine for hero card hover/active segment.
 *
 * States: no_hover | hovering_tasks | hovering_medicines | hovering_voice | hovering_sos | hovering_overview (family)
 * Transitions: mouseEnter(card) -> hovering_X; mouseLeave -> no_hover; focus(card) -> hovering_X (touch); blur -> no_hover
 * Behavior: highlight active card (CSS), show tooltip. Touch: use onFocus/onBlur so one tap highlights/shows tooltip.
 */

import { useState, useCallback } from 'react';

export function useHoverSegments() {
  const [hoverSegment, setHoverSegment] = useState(null);

  const onEnter = useCallback((segment) => {
    setHoverSegment(segment);
  }, []);

  const onLeave = useCallback(() => {
    setHoverSegment(null);
  }, []);

  return { hoverSegment, onEnter, onLeave };
}

/** Tooltip copy per segment (elder) */
export const ELDER_SEGMENT_TOOLTIPS = {
  overview: 'Home overview – voice, wellbeing, reminders',
  profile: 'View and edit your health profile',
  tasks: 'View today\'s tasks and timeline',
  medicines: 'View medication reminders',
  routine: 'View routine summary and trends',
  calendar: 'View calendar and daily timeline',
  timeline: 'View day strip and timeline',
  weather: 'Check today\'s weather and walking tips',
  voice: 'Request help with voice',
  sos: 'SOS Emergency – get help fast'
};

/** Tooltip copy per segment (family) */
export const FAMILY_SEGMENT_TOOLTIPS = {
  sos: 'View SOS alerts from elders',
  inactivity: 'View inactivity status and remind to check in',
  medicines: 'View and manage elder medicines',
  tasks: 'View and manage elder tasks',
  routine: 'View elder routine summary and trends',
  voice: 'Use voice assistant',
  overview: 'View elder overview and link elder',
  calendar: 'View elder calendar and timeline',
  timeline: 'View elder day strip and timeline'
};
