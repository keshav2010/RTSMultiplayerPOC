export interface ServerToClientEvents {
  [key: string]: (...arg: any) => any;
}
export interface ClientToServerEvents {
  [key: string]: (...arg: any) => any;
}
export interface InterServerEvents {
  tick: (payload: string) => void;
}

export interface SocketData {
  name: string;
  age: number;
}
