import { CoreErrorCodes } from "../config";

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
