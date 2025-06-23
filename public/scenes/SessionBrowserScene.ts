import { ServerBrowserUI } from "../ui/ServerBrowserUI";
import { BaseScene } from "./BaseScene";
import CONSTANT from "../constant";
import { addBackgroundImage } from "../helpers/addBackgroundImage";
import { NetworkManager } from "../NetworkManager";

export class SessionBrowserScene extends BaseScene {
  serverBrowserUI: ServerBrowserUI | undefined;

  constructor() {
    super(CONSTANT.SCENES.SESSIONBROWSER);
  }

  init() {
    super.init();
  }

  preload() {
    this.scene.bringToTop();
    this.load.html("sessionBrowserDOM", "../html/session-browser.html");
    this.load.image("background", "../assets/background.png");
  }

  create() {
    const networkManager = this.registry.get("networkManager") as NetworkManager;

    this.AddObject(
      this.add.text(100, 20, "Conquesta").setName("obj_introText"),
      "obj_introText"
    );

    addBackgroundImage(this, "background");

    const sessionBrowserDOM = this.AddObject(
      this.add.dom(600, 200).createFromCache("sessionBrowserDOM"),
      "obj_sessionBrowser"
    );

    this.serverBrowserUI = new ServerBrowserUI(this, sessionBrowserDOM, networkManager);

    // Scene cleanup
    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("Shutting down:", data.config.key);
      this.Destroy();
    });

    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
}
