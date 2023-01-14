const SAT = require("sat");
class SceneObject extends SAT.Box {
    constructor(x, y, width = 35, height = 35, parent) {
        // {pos:{x,y}}
        super(
          new SAT.Vector(x, y),
          width,
          height
        );
        this.parent = parent;
        
        //used by quadtrees
        this.x = this.pos.x;
        this.y = this.pos.y;
        this.width = this.w;
        this.height = this.h;
    }
}
module.exports = SceneObject;