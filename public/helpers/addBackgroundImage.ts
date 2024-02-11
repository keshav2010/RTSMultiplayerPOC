import { BaseScene } from "../scenes/BaseScene";

export function addBackgroundImage(sceneRef: BaseScene, filename: string) {
  sceneRef.add
    .image(
      sceneRef.sys.canvas.width / 2,
      sceneRef.sys.canvas.height / 2,
      filename
    )
    .setDisplaySize(sceneRef.sys.canvas.width, sceneRef.sys.canvas.height);
}
