import { RoomAvailable } from "colyseus.js";
import constant from "../constant";
import { NetworkManager } from "../NetworkManager";

interface ServerSession {
  roomId: string;
  sessionName: string;
  minPlayers: number;
  maxPlayers: number;
  clients: number;
  createdAt: string;
}

export class ServerBrowserUI {
  private domElement: Phaser.GameObjects.DOMElement;
  private networkManager: NetworkManager;
  private scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    domElement: Phaser.GameObjects.DOMElement,
    networkManager: any
  ) {
    this.scene = scene;
    this.domElement = domElement;
    this.networkManager = networkManager;
    this.initialize();
  }

  private initialize() {
    const dom = this.domElement.node as HTMLElement;
    const refreshButton = dom.querySelector("#btn_serverListBrowser") as HTMLButtonElement;
    const backToMenuButton = dom.querySelector("#btn_backToMenu") as HTMLButtonElement;
    const inputField = dom.querySelector("#input_searchServer") as HTMLInputElement;

    // Scene navigation
    backToMenuButton?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.scene.scene.start(constant.SCENES.MENU);
    });

    // Set player name
    inputField?.addEventListener("input", (event) => {
      const input = event.target as HTMLInputElement;
      if (!input.value) return;
      const name = input.value.trim().replace(/\s+/g, "-");

      // TODO: server search
    });

    // Prevent DOM clicks from bubbling into Phaser input
    this.domElement.addListener("click");
    this.domElement.on("click", (event: any) => event.stopPropagation());

    // Refresh button handler
    refreshButton?.addEventListener("click", async () => {
      await this.refreshServerList();
    });

    // Initial list load
    this.refreshServerList();
  }

  private async refreshServerList() {
    this.clearServerList();
    const sessions: RoomAvailable<ServerSession>[] = await this.networkManager.getAvailableSession();
    if (!sessions.length) {
      this.showNoServersFound();
    } else {
      console.log(sessions);
      this.populateServerTable(sessions);
    }
  }

  private clearServerList() {
    const dom = this.domElement.node as HTMLElement;
    const tableBody = dom.querySelector("#serverTableBody");
    if (tableBody) {
      tableBody.innerHTML = "";
    }
  }

  private showNoServersFound() {
    const dom = this.domElement.node as HTMLElement;
    const tableBody = dom.querySelector("#serverTableBody");
    if (!tableBody) return;

    const row = document.createElement("tr");
    row.className = "no-servers-found";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No active sessions found.";
    row.appendChild(cell);
    tableBody.appendChild(row);
  }

  private populateServerTable(sessions: RoomAvailable<ServerSession>[]) {
    const dom = this.domElement.node as HTMLElement;
    const tableBody = dom.querySelector("#serverTableBody");
    if (!tableBody) return;

    sessions.forEach((session) => {
      const row = document.createElement("tr");
      row.setAttribute("data-id", session.roomId);
      row.setAttribute("name", "server-row-data");

      row.innerHTML = `
        <td>${session.metadata?.sessionName}</td>
        <td>${session.metadata?.minPlayers}</td>
        <td>${session.metadata?.maxPlayers}</td>
        <td>${session.clients}/${session.metadata?.maxPlayers}</td>
        <td><button>Join</button></td>
      `;

      const joinBtn = row.querySelector("button")!;
      joinBtn.addEventListener("click", () => this.onJoinClicked(session.roomId));

      tableBody.appendChild(row);
    });
  }

  private async onJoinClicked(roomId: string) {
    try {
      const connectedRoom = await this.networkManager.connectGameServer(roomId);
      console.log("Connected to room:", connectedRoom);
      this.scene.scene.start("SESSIONLOBBY");
    } catch (error) {
      console.error("Failed to join session:", error);
    }
  }
}
