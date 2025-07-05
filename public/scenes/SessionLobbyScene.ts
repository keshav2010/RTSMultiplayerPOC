import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { PacketType } from "../../common/PacketType";
import { NetworkManager } from "../NetworkManager";
import SpinnerPlugin from "phaser3-rex-plugins/templates/spinner/spinner-plugin.js";
import Spinner from "phaser3-rex-plugins/templates/spinner/spinner/Spinner";
import { PlayerState } from "../../gameserver/schema/PlayerState";

var networkManager: NetworkManager;
var buttonState = false;


function removePlayerList(dom: Phaser.GameObjects.DOMElement) {
  const htmlElement = dom.node;
  const serverRowDataElements =
    htmlElement.querySelectorAll(".player-row-data");
  serverRowDataElements.forEach((element) => {
    element.remove();
  });

  const serverRowDataElementsNotFound =
    htmlElement.querySelectorAll(".no-servers-found");
  serverRowDataElementsNotFound.forEach((element) => {
    element.remove();
  });
}

function addPlayerInfo(dom: Phaser.GameObjects.DOMElement, players: PlayerState[] = []) {
  removePlayerList(dom);
  // Access the underlying HTML element
  const htmlElement = dom.node;

  // Find or create the server-list div
  let playerListDiv = htmlElement.querySelector('.players-list');
  if (!playerListDiv) {
    playerListDiv = document.createElement('div');
    playerListDiv.className = 'players-list';
    htmlElement.appendChild(playerListDiv);
  }

  // Iterate over each session to create and append serverRowData divs
  players.forEach(player => {
    // Create the main div
    const playerRowDataDiv = document.createElement('div');
    playerRowDataDiv.setAttribute('data-id', player.id); // Assuming 'roomId' is a property of the session object
    playerRowDataDiv.className = 'player-row-data';
    playerRowDataDiv.setAttribute('name', 'server-row-data');

    // Create and append server name span
    const playerNameSpan = document.createElement('span');
    playerNameSpan.className = 'player-name';
    playerNameSpan.textContent = player.name; // Assuming 'name' is a property of the session object
    playerRowDataDiv.appendChild(playerNameSpan);

    // Create and append server players span
    const readySpan = document.createElement('span');
    readySpan.className = 'ready-status';
    readySpan.id = `ready-status-${player.id}`
    readySpan.textContent = `${player.readyStatus ? 'YES' : 'NO'}`; // Assuming these properties exist in the session object
    playerRowDataDiv.appendChild(readySpan);

    // Append the serverRowDataDiv to the server-list div
    playerListDiv!.appendChild(playerRowDataDiv);

    player.listen('readyStatus', (isReady) => {
      const readyStatusElement = dom?.getChildByID(`ready-status-${player.id}`);
      if(!readyStatusElement)
        return;
      readyStatusElement.innerHTML = isReady ? 'Ready✅' : 'Not Ready❌';
    });

  });
}

export class SessionLobbyScene extends BaseScene {
  rexSpinner: SpinnerPlugin | undefined;
  lobbyDOM: Phaser.GameObjects.DOMElement | undefined;
  constructor() {
    super(CONSTANT.SCENES.SESSIONLOBBY);
  }

  init() {
    super.init();
  }
  preload() {
    this.scene.bringToTop();
    this.load.html("sessionLobbyDOM", "../html/session-lobby.html");
  }
  create() {
    networkManager = this.registry.get("networkManager") as NetworkManager;

    const sessionId = networkManager.getClientId();

    this.lobbyDOM = this.AddObject(
      this.add.dom(600, 200).createFromCache("sessionLobbyDOM"),
      "obj_lobbyBrowser"
    );

    const sessionIdText = this.lobbyDOM.getChildByID('p_sessionId');
    sessionIdText!.innerHTML = sessionId!;
    removePlayerList(this.lobbyDOM);
    this.lobbyDOM.addListener('click');
    this.lobbyDOM.on('click', function (e: any) {
      e.stopPropagation();
    });

    this.AddObject(
      this.add.text(50, 40, `Procedurally Generating Tilemap...`),
      "obj_mapLoadStatus"
    );

    this.AddObject(
      this.rexSpinner!.add.spinner({
        width: 40,
        height: 40,
        x: 10,
        y: 40,
      }),
      "obj_tilemapLoadingSpinner"
    );

    const cb = networkManager.getState()?.listen("sessionState", (value) => {
      if (value === "SPAWN_SELECTION_STATE")
        this.scene.start(CONSTANT.SCENES.SPAWNSELECTSCENE);
    })
    if (cb)
      this.AddStateChangeListener(cb);

    const readyButton = this.lobbyDOM.getChildByID('btn_ready');
    const leaveSessionButton = this.lobbyDOM.getChildByID('btn_quitLobby');

    leaveSessionButton?.addEventListener('click', () => {
      networkManager.disconnectGameServer();
      this.scene.start(CONSTANT.SCENES.MENU);
    });

    readyButton!.addEventListener('click', () => {
      const state = readyButton?.getAttribute('readyState');
      const buttonState = !state;
      readyButton!.innerHTML = buttonState ? 'Ready✅' : 'Not Ready❌';
      readyButton!.setAttribute('readyState', `${buttonState ? 'y' : ''}`);
      if (buttonState)
        networkManager.sendEventToServer(PacketType.ByClient.PLAYER_READY, {
          readyStatus: true,
        });
      else
        networkManager.sendEventToServer(PacketType.ByClient.PLAYER_UNREADY, {
          readyStatus: false,
        });
    })

    const state = networkManager.getState();

    const players: PlayerState[] = [];
    for (const player of state!.players.values()) {
      players.push(player);
    }
    addPlayerInfo(this.lobbyDOM, players);

    this.AddStateChangeListener(
      state?.players.onChange(() => {
        const players = [];
        for (const player of state?.players.values()) {
          players.push(player);
        }
        addPlayerInfo(this.lobbyDOM!, players);
      })!
    );

    this.AddStateChangeListener(
      networkManager.room?.state.tilemap.listen("ready", (isTilemapReady) => {
        if (!isTilemapReady) return;
        this.GetObject<Phaser.GameObjects.Text>("obj_mapLoadStatus")?.setText(
          `Generated Tilemap.`
        );
        this.DestroyObjectById(`obj_tilemapLoadingSpinner`);
        networkManager.sendEventToServer(
          PacketType.ByClient.CLIENT_MAP_LOADED,
          {
            isLoaded: true,
          }
        );
      })
    );

    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });
    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
  update(delta: number) {
    const timeLeft = Number((networkManager.room?.state.countdown || 0) / 1000);
    const sessionIdText = this.lobbyDOM?.getChildByID('p_sessionId');
    if (sessionIdText)
      sessionIdText.innerHTML = `${networkManager.getClientId()} <br/> Starting in ${Math.floor(timeLeft)} Seconds`
  }
}
