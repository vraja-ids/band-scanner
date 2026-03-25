import { useState, useEffect } from 'react';
import { getString } from '../storage/Session';
import { EVENTS, EventConfig, getEventConfigById } from '../config/events';

/**
 * Hook to access the current event configuration
 * Returns null if no event is selected
 */
export const useEventConfig = (): EventConfig | null => {
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);

  useEffect(() => {
    const loadEventConfig = async () => {
      try {
        const eventId = await getString('selectedEventId');

        if (!eventId) {
          console.log('[useEventConfig] No event selected');
          setEventConfig(null);
          return;
        }

        const config = getEventConfigById(eventId);

        if (!config) {
          console.warn(`[useEventConfig] No config found for event: ${eventId}`);
          setEventConfig(null);
          return;
        }

        console.log(`[useEventConfig] Loaded config for: ${config.displayName}`);
        setEventConfig(config);
      } catch (error) {
        console.error('[useEventConfig] Error loading event config:', error);
        setEventConfig(null);
      }
    };

    loadEventConfig();
  }, []); // Run once on mount

  return eventConfig;
};

/**
 * Hook to get event config by ID (useful for testing or specific scenarios)
 */
export const useEventConfigById = (eventId: string): EventConfig | undefined => {
  return getEventConfigById(eventId);
};

export default useEventConfig;
