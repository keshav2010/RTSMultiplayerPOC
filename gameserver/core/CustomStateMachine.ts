import { createMachine, interpret } from "xstate";

export interface IMachineJSON {
  id: string;
  description?: string;
  initial?: string;
  states: {
    [key: string]: any;
  };
}

export interface IStateActions {
  [key: string]: (...args: any) => void;
}

export class CustomStateMachine<TickArg = any> {
  machine: any;
  stateActions: IStateActions;
  currentState: string;
  controller: any;
  /**
   *
   * @param {Object} machineJSON - the state machine definition object
   * @param {Object} stateActions - object containing functions corresponding to the states
   */
  constructor(machineJSON: IMachineJSON, stateActions: IStateActions) {
    if (!machineJSON || !stateActions)
      throw new Error("Arguments must be provided");
    this.machine = createMachine(machineJSON);

    let states = Object.keys(this.machine.states);
    states.forEach((state) => {
      if (!stateActions[`${state}`]) {
        console.log(stateActions);
        throw new Error(`State function for state ${state} is not defined`);
      }
    });

    this.stateActions = stateActions;
    this.currentState = this.machine.initialState.value as string;
    this.controller = interpret(this.machine)
      .onTransition((state: any) => {
        this.currentState = state.value;
      })
      .start();
  }
  tick(stateArgumentsObject: TickArg) {
    this.stateActions[`${this.currentState}`](stateArgumentsObject);
  }
}
