export enum CoreErrorCodes {
  REMOVE_ITEM_FAILED = "remove_scene_item_failed",
  ADD_ITEM_FAILED = "add_scene_item_failed",
  MAX_SESSIONS_REACHED = "MAX_SESSIONS_REACHED",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}
export class CoreError extends Error {
  code: CoreErrorCodes;
  statusCode: number;
  message: string;
  constructor(code: CoreErrorCodes, statusCode: number, message: string) {
    super(code.toString());
    this.code = code;
    this.statusCode = statusCode;
    this.message = message;
  }
}
