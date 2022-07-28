class LoadingBar extends Phaser.GameObjects.Graphics {
    constructor (scene, parent, args)
    {
        args = args || {};
        super(scene, {
            x: args.x || parent.x,
            y: args.y || parent.y
        });
        this.width= args.width || 25;
        this.height= args.height || 4;

        scene.add.existing(this);
        this.parent = parent;
        this.maxValue = args.maxValue || 100;
        this.depth=-1;
        this.currentValue = args.currentValue || 100;
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
module.exports = LoadingBar