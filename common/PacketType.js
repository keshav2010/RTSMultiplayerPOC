
const PacketType={
    ByClient:{
        'PLAYER_READY':'plr',
        'PLAYER_UNREADY':'plur',
        'SOLDIER_CREATE_REQUESTED':'slcrreq',
        'SOLDIER_DELETED': 'sldel',
        'SOLDIER_MOVE_REQUESTED': 'slmovreq',
        'PLAYER_JOINED':'pljoin',
        'SOLDIER_ATTACK_REQUESTED': 'sldierattkreq',
        'CLIENT_SENT_CHAT':'clientchat'
    },
    ByServer:{
        'NEW_CHAT_MESSAGE':'newcm',
        'SOLDIER_KILLED':'sk',
        'GAME_STARTED':'gs',
        'SOLDIER_CREATE_ACK':'sca',

        'GAME_STATE_SYNC':'gss',

        'PLAYER_LEFT':'pl',
        'PLAYER_INIT':'pi',

        'SOLDIER_ATTACK_ACK':'saa',
        'SOLDIER_ATTACKED':'sh',

        'PLAYER_RESOURCE_UPDATED':'pru',
        'SOLDIER_POSITION_UPDATED':'spu',
    }
}
module.exports = PacketType;