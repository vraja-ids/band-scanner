export interface LoginScannerRequest {
  tagId?: string | null;
  authToken: string;
  eventId: string;
}

export interface ScannerLoginResponse {
  memberId: string;
  legalName: string;
  spiritualName?: string;
  memberPermissions?: string[];
  scansInThisEvent?: string[];
}

export interface GetEventsResponse {
  events: Array<{
    eventId: string;
    eventName: string;
  }>;
}

export interface GenerateVerificationCodeRequest {
  apiVersion: string; // "1.8"
  emailAddress: string;
}

export interface GenerateVerificationCodeResponse {
  isSuccess: boolean;
  message?: string;
  authToken?: string;
}

export interface ValidateVerificationCodeRequest {
  verificationCode: string; // 6-digit
  authToken?: string;
  apiVersion: string; // "1.8"
  eventId?: string;
}

export interface ValidateVerificationCodeResponse {
  isSuccess: boolean;
  displayMessage?: string;
  authToken?: string;
}

export interface GetProfileRequest {
  authToken: string;
  apiVersion: string;
  locale: string; // en, ru, es
}

export interface GetProfileResponse {
  externalMemberId: string;
  emailAddress: string;
  legalName?: string;
  spiritualName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  city?: string;
  state?: string;
  country?: string;
  profileImageUrl?: string;
  authToken?: string;
}


