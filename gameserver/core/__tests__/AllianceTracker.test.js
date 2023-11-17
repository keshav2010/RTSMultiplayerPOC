const { AllianceTypes, AllianceTracker } = require('../AllianceTracker');

describe('AllianceTracker', () => {
    let tracker;

    beforeEach(() => {
        tracker = new AllianceTracker();
    });

    test('setAlliance should set the alliance between two players', () => {
        tracker.setAlliance('player1', 'player2', AllianceTypes.ENEMIES);
        expect(tracker.getAlliance('player1', 'player2')).toBe(AllianceTypes.ENEMIES);
    });

    test('getAlliance should return the alliance between two players', () => {
        tracker.setAlliance('player1', 'player2', AllianceTypes.ENEMIES);
        expect(tracker.getAlliance('player1', 'player2')).toBe(AllianceTypes.ENEMIES);
    });
    test('getAlliance should return AllianceTypes.ALLY if the two players are the same', () => {
        expect(tracker.getAlliance('player1', 'player1')).toBe(AllianceTypes.ALLY);
    });

    test('removeEntry should remove the alliance between a player and all other players', () => {
        tracker.setAlliance('player1', 'player2', AllianceTypes.ENEMIES);
        tracker.setAlliance('player1', 'player3', AllianceTypes.ENEMIES);
        tracker.removeEntry('player1');
        expect(tracker.getAlliance('player2', 'player1')).toBe(AllianceTypes.NEUTRAL);
        expect(tracker.getAlliance('player3', 'player1')).toBe(AllianceTypes.NEUTRAL);
    });

    test('setAlliance should set the alliance between two players', () => {
        const tracker = new AllianceTracker();
        tracker.setAlliance('player1', 'player2', AllianceTypes.ENEMIES);
        expect(tracker.allianceMap).toEqual({
            'player1': {'player2': 'E'},
            'player2': {'player1': 'E'}
        });
    });

    test('setAlliance should throw an error if the allianceType is invalid', () => {
        const tracker = new AllianceTracker();
        expect(() => tracker.setAlliance('player1', 'player1', 'invalidType')).toThrow();
    });
    
});