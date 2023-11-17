import { createMachine, interpret } from "xstate";

export class StateMachine {
  machine: any;
  stateActions: any;
  currentState: any;
  controller: any;
  /**
   *
   * @param {Object} machineJSON - the state machine definition object
   * @param {Object} stateActions - object containing functions corresponding to the states
   */
  constructor(machineJSON: any, stateActions: any) {
    if (!machineJSON || !stateActions)
      throw new Error("Arguments must be provided");
    this.machine = createMachine(machineJSON);

    let states = Object.keys(this.machine.states);
    states.forEach((state) => {
      if (!stateActions[`${state}`]) {
        console.log(stateActions)
        throw new Error(`State function for state ${state} is not defined`);

      }
    });

    this.stateActions = stateActions;
    this.currentState = this.machine.initialState.value;
    this.controller = interpret(this.machine)
      .onTransition((state: any) => {
        this.currentState = state.value;
      })
      .start();
  }
  tick(stateArgumentsObject: any) {
    this.stateActions[`${this.currentState}`](stateArgumentsObject);
  }
}
