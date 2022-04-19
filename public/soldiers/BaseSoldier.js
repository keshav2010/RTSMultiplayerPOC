const {GAMEEVENTS} = require('../constant');
class HealthBar extends Phaser.GameObjects.Graphics {
    constructor (scene, parent)
    {
        super(scene, {
            x: parent.x,
            y: parent.y
        });
        this.width=25;
        this.height=4;

        scene.add.existing(this);
        this.parent = parent;
        this.maxValue = 100;
        this.depth=-1;
        this.currentValue = 100;
        this.draw();
    }
    decrease(damage){
        this.currentValue = Math.max(0, this.currentValue - damage);
    }
    draw ()
    {
        this.clear();
        this.copyPosition(this.parent);
        //  BG
        this.fillStyle(0x000000);
        this.fillRect(-10, 20, this.width, this.height);

        //  Health
        this.fillStyle(0xffffff);
        this.fillRect(-10, 20, this.width, this.height);

        // Actual health
        this.fillStyle((this.currentValue<30)?0xff0000:0x00ff00);
        let d = Math.floor((this.currentValue/this.maxValue) * this.width);
        this.fillRect(-10, 20, d, this.height);
    }
}
class BackgroundHighlight extends Phaser.GameObjects.Graphics {
    constructor (scene, parent, r,g,b)
    {
        super(scene, {
            x: parent.x,
            y: parent.y
        });
        scene.add.existing(this);
        this.parent = parent;
        this.depth=-2;
        this.r = r;
        this.g = g;
        this.b = b;
        this.draw(r,g,b);
    }
    
    rgbToHex(r, g, b) {
        let componentToHex = function(c){
            c = Math.floor(c);
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        let res = "0x" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        return parseInt(res)
    }
    draw ()
    {
        this.clear();
        this.copyPosition(this.parent);
        var thickness = 17;

        var color = this.rgbToHex(this.r, this.g, this.b);
        this.lineStyle(thickness, color, 0.4);
        var radius = 15;
        this.strokeCircle(0, 0, radius);
    }
}
export class BaseSoldier extends Phaser.GameObjects.Sprite {

    /**
     * @param {*} scene 
     * @param {number} x 
     * @param {number} y 
     * @param {string|Phaser.Textures.Texture} texture 
     * @param {string|number <optional>} frame
     */
    constructor (scene, x, y, texture, frame, initialParam)
    {
        super(scene, x, y, texture, frame);

        //add object to scene
        scene.add.existing(this);
        this.setInteractive();
        this.id=initialParam.id;

        scene.events.on('update', this.update, this);

        this.initialParam = initialParam || {};
        console.log('initial param',initialParam);
        if(this.initialParam.color){
            this.color = [...this.initialParam.color];
        }
        else this.color = [Math.random()*255, Math.random()*255, Math.random()*255];
        this.setData('health',this.initialParam.health || 25);
        this.setData('speed',this.initialParam.speed || 10);
        this.setData('damage',this.initialParam.damage || 10);
        this.setData('cost',this.initialParam.cost || 5);

        this.expectedPositionX = x;
        this.expectedPositionY = y;
        this.setPosition(x,y);
        this.scale = 0.25;
        this.hp = new HealthBar(scene, this);
        console.log(this.color);
        this.highlightBackground = new BackgroundHighlight(scene, this, this.color[0],this.color[1],this.color[2]);
        this.on('destroy', ()=>{
            this.hp.destroy();
            this.highlightBackground.destroy();
            this.scene.stateManager.selectedSoldiers.delete(this.id);
        })
    }
    setHealth(newHealth){
        this.setData('health', newHealth);
        this.hp.currentValue=newHealth;
    }
    update(){
        this.hp.draw();
        console.log(this.color);
        this.highlightBackground.draw()
    }
    markSelected(){
        this.scene.stateManager.selectedSoldiers.set(this.id, this);
        this.alpha = 0.5;

        //emit scene wide event
        this.scene.events.emit(GAMEEVENTS.SOLDIER_SELECTED, this);
    }
    markUnselected(){
        this.scene.stateManager.selectedSoldiers.delete(this.id);
        this.alpha = 1;

        //emit scene wide event
        this.scene.events.emit(GAMEEVENTS.SOLDIER_UNSELECTED, this);
    }
}