
class ClientStateManager
{
    constructor(clientSocket)
    {
        this.socket = clientSocket;
        this.PlayerMap = new Map();
    }
}
module.exports = ClientStateManager;