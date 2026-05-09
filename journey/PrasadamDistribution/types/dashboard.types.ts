/**
 * Prasadam Distribution Dashboard Types
 * Unified dashboard for multi-team prasadam tracking
 */

// Stages in the dashboard flow
export type DashboardStage =
  | 'planned'
  | 'cooked'
  | 'stored'
  | 'staging'
  | 'refill_station_1'
  | 'refill_station_2'
  | 'refill_station_3'
  | 'served'
  | 'left_over';

// All stages as const array
export const ALL_STAGES: DashboardStage[] = [
  'planned',
  'cooked',
  'stored',
  'staging',
  'refill_station_1',
  'refill_station_2',
  'refill_station_3',
  'served',
  'left_over',
];

// Movement rules - which stages can move to which
export const MOVEMENT_RULES: Record<DashboardStage, DashboardStage[]> = {
  planned: [], // Planned is static reference, no movements allowed
  cooked: ['stored'],
  stored: ['staging'],
  staging: ['refill_station_1', 'refill_station_2', 'refill_station_3'],
  refill_station_1: ['served'],
  refill_station_2: ['served'],
  refill_station_3: ['served'],
  served: ['left_over'],
  left_over: [],
};

// Reverse movement rules - for correcting mistakes (long press)
export const REVERSE_MOVEMENT_RULES: Record<DashboardStage, DashboardStage[]> = {
  planned: [],
  cooked: ['planned'],
  stored: ['cooked', 'left_over'],
  staging: ['stored', 'left_over'],
  refill_station_1: ['staging', 'left_over'],
  refill_station_2: ['staging', 'left_over'],
  refill_station_3: ['staging', 'left_over'],
  served: ['refill_station_1', 'refill_station_2', 'refill_station_3', 'left_over'],
  left_over: [],
};

// Display names for stages
export const STAGE_DISPLAY_NAMES: Record<DashboardStage, string> = {
  planned: 'Planned',
  cooked: 'Cooked',
  stored: 'Stored',
  staging: 'Staging',
  refill_station_1: 'Refill Stn 1',
  refill_station_2: 'Refill Stn 2',
  refill_station_3: 'Refill Stn 3',
  served: 'Buffet Lanes',
  left_over: 'Left Over',
};

// Team view configurations
export type TeamView = 'all' | 'team1_kitchen' | 'team2_staging' | 'team3_serving';

export const TEAM_VIEW_CONFIGS: Record<TeamView, { name: string; shortName: string; stages: DashboardStage[] }> = {
  all: {
    name: 'All Stages',
    shortName: 'All',
    stages: ALL_STAGES,
  },
  team1_kitchen: {
    name: 'Team 1 (Kitchen)',
    shortName: 'Kitchen',
    stages: ['planned', 'cooked', 'served', 'left_over'], // Kitchen view shows 'served' as "Distributed"
  },
  team2_staging: {
    name: 'Team 2 (Staging)',
    shortName: 'Staging',
    stages: ['stored', 'staging', 'refill_station_1', 'refill_station_2', 'refill_station_3'],
  },
  team3_serving: {
    name: 'Team 3 (Serving)',
    shortName: 'Serving',
    stages: ['refill_station_1', 'refill_station_2', 'refill_station_3', 'served', 'left_over'],
  },
};

// Dashboard item
export interface DashboardItem {
  item_id: string;
  name: string;
  icon?: string;
  color?: string;
  low_qty_threshold: number;
  planned_qty: number;
  cooked_qty: number;
  distributed_qty: number;
  stored_qty: number;
  staging_qty: number;
  refill_station_1_qty: number;
  refill_station_2_qty: number;
  refill_station_3_qty: number;
  served_qty: number;
  left_over_qty: number;
  cooked_to_stored_moved?: number; // Cumulative: total trays ever moved from Cooked → Stored
  // Percentage calculations
  devotees_percentage?: number; // (Cooked / Expected Devotees) * 100
  trays_percentage?: number; // (Distributed / Cooked) * 100
}

// Get quantity for a stage
export const getStageQuantity = (item: DashboardItem, stage: DashboardStage): number => {
  const qtyMap: Record<DashboardStage, keyof DashboardItem> = {
    planned: 'planned_qty',
    cooked: 'cooked_qty',
    stored: 'stored_qty',
    staging: 'staging_qty',
    refill_station_1: 'refill_station_1_qty',
    refill_station_2: 'refill_station_2_qty',
    refill_station_3: 'refill_station_3_qty',
    served: 'served_qty',
    left_over: 'left_over_qty',
  };
  return (item[qtyMap[stage]] as number) || 0;
};

// Generate a consistent color from a string
function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colors = [
    '#FF9800', '#FFB74D', '#FFA726', '#FFC107',
    '#8D6E63', '#A1887F', '#D4A574', '#C9956C',
    '#66BB6A', '#81C784', '#9CCC65', '#AED581',
    '#42A5F5', '#64B5F6', '#90CAF9', '#9FA8DA',
    '#9FA8DA', '#B39DDB', '#CE93D8', '#BA68C8',
    '#F06292', '#F48FB1', '#26A69A', '#80CBC4',
    '#5C6BC0', '#7986CB',
  ];

  return colors[Math.abs(hash) % colors.length];
}

// Predefined colors for common items
export const ITEM_COLORS: Record<string, string> = {
  'dal': '#FF9800',
  'rice': '#8D6E63',
  'chapati': '#D4A574',
  'curry': '#FFB74D',
  'salad': '#66BB6A',
  'sweet': '#F06292',
  'juice': '#42A5F5',
};

// Get item color
export const getItemColor = (item: DashboardItem): string => {
  if (item.color) return item.color;

  const lowerItemId = item.item_id.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const lowerName = item.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

  for (const [key, color] of Object.entries(ITEM_COLORS)) {
    if (lowerItemId.includes(key) || lowerName.includes(key)) {
      return color;
    }
  }

  return generateColorFromString(item.item_id);
};

// Movement record
export interface MovementRecord {
  movement_id: string;
  item_id: string;
  item_name: string;
  meal_id: string;
  meal_instance: string;
  from_stage: DashboardStage;
  to_stage: DashboardStage;
  quantity: number;
  moved_by: string;
  moved_by_name?: string;
  timestamp: string;
  reason?: string;
  is_manual_edit?: boolean;
}

// Edit reason options
export const EDIT_REASONS = [
  'Correction',
  'Spillage',
  'Quality Issue',
  'Excess Inventory',
  'Other',
] as const;
export type EditReason = typeof EDIT_REASONS[number];

// Dashboard settings
export interface DashboardSettings {
  event_id: string;
  refill_stations: {
    enabled: boolean;
    count: number;
    names: string[];
  };
  serving_lanes: {
    count: number;
    names: string[];
  };
  low_qty_thresholds: Record<string, number>;
  default_low_qty_threshold: number;
  tray_multiple: number;
  edit_pin?: string;
  edit_pin_enabled: boolean;
}

// Stage themes
export interface StageTheme {
  background: string;
  color: string;
  borderColor: string;
  iconColor: string;
}

export const STAGE_THEMES: Record<DashboardStage, StageTheme> = {
  planned: {
    background: '#F5F5F5',
    color: '#333333',
    borderColor: '#E0E0E0',
    iconColor: '#9E9E9E',
  },
  cooked: {
    background: '#FFF8E1',
    color: '#F57C00',
    borderColor: '#FFECB3',
    iconColor: '#FFA000',
  },
  stored: {
    background: '#E8F5E9',
    color: '#2E7D32',
    borderColor: '#C8E6C9',
    iconColor: '#4CAF50',
  },
  staging: {
    background: '#F3E5F5',
    color: '#7B1FA2',
    borderColor: '#E1BEE7',
    iconColor: '#9C27B0',
  },
  refill_station_1: {
    background: '#E3F2FD',
    color: '#1976D2',
    borderColor: '#BBDEFB',
    iconColor: '#2196F3',
  },
  refill_station_2: {
    background: '#E3F2FD',
    color: '#1976D2',
    borderColor: '#BBDEFB',
    iconColor: '#2196F3',
  },
  refill_station_3: {
    background: '#E3F2FD',
    color: '#1976D2',
    borderColor: '#BBDEFB',
    iconColor: '#2196F3',
  },
  served: {
    background: '#FFF8E1',
    color: '#F57C00',
    borderColor: '#FFECB3',
    iconColor: '#FFA000',
  },
  left_over: {
    background: '#FFEBEE',
    color: '#C62828',
    borderColor: '#FFCDD2',
    iconColor: '#EF5350',
  },
};
