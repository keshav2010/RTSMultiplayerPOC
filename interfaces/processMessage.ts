export interface ProcessMessage {
  workerId: string;
  type:
    | "SESSION_UPDATED"
    | "SESSION_DESTROYED"
    | "SESSION_CREATED_ACK"
    | "SESSION_CREATE_REQUESTED";
  sessionId: string;
  gameStarted?: boolean;
}
