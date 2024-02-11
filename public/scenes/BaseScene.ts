import Phaser from "phaser";
import { PlayerCastle } from "../gameObjects/playerCastle";
import { NetworkManager } from "../NetworkManager";
import { ClientStateManager } from "../ClientStateManager";
import CONSTANT from "../constant";
import { nanoid } from "nanoid";

export class BaseScene extends Phaser.Scene {
  objectSet: Map<
    string,
    | Phaser.GameObjects.Graphics
    | PlayerCastle
    | Phaser.GameObjects.Text
    | Phaser.GameObjects.DOMElement
    | Phaser.GameObjects.Image
  >;
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
    let existingCbSet = this.networkCallsCleanup.get(mKey);
    if (existingCbSet) existingCbSet.add(cleanupFunction);
    existingCbSet = new Set();
    existingCbSet.add(cleanupFunction);
    this.networkCallsCleanup.set(mKey, existingCbSet);
  }
  DestroyStateChangeListener(key: string) {
    this.networkCallsCleanup.get(key)?.forEach((cb) => cb());
    this.networkCallsCleanup.delete(key);
  }

  AddObject<
    T extends
      | Phaser.GameObjects.Graphics
      | PlayerCastle
      | Phaser.GameObjects.Text
      | Phaser.GameObjects.DOMElement
      | Phaser.GameObjects.Image
  >(newObject: T, key?: string): T {
    let mKey = nanoid();
    this.objectSet.set(key || mKey, newObject);
    return newObject;
  }

  GetObject<
    T extends
      | Phaser.GameObjects.Graphics
      | PlayerCastle
      | Phaser.GameObjects.Text
      | Phaser.GameObjects.DOMElement
      | Phaser.GameObjects.Image
  >(key: string) {
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
  DestroyObject<
    T extends
      | Phaser.GameObjects.Graphics
      | PlayerCastle
      | Phaser.GameObjects.Text
      | Phaser.GameObjects.DOMElement
      | Phaser.GameObjects.Image
  >(obj: T) {
    if (obj.type === "Group") obj.destroy(true);
    else obj.destroy();
  }

  DestroyObjects() {
    this.objectSet.forEach((obj) => {
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

  Destroy() {
    this.DestroyObjects();
    this.DestroyInputEvents();
    this.DestroySceneEvents();

    [...this.networkCallsCleanup.values()].forEach((set) =>
      set.forEach((cb) => cb())
    );
    this.networkCallsCleanup.clear();
  }
}
