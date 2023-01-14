export class BaseScene extends Phaser.Scene {
    constructor(key) {
        super({ key });
        this.phaserContainer = null;
        this.objectArray = [];

        this.registeredInputEvents = new Set();
        this.registeredSceneEvents = new Set();
    }

    AddObject(newObject, addToPhaserContainer=false) {
        if(addToPhaserContainer) {
            if(!this.phaserContainer){
                this.phaserContainer = this.AddObject(this.add.container(), false);
            }
            this.phaserContainer.add(newObject);
        }
        else
            this.objectArray.push(newObject);
        return newObject;
    }

    AddInputEvent(eventType, callback, allowMultipleListeners = true) {
        this.registeredInputEvents.add(eventType);
        if(allowMultipleListeners) {
            this.input.on(eventType, callback);
        }
        else if(this.input.listeners(eventType).size === 0)
            this.input.on(eventType, callback);
    }

    AddSceneEvent(eventType, callback, allowMultipleListeners = true) {
        this.registeredSceneEvents.add(eventType);
        if(allowMultipleListeners) {
                this.events.on(eventType, callback);
        }
        else if(this.events.listeners(eventType).size === 0)
            this.events.on(eventType, callback);
    }

    DestroyObject(obj) {
        obj.destroy();
        this.objectArray = this.objectArray.filter(object => object !== obj);
    }
    DestroyObjects() {
        this.phaserContainer && this.phaserContainer.destroy();
        this.objectArray.forEach(obj => {
            obj.destroy();
        });
        this.objectArray = [];
        this.phaserContainer = null;
    }

    DestroySceneEvents() {
        for(let eventType of this.registeredSceneEvents) {
            console.log(`Removing Listener for: ${eventType}`);
            this.events.removeListener(eventType);
        }
        this.registeredSceneEvents = new Set();
    }
    
    DestroyInputEvents() {
        for(let eventType of this.registeredInputEvents) {
            console.log(`Removing Listener for: ${eventType}`);
            this.input.removeListener(eventType);
        }
        this.registeredInputEvents = new Set();
    }

    Destroy() {
        this.DestroyObjects();
        this.DestroyInputEvents();
        this.DestroySceneEvents();
    }
}