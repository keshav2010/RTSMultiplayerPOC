import { Room, Client } from "@colyseus/core";
import { SessionState } from "./schema/SessionState";
import { Dispatcher } from "@colyseus/command";
import { CommandFactory } from "./commands";
import { PacketType } from "../common/PacketType";
import { OnJoinCommand } from "./commands/OnJoinCommand";
import { OnLeaveCommand } from "./commands/OnLeaveCommand";
import { GameStateManager } from "./core/GameStateManager";
import SessionStateMachineAction from "./stateMachines/server-state-machine/SessionStateBehaviour";
import SessionStateMachineJSON from "./stateMachines/server-state-machine/SessionStateMachine.json";
import { SoldierState } from "./schema/SoldierState";

export class SessionRoom extends Room<SessionState> {
  maxClients = 10;
  patchRate = 60;
  dispatcher = new Dispatcher(this);

  gameManager = new GameStateManager<SoldierState>(
    SessionStateMachineJSON,
    SessionStateMachineAction,
    this.onSceneItemRemoved
  );

  onSceneItemRemoved(item: SoldierState) {
    const player = this.state.getPlayer(item.playerId);
    if (!player) return;
    player.removeSoldier(item.id);
  }

  onCreate(options: any) {
    console.log("CREATED GAME SESSION", options);
    const refThis = this;
    this.setState(new SessionState());
    this.onMessage("*", (client, type, message) => {
      try {
        console.log(`[Message Received] : ${client.id} | ${type}`);
        const commandToDispatch = CommandFactory.createCommand(type as string);
        if (commandToDispatch)
          this.dispatcher.dispatch(commandToDispatch, {
            client,
            message,
            gameManager: this.gameManager,
          });
        else {
          console.error(
            `[message: ${type}]: Failed to dispatch command, no command found.`
          );
        }
      } catch (error) {
        console.log("error in session-room onCreate");
        console.log(error);
      }
    });

    this.setSimulationInterval((deltaTime) => this.update(deltaTime));
  }

  onJoin(client: Client, options: any) {
    this.dispatcher.dispatch(new OnJoinCommand(), { client, message: options });
  }

  onLeave(client: Client, consented: boolean) {
    const commandPayload = {
      sessionId: client.sessionId,
      consented,
    };
    this.dispatcher.dispatch(new OnLeaveCommand(), {
      client,
      message: commandPayload,
    });
  }

  onDispose() {
    console.log('SesionRoom/onDispose');
    this.dispatcher.stop();
  }

  update(deltaTime: number) {
    this.gameManager.tick(deltaTime, this.state);
  }
}
