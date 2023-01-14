export class BaseScene extends Phaser.Scene {
    constructor(key) {
        super({ key });
        this.objectSet = new Set();

        this.registeredInputEvents = new Set();
        this.registeredSceneEvents = new Set();
    }
    AddObject(newObject) {
        this.objectSet.add(newObject);
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

    // Recursively destroy an object, including any children if it's a group
    DestroyObject(obj) {
        if(obj.type === "Group")
            obj.destroy(true);
        else
            obj.destroy();
        console.log(`before deleting ${obj.type}`,this.objectSet);
        this.objectSet.delete(obj);
        console.log(`after deleting ${obj.type}`,this.objectSet);
    }
    DestroyObjects() {
        this.objectSet.forEach(obj => {
            this.DestroyObject(obj);
        });
        this.objectSet = new Set();
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