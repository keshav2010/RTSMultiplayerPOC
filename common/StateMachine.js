const { createMachine, interpret } =  require('xstate');
class StateMachine
{
    constructor(machineJSON) {
        this.machine = createMachine(machineJSON);
        this.currentState = this.machine.initialState.value;
        this.controller = interpret(this.machine).onTransition((state)=>{
            let stateVal = state.value;
            this.currentState = stateVal;
        }).start()
    }
}
module.exports = StateMachine;