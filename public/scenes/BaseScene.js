export class BaseScene extends Phaser.Scene {
    constructor(key) {
        super({ key });
        this.objectArray = [];

        this.registeredInputEvents = new Set();
        this.registeredSceneEvents = new Set();
    }
    AddObject(newObject) {

        if (newObject.type === "Group") {
            newObject.getChildren().forEach(child => {
                this.AddObject(child);
            });
        }
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

    // Recursively destroy an object, including any children if it's a group
    DestroyObject(obj) {
        if(obj.type === "Group") {
            // Create a static copy of the children array to prevent issues with the dynamic array
            let childrens = [...obj.getChildren()];
            childrens.forEach(child => {
                this.DestroyObject(child);
            });
        }
        obj.destroy();
        let index = this.objectArray.indexOf(obj);
        if(index >= 0) {
            this.objectArray.splice(index, 1);
        }
    }
    DestroyObjects() {
        this.objectArray.forEach(obj => {
            this.DestroyObject(obj);
        });
        this.objectArray = [];
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