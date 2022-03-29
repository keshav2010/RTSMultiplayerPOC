
const PacketType={
    ByClient:{
        'PLAYER_READY':'1',
        'PLAYER_UNREADY':'2',
        'SOLDIER_CREATE_REQUESTED':'3',
        'SOLDIER_DELETED': '4',
        'SOLDIER_MOVE_REQUESTED': '5',
        'PLAYER_JOINED':'6',
        'SOLDIER_ATTACK_REQUESTED': '7',
    },
    ByServer:{
        'SOLDIER_KILLED':'7',
        'SOLDIER_MOVE':'8',
        'GAME_STARTED':'9',
        'SOLDIER_CREATE_ACK':'10',

        'GAME_STATE_SYNC':'11',

        'PLAYER_LEFT':'13',
        'PLAYER_INIT':'14',

        'SOLDIER_ATTACK_ACK':'15',
        'SOLDIER_HIT':'16'
    }
}
module.exports = PacketType;