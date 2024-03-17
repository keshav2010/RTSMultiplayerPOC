import CONSTANT from "../constant";
import { BaseScene } from "./BaseScene";
export class ResultScene extends BaseScene {
  constructor() {
    super(CONSTANT.SCENES.RESULT);
  }
  create() {
    this.AddSceneEvent("shutdown", (data: any) => {
      console.log("shutdown ", data.config.key);
      this.Destroy();
    });
    this.AddSceneEvent("destroy", () => {
      this.input.removeAllListeners();
      this.events.removeAllListeners();
    });
  }
}
