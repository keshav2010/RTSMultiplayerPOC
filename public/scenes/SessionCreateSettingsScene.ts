import { NetworkManager } from "../NetworkManager";
import { BaseScene } from "./BaseScene"; // Adjust import path
import CONSTANT from "../constant";

export class SessionCreateSettingsScene extends BaseScene {
  settingsDOM: Phaser.GameObjects.DOMElement | undefined;
  networkManager!: NetworkManager;

  constructor() {
    super(CONSTANT.SCENES.SESSIONHOSTSETTINGS);
  }

  preload(): void {
    this.load.html("sessionSettingsUI", "html/session-create-form.html");
  }

  create(): void {
    this.networkManager = this.registry.get("networkManager") as NetworkManager;

    this.settingsDOM = this.add
      .dom(600, 200)
      .createFromCache("sessionSettingsUI");

    const domRoot = this.settingsDOM.node as HTMLElement;

    const minSlider = domRoot.querySelector("#minPlayers") as HTMLInputElement;
    const maxSlider = domRoot.querySelector("#maxPlayers") as HTMLInputElement;
    const spawnSlider = domRoot.querySelector("#spawnTime") as HTMLInputElement;
    const btnCreate = domRoot.querySelector("#btnHostSession") as HTMLButtonElement;
    const btnCancel = domRoot.querySelector("#btnCancel") as HTMLButtonElement;

    const minPlayersLabel = domRoot.querySelector("#minPlayersValue")!;
    const maxPlayersLabel = domRoot.querySelector("#maxPlayersValue")!;
    const maxPlayersMinLabel = domRoot.querySelector("#maxPlayersMinLabel")!;
    const spawnLabel = domRoot.querySelector("#spawnValue")!;

    minSlider.oninput = () => {
      const minVal = parseInt(minSlider.value);
      minPlayersLabel.textContent = minVal.toString();

      maxSlider.min = minVal.toString();
      maxPlayersMinLabel.textContent = minVal.toString();

      if (parseInt(maxSlider.value) < minVal) {
        maxSlider.value = minVal.toString();
        maxPlayersLabel.textContent = minVal.toString();
      }
    };

    maxSlider.oninput = () => {
      maxPlayersLabel.textContent = maxSlider.value;
    };

    spawnSlider.oninput = () => {
      spawnLabel.textContent = `${spawnSlider.value}s`;
    };

    btnCreate.addEventListener("click", () => {
      this.onCreateSessionClick().catch(err => {
        console.error(err);
      })
    });

    btnCancel.addEventListener("click", () => {
      this.scene.start(CONSTANT.SCENES.MENU);
    });

    this.AddSceneEvent("shutdown", () => {
      this.Destroy();
    });

    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }

  async onCreateSessionClick() {
    try {
      const networkManager = this.registry.get(
        "networkManager"
      ) as NetworkManager;
      if (!networkManager) {
        throw new Error("NetworkManager is not defined");
      }

      const playerName = networkManager.getPlayerName();
      const domRoot = this.settingsDOM!.node as HTMLElement;

      const minSlider = domRoot.querySelector("#minPlayers") as HTMLInputElement;
      const maxSlider = domRoot.querySelector("#maxPlayers") as HTMLInputElement;
      const spawnSlider = domRoot.querySelector("#spawnTime") as HTMLInputElement;

      await networkManager?.hostAndJoinSession(
        `${playerName}'s Room`,
        {
          minPlayers: +minSlider.value,
          maxPlayers: +maxSlider.value,
          spawnSelectionTimer: +spawnSlider.value
        }
      );
      this.scene.start(CONSTANT.SCENES.SESSIONLOBBY);
    } catch (error) {
      console.log(error);
    }
  }

  update(): void { }
}
