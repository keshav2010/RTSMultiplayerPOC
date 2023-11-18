import { Socket } from "socket.io";
import {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../../interfaces/socket";
import {
  ClientToServerPacketType,
  ServerToClientPacketType,
} from "../../common/PacketType";

export class Packet {
  //socketio's io reference
  static io: any;
  type: ClientToServerPacketType | ServerToClientPacketType;
  data: any;
  socket: Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  stateUpdator: any;
  StateSpecificPacket?: string[];

  /**
   * @summary Create A Packet, register a callback that gets executed.
   * @param {string} type
   * @param {Object} socket
   * @param {function} packetAction
   * @param {array} StateSpecificPacket
   */
  constructor(
    type: ClientToServerPacketType | ServerToClientPacketType,
    socket: Socket<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >,
    data: any,
    packetAction: any,
    StateSpecificPacket?: string[]
  ) {
    this.type = type;
    this.data = data;
    this.socket = socket;
    this.stateUpdator = packetAction;
    this.StateSpecificPacket = StateSpecificPacket;
  }
  updateStateManager(stateManager: any) {
    //if state-specific-packet array is provided, this packet must only update serverstate
    //for when particular state mentioned in array is active.
    if (this.StateSpecificPacket && this.StateSpecificPacket.length > 0) {
      if (
        this.StateSpecificPacket.includes(
          stateManager.stateMachine.currentState
        )
      ) {
        this.stateUpdator(
          this.type,
          this.socket,
          Packet.io,
          stateManager,
          this.data
        );
      }
    } else
      this.stateUpdator(
        this.type,
        this.socket,
        Packet.io,
        stateManager,
        this.data
      );
  }
}
