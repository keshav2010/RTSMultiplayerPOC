const { createMachine, interpret } = require("xstate");
class StateMachine {
    /**
     *
     * @param {Object} machineJSON - the state machine definition object
     * @param {Object} stateActions - object containing functions corresponding to the states
     */
    constructor(machineJSON, stateActions) {
        if(!machineJSON || !stateActions)
            throw new Error("Arguments must be provided");
        this.machine = createMachine(machineJSON);

        let states = Object.keys(this.machine.states);
        states.forEach((state) => {
            if (!stateActions[`${state}`]) {
                throw new Error(`State function for state ${state} is not defined`);
            }
        });

        this.stateActions = stateActions;
        this.currentState = this.machine.initialState.value;
        this.controller = interpret(this.machine)
            .onTransition((state) => {
                this.currentState = state.value;
            })
            .start();
    }
    tick(stateArgumentsObject) {
        this.stateActions[`${this.currentState}`](stateArgumentsObject);
    }
}
module.exports = StateMachine;
