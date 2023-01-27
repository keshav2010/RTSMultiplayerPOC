const StateMachine = require('../StateMachine');

describe('StateMachine', () => {
  let machineJSON, stateActions, stateMachine;

  beforeEach(() => {
    machineJSON = {
      initial: 'idle',
      states: {
        idle: {
          on: {
            START: 'running'
          }
        },
        running: {
          on: {
            PAUSE: 'paused',
            STOP: 'idle'
          }
        },
        paused: {
          on: {
            RESUME: 'running',
            STOP: 'idle'
          }
        }
      }
    };

    stateActions = {
      idle: jest.fn(),
      running: jest.fn(),
      paused: jest.fn()
    };

    stateMachine = new StateMachine(machineJSON, stateActions);
  });

  test('should throw an error if machineJSON or stateActions are not provided', () => {
    expect(() => {
      new StateMachine();
    }).toThrowError('Arguments must be provided');
  });

  test('should throw an error if state function is not defined', () => {
    expect(() => {
      new StateMachine({ initial: 'idle', states: { idle: {} } }, {});
    }).toThrowError('State function for state idle is not defined');
  });

  test('should set the initial state to the value of the initialState', () => {
    expect(stateMachine.currentState).toBe('idle');
  });

  test('should call the state function corresponding to the current state', () => {
    stateMachine.tick({});
    expect(stateActions.idle).toHaveBeenCalled();

    stateMachine.controller.send('START');
    stateMachine.tick({});
    expect(stateActions.running).toHaveBeenCalled();

    stateMachine.controller.send('PAUSE');
    stateMachine.tick({});
    expect(stateActions.paused).toHaveBeenCalled();
  });
});
