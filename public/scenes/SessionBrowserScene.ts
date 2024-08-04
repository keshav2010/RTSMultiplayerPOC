import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
import { NetworkManager } from "../NetworkManager";
import { addBackgroundImage } from "../helpers/addBackgroundImage";

function removeServerList(sessionBrowserDOM: Phaser.GameObjects.DOMElement) {
  // Assuming sessionBrowserDOM is a Phaser.GameObjects.E
  // Access the underlying HTML element
  const htmlElement = sessionBrowserDOM.node;
  const serverRowDataElements =
    htmlElement.querySelectorAll(".server-row-data");
  serverRowDataElements.forEach((element) => {
    element.remove();
  });

  const serverRowDataElementsNotFound =
    htmlElement.querySelectorAll(".no-servers-found");
  serverRowDataElementsNotFound.forEach((element) => {
    element.remove();
  });
}

function addServerRecord(sessionBrowserDOM: Phaser.GameObjects.DOMElement, sessions: any[], onJoinClicked: (roomId: string) => void) {
  // Access the underlying HTML element
  const htmlElement = sessionBrowserDOM.node;
  console.log(sessions);
  // Find or create the server-list div
  let serverListDiv = htmlElement.querySelector('.server-list');
  if (!serverListDiv) {
      serverListDiv = document.createElement('div');
      serverListDiv.className = 'server-list';
      htmlElement.appendChild(serverListDiv);
  }

  // Iterate over each session to create and append serverRowData divs
  sessions.forEach(session => {
      // Create the main div
      const serverRowDataDiv = document.createElement('div');
      serverRowDataDiv.setAttribute('data-id', session.roomId); // Assuming 'roomId' is a property of the session object
      serverRowDataDiv.className = 'server-row-data';
      serverRowDataDiv.setAttribute('name', 'server-row-data');

      // Create and append server name span
      const serverNameSpan = document.createElement('span');
      serverNameSpan.className = 'server-name';
      serverNameSpan.textContent = session.roomId; // Assuming 'name' is a property of the session object
      serverRowDataDiv.appendChild(serverNameSpan);

      // Create and append server players span
      const serverPlayersSpan = document.createElement('span');
      serverPlayersSpan.className = 'server-players';
      serverPlayersSpan.textContent = `${session.clients}/${session.maxClients}`; // Assuming these properties exist in the session object
      serverRowDataDiv.appendChild(serverPlayersSpan);

      // Create and append server capacity span
      const serverCapacitySpan = document.createElement('span');
      serverCapacitySpan.className = 'server-capacity';
      serverCapacitySpan.textContent = session.maxClients; // Assuming 'maxClients' is a property of the session object
      serverRowDataDiv.appendChild(serverCapacitySpan);

      // Create and append join button
      const joinButton = document.createElement('button');
      joinButton.textContent = 'Join';
      joinButton.addEventListener('click', () => onJoinClicked(session.roomId)); // Call the provided callback function with the roomId
      serverRowDataDiv.appendChild(joinButton);

      // Append the serverRowDataDiv to the server-list div
      serverListDiv!.appendChild(serverRowDataDiv);
  });
}


export class SessionBrowserScene extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.SESSIONBROWSER);
  }
  init() {
    super.init();
  }
  preload() {
    this.scene.bringToTop();
    this.load.html("sesssionBrowserDOM", "../html/session-browser.html");
    this.load.image("background", "../assets/background.png");
  }
  create() {
    let networkManager = this.registry.get("networkManager") as NetworkManager;
    this.AddObject(this.add.text(100, 20, "War.IO"), "obj_introText");
    addBackgroundImage(this, "background");

    const sessionBrowserDOM = this.AddObject(
      this.add.dom(600, 200).createFromCache("sesssionBrowserDOM"),
      "obj_sessionBrowser"
    );
    if (!sessionBrowserDOM) {
      return;
    }

    let refreshButton = sessionBrowserDOM.getChildByID("btn_serverListBrowser");
    let backToMenuButton = sessionBrowserDOM.getChildByID("btn_backToMenu");
    let inputField = sessionBrowserDOM.getChildByID("input_searchServer");

    backToMenuButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.scene.start(CONSTANT.SCENES.MENU);
    });
    inputField?.addEventListener("input", (event) => {
      var inputName = sessionBrowserDOM.getChildByID("nameInput") as Element & {
        value: string;
      };
      if (!inputName) return;
      if (inputName.value !== "") {
        let name = inputName.value.trim().replace(" ", "-");
        networkManager.setPlayerName(name);
        this.GetObject<Phaser.GameObjects.Text>("obj_introText")?.setText(
          `Welcome: ${name}`
        );
      }
    });

    sessionBrowserDOM.addListener("click");
    sessionBrowserDOM.on("click", function (event: any) {
      event.stopPropagation();
    });

    refreshButton?.addEventListener("click", async  (event: any) => {
      removeServerList(
        sessionBrowserDOM
      );

      const sessions = await networkManager.getAvailableSession();
      addServerRecord(sessionBrowserDOM, sessions, (roomId:string) => this.onJoinClicked(roomId));
    });
    removeServerList(
      sessionBrowserDOM as Phaser.GameObjects.DOMElement & { element: Element }
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
  async onJoinClicked(roomId : string) {
    try {
      const networkManager = this.registry.get(
        "networkManager"
      ) as NetworkManager;
      
      const playerName = networkManager.getPlayerName();
      if (!networkManager) {
        throw new Error("NetworkManager is not defined");
      }
      const connectedRoom = await networkManager.connectGameServer(roomId);
      console.log('connected',connectedRoom);
      this.scene.start(CONSTANT.SCENES.SESSIONLOBBY);
    } catch (error) {
      console.log(error);
    }
  }

}
