export interface RegisterTagRequest {
  apiVersion: string;
  tagId: string;
  memberId: string;
  eventId?: string;
}

export interface RegistrationStatusRequest {
  tagId: string;
}


