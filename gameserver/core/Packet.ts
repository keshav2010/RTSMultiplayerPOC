import {
  ClientToServerPacketType,
  ServerToClientPacketType,
} from "../../common/PacketType";

export class Packet {
  type: ClientToServerPacketType | ServerToClientPacketType;
  data: any;
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
    data: any,
    StateSpecificPacket?: string[]
  ) {
    this.type = type;
    this.data = data;
    this.StateSpecificPacket = StateSpecificPacket;
  }
  updateStateManager(stateManager: any) {
    this.stateUpdator(this.type, stateManager, this.data);
  }
}
