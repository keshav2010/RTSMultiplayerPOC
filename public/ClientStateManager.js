
class ClientStateManager
{
    constructor(clientSocket)
    {
        this.socket = clientSocket;
        this.playerId;
        this.PlayerMap = new Map();
    }
}
module.exports = ClientStateManager;