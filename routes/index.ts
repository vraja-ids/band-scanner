export const Routes = {
  LanguageSelection: 'LanguageSelection',
  Login: 'Login',
  LoginEmail: 'LoginEmail',
  LoginOtp: 'LoginOtp',
  LoginSplash: 'LoginSplash',
  EventSelection: 'EventSelection',
  Home: 'Home',
  Scanner: 'Scanner',
  RegisterTag: 'RegisterTag',
  MealScan: 'MealScan',
  ActivityStats: 'ActivityStats',
  DaypassActivityStats: 'DaypassActivityStats',
  GiftApproval: 'GiftApproval',
  ServiceApproval: 'ServiceApproval',
  RedeemBus: 'RedeemBus',
  RedeemPrasadam: 'RedeemPrasadam',
  RedeemSuccess: 'RedeemSuccess',
  RedeemBusScan: 'RedeemBusScan',
  RedeemPrasadamScan: 'RedeemPrasadamScan',
  RishikeshKirtanScan: 'RishikeshKirtanScan',
  RishikeshKirtanRedeemSuccess: 'RishikeshKirtanRedeemSuccess',
  RishikeshKirtanActivityStats: 'RishikeshKirtanActivityStats',
  InflowComparison: 'InflowComparison',
} as const;

export type RouteName = typeof Routes[keyof typeof Routes];

export interface LoginParams {
  tag?: { id: string };
}

export interface ScannerParams {
  screen?: RouteName;
  location?: string | number | Array<string | number>;
  message?: string;
  tag?: { id: string };
  type?: 'bus' | 'prasadam';
  busNumber?: string;
  prasadamTime?: string;
  lane?: string;
}

export interface RegisterTagParams {
  tag: { id: string };
}

export interface MealScanParams {
  tag: { id: string };
  location?: string | number | Array<string | number>;
}

export interface GiftApprovalParams {
  tag: { id: string };
}

export interface ServiceApprovalParams {
  tag: { id: string };
}

export interface ActivityStatsParams {
  location?: string | number | Array<string | number>;
}

export interface DaypassParams {
  dayPassNumber: string;
}

export default Routes;


