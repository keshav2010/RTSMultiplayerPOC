export enum ClientToServerPacketType {
  CLIENT_INIT_REQUESTED = "cir",
  PLAYER_READY = "plr",
  PLAYER_UNREADY = "plur",
  SOLDIER_CREATE_REQUESTED = "slcrreq",
  SPAWN_POINT_REQUESTED = "spwnpntreq",
  SOLDIER_DELETED = "sldel",
  SOLDIER_MOVE_REQUESTED = "slmovreq",
  PLAYER_JOINED = "pljoin",
  SOLDIER_ATTACK_REQUESTED = "sldierattkreq",
  CLIENT_SENT_CHAT = "clientchat",
  SPAWN_POINT_SELECTED = "spwnpntslct",
  SOLDIER_SPAWN_REQUESTED = "unitspwnreq",
}
export enum ServerToClientPacketType {
  NEW_CHAT_MESSAGE = "newcm",
  SOLDIER_KILLED = "sk",
  GAME_STARTED = "gs",
  SOLDIER_CREATE_ACK = "sca",
  SOLDIER_SPAWN_SCHEDULED = "sspwnsch",
  SPAWN_POINT_ACK = "spnpntack",
  SPAWN_POINT_RJCT = "spnpntreject",
  GAME_STATE_SYNC = "gss",
  PLAYER_LEFT = "pl",
  PLAYER_INIT = "pi",
  PLAYER_LOST = "plyrlost",
  SOLDIER_ATTACK_ACK = "saa",
  SOLDIER_ATTACKED = "sh",
  PLAYER_RESOURCE_UPDATED = "pru",
  SOLDIER_POSITION_UPDATED = "spu",
  COUNTDOWN_TIME = "cdwn",
  SOLDIER_STATE_DEBUG = "debug_soldierState",
  
  SOLDIER_SPAWN_REQUEST_UPDATED = "spawn_request_updated",
}

export const PacketType = {
  ByClient: {
    ...ClientToServerPacketType,
  },
  ByServer: {
    ...ServerToClientPacketType,
  },
};
