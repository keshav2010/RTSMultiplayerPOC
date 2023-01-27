const Packet = require('../Packet');

describe('Packet', () => {
    let packet, socket, packetAction, stateManager;

    beforeEach(() => {
        socket = { id: '123' };
        packetAction = jest.fn();
        stateManager = { stateMachine: { currentState: 'state1' } };
        packet = new Packet('type1', socket, { prop1: 'val1' }, packetAction);
    });

    test('should have correct properties', () => {
        expect(packet.type).toBe('type1');
        expect(packet.socket).toBe(socket);
        expect(packet.data).toEqual({ prop1: 'val1' });
        expect(packet.stateUpdator).toBe(packetAction);
    });

    test('should call packetAction with correct arguments', () => {
        packet.updateStateManager(stateManager);
        expect(packetAction).toHaveBeenCalledWith('type1', socket, Packet.io, stateManager, { prop1: 'val1' });
    });

    test('should only update state when current state is in StateSpecificPacket', () => {
        packet = new Packet('type1', socket, { prop1: 'val1' }, packetAction, ['state1']);
        packet.updateStateManager(stateManager);
        expect(packetAction).toHaveBeenCalled();

        packetAction.mockClear();
        stateManager.stateMachine.currentState = 'state2';
        packet.updateStateManager(stateManager);
        expect(packetAction).not.toHaveBeenCalled();
    });
});
