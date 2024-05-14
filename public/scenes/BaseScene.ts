import Phaser from "phaser";
import { PlayerCastle } from "../gameObjects/playerCastle";
import { NetworkManager } from "../NetworkManager";
import { ClientStateManager } from "../ClientStateManager";
import CONSTANT from "../constant";
import { nanoid } from "nanoid";
interface Destroyable {
  destroy: Function;
}
type ManagedTypes = Destroyable;

export class BaseScene extends Phaser.Scene {
  objectSet: Map<string, ManagedTypes>;
  registeredInputEvents: Set<string>;
  registeredSceneEvents: Set<string>;

  networkManager: NetworkManager | null = null;
  stateManager: ClientStateManager | null = null;

  networkCallsCleanup: Map<string, Set<Function>> = new Map<
    string,
    Set<Function>
  >();

  mapGraphics: Phaser.GameObjects.Graphics | undefined;
  constructor(key: string) {
    super({ key });
    this.objectSet = new Map();

    this.registeredInputEvents = new Set<string>();
    this.registeredSceneEvents = new Set<string>();
  }

  init() {
    if (this.scene.key !== CONSTANT.SCENES.MENU) {
      return;
    }

    this.registry.set("stateManager", new ClientStateManager());

    const networkManager = this.registry.get("networkManager") as
      | NetworkManager
      | undefined;

    networkManager?.isSocketConnected() &&
      networkManager?.disconnectGameServer();

    if (networkManager) return;

    this.registry.set(
      "networkManager",
      new NetworkManager(this.game, this.registry)
    );
  }

  AddStateChangeListener(cleanupFunction: Function, key?: string) {
    const mKey = key || nanoid();
    let existingCbSet = this.networkCallsCleanup.get(mKey) || new Set();
    existingCbSet.add(cleanupFunction);
    this.networkCallsCleanup.set(mKey, existingCbSet);
  }
  DestroyStateChangeListener(key: string) {
    try {
      this.networkCallsCleanup.get(key)?.forEach((cb) => cb());
      this.networkCallsCleanup.delete(key);
      console.log("Clean State Change Listener.");
    } catch (error) {
      console.log(error);
    }
  }

  AddObject<T extends ManagedTypes>(newObject: T, key?: string): T {
    let mKey = nanoid();
    this.objectSet.set(key || mKey, newObject);
    return newObject;
  }

  GetObject<T extends ManagedTypes>(key: string) {
    return this.objectSet.get(key) as T | undefined;
  }

  AddInputEvent(
    eventType: string,
    callback: any,
    allowMultipleListeners = true
  ) {
    this.registeredInputEvents.add(eventType);
    if (allowMultipleListeners) {
      this.input.on(eventType, callback);
    } else if (this.input.listeners(eventType).length === 0)
      this.input.on(eventType, callback);
  }

  AddSceneEvent(
    eventType: string,
    callback: Function,
    allowMultipleListeners = true
  ) {
    this.registeredSceneEvents.add(eventType);
    if (allowMultipleListeners) {
      this.events.on(eventType, callback);
    } else if (this.events.listeners(eventType).length === 0)
      this.events.on(eventType, callback);
  }

  // Recursively destroy an object, including any children if it's a group
  DestroyObject<T extends ManagedTypes>(obj: T) {
    if ((obj as any)?.type === "Group") obj.destroy(true);
    else obj.destroy();
  }

  DestroyObjects() {
    this.objectSet.forEach((obj, key) => {
      console.log(`[Destroy] ${key}`);
      this.DestroyObject(obj);
    });
    this.objectSet.clear();
    this.objectSet = new Map();
  }

  DestroySceneEvents() {
    for (let eventType of this.registeredSceneEvents) {
      console.log(`Removing Listener for: ${eventType}`);
      this.events.removeListener(eventType);
    }
    this.registeredSceneEvents = new Set();
  }

  DestroyInputEvents() {
    for (let eventType of this.registeredInputEvents) {
      console.log(`Removing Listener for: ${eventType}`);
      this.input.removeListener(eventType);
    }
    this.registeredInputEvents = new Set();
  }

  setupSceneTilemap(map2DData: number[][], ) {
    const map = this.make.tilemap({
      data: map2DData!,
      tileWidth: 32,
      tileHeight: 32,
      width: 60,
      height: 60,
    });
    const tileset = map.addTilesetImage("groundtiles", "img_groundtiles");
    const groundLayer = map.createBlankLayer("groundlayer", tileset!);
    map2DData.forEach((row, y) => {
      row.forEach((tileIdInTileset, x) => {
        groundLayer?.putTileAt(tileIdInTileset - 1, x, y);
      });
    });
    return map;
  }

  Destroy() {
    console.log(`[BaseScene] : Destroy Invoked`);
    this.DestroyObjects();
    this.DestroyInputEvents();
    this.DestroySceneEvents();

    [...this.networkCallsCleanup.values()].forEach((set) =>
      set.forEach((cb) => cb())
    );
    this.networkCallsCleanup.clear();
  }
}
