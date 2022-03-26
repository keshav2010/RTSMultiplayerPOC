
const PacketType={
    ByClient:{
        'PLAYER_READY':'1',
        'PLAYER_UNREADY':'2',
        'SOLDIER_CREATE_REQUESTED':'3',
        'SOLDIER_DELETED': '4',
        'SOLDIER_MOVE_REQUESTED': '5',
        'PLAYER_JOINED':'6'
    },
    ByServer:{
        'SOLDIER_KILLED':'7',
        'SOLDIER_MOVE_VALIDATED':'8',
        'GAME_STARTED':'9',
        'SOLDIER_CREATE_ACCEPTED':'10',
        'SOLDIER_CREATE_REJECTED':'11',
        'GAME_STATE_SYNC':'12',
        'PLAYER_LEFT':'13',
        'PLAYER_INIT':'14'
    }
}
module.exports = PacketType;