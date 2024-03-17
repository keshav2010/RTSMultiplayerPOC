import { Room, Client } from "@colyseus/core";
import { SessionState } from "./schema/SessionState";
import { Dispatcher } from "@colyseus/command";
import { CommandFactory } from "./commands";
import { OnJoinCommand } from "./commands/OnJoinCommand";
import { OnLeaveCommand } from "./commands/OnLeaveCommand";
import { GameStateManager } from "./core/GameStateManager";
import SessionStateMachineAction from "./stateMachines/server-state-machine/SessionStateBehaviour";
import SessionStateMachineJSON from "./stateMachines/server-state-machine/SessionStateMachine.json";
import { SoldierState } from "./schema/SoldierState";
import { PlayerState } from "./schema/PlayerState";

export class SessionRoom extends Room<SessionState> {
  maxClients = 10;
  patchRate = 60;
  dispatcher = new Dispatcher(this);

  gameManager = new GameStateManager<SoldierState, PlayerState>(
    SessionStateMachineJSON,
    SessionStateMachineAction
  );

  onCreate(options: any) {
    console.log("CREATED GAME SESSION", options);
    this.setState(new SessionState());
    this.onMessage("*", (client, type, message) => {
      try {
        console.log(`[Message Received] from: ${client.id} | type: ${type}`);
        const commandToDispatch = CommandFactory.createCommand(type as string);
        if (!commandToDispatch)
          throw new Error(`Failed to find command for type ${type}`);
        this.dispatcher.dispatch(commandToDispatch, {
          client,
          message,
          gameManager: this.gameManager,
        });
      } catch (error) {
        console.log("error in session-room onCreate");
        console.log(error);
      }
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  onJoin(client: Client, options: any) {
    this.dispatcher.dispatch(new OnJoinCommand(), {
      client,
      message: options,
      gameManager: this.gameManager,
    });
  }

  onLeave(client: Client, consented: boolean) {
    const commandPayload = {
      sessionId: client.sessionId,
      consented,
    };
    this.dispatcher.dispatch(new OnLeaveCommand(), {
      client,
      message: commandPayload,
      gameManager: this.gameManager,
    });
  }

  onDispose() {
    console.log("SesionRoom/onDispose");
    this.dispatcher.stop();
  }

  update(deltaTime: number) {
    this.gameManager.tick(deltaTime, this.state, this);
  }
}
