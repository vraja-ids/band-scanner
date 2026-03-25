/**
 * Event Configuration System
 * Makes the app event-agnostic by driving behavior through configuration
 */

export interface EventConfig {
  id: string;
  name: string;
  displayName: string;
  primaryColor: string;
  features: {
    hasInflowComparison: boolean;
    hasActivityStats: boolean;
    hasBusRedemption: boolean;
    hasPrasadamRedemption: boolean;
    hasWalkinCheckin: boolean;
  };
  schedule: {
    startTime: string; // "16:30" for 4:30 PM
    endTime: string;   // "23:30" for 11:30 PM
  };
  istOffset: number;     // IST offset in hours (5.5 for India)
  googleSheets?: {
    sheetId?: string;
    apiKey?: string;
    range?: string;
  };
  activityName: string;   // Activity name for stats tracking
  redemptionTypes?: ('bus' | 'prasadam' | 'entrance-gate')[];
}

export const EVENTS: Record<string, EventConfig> = {
  RISHIKESH_KIRTAN_FEST: {
    id: 'RishikeshKirtanFest2026',
    name: 'RishikeshKirtanFest',
    displayName: 'Rishikesh Kirtan Fest 2026',
    primaryColor: '#4CAF50',
    features: {
      hasInflowComparison: true,
      hasActivityStats: true,
      hasBusRedemption: false,
      hasPrasadamRedemption: false,
      hasWalkinCheckin: true,
    },
    schedule: {
      startTime: '16:30', // 4:30 PM IST
      endTime: '23:30',   // 11:30 PM IST
    },
    istOffset: 5.5,
    googleSheets: {
      sheetId: '1OrrbYWPnTcup30nI3vh0mEDRzi9fztrEvhBwuE_cxBc',
      apiKey: 'AIzaSyCXzeWuFPxmWsiXOE1Kl84XX9GTFUU1gVI',
      range: 'Sheet1!A:E',
    },
    activityName: 'entrance-gate',
    redemptionTypes: ['entrance-gate'],
  },
  // Future events can be added here
  // EXAMPLE_FUTURE_EVENT: {
  //   id: 'FutureEvent2026',
  //   name: 'FutureEvent',
  //   displayName: 'Future Event 2026',
  //   primaryColor: '#2196F3',
  //   features: {
  //     hasInflowComparison: true,
  //     hasActivityStats: false,
  //     hasBusRedemption: true,
  //     hasPrasadamRedemption: true,
  //     hasWalkinCheckin: false,
  //   },
  //   schedule: { startTime: '10:00', endTime: '22:00' },
  //   istOffset: 5.5,
  //   activityName: 'entrance-gate',
  //   redemptionTypes: ['bus', 'prasadam'],
  // },
};

/**
 * Get event config by event ID
 */
export const getEventConfigById = (eventId: string): EventConfig | undefined => {
  return Object.values(EVENTS).find(event => event.id === eventId);
};

/**
 * Get event config by event name (for legacy support)
 */
export const getEventConfigByName = (eventName: string): EventConfig | undefined => {
  return Object.values(EVENTS).find(event => event.name === eventName);
};

/**
 * Get current selected event config
 */
export const getCurrentEventConfig = async (): Promise<EventConfig | null> => {
  try {
    const { getString } = require('../storage/Session');
    const eventId = await getString('selectedEventId');

    if (!eventId) {
      return null;
    }

    return getEventConfigById(eventId) || null;
  } catch (error) {
    console.error('Error getting current event config:', error);
    return null;
  }
};
