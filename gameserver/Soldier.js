
const PacketType = require('../common/PacketType')
const SAT = require('sat'); //(w,h)

const SoldierStateMachineJSON = require('./stateMachines/SoldierStateMachine.json');
const { createMachine, interpret } =  require('xstate');
const StateMachine = require('../common/StateMachine');

/**
 * SAT BOX Interface    |   * QUADTREE Object Interface
 * ---------            |   * ---------
 * pos {x,y}            |   * {x, y, width, height}
 * r                    |
 * offset               |
 * setOffset(offset)    |
 * getAABB()            |
 * getAABBAsBox()       |
 */
class Soldier extends SAT.Box {
    static sid=0;
    constructor(type, params, parentObject)
    {
        // {pos:{x,y}}
        super(new SAT.Vector(params.x, params.y), params.width || 35, params.height || 35);
        this.parent = parentObject;
        
        //used by quadtrees
        this.x = this.pos.x;
        this.y = this.pos.y;
        this.width=this.w;
        this.height=this.h;

        this.senseRadius = 50;

        //compromised position possible for agent
        this.expectedPosition = {x:params.x, y:params.y}; 

        //actual position requested by client
        this.targetPosition = {x:params.x, y:params.y}; 

        //Soldier whom we need to attack
        this.attackTarget = null;

        this.isAtDestination=true;

        this.soldierType=type;

        this.health = params.health || 100;
        this.speed = params.speed || 5;
        this.cost = params.cost || 5;
        this.damage = params.damage || 5;

        this.id = ''+Soldier.sid;
        this.playerId = ''+params.playerId

        Soldier.sid++;
        this.stateMachine = new StateMachine(SoldierStateMachineJSON);
    }
    
    setPosition(x,y){
        this.pos.x = x;
        this.pos.y = y;
        this.x = x;
        this.y = y;
    }
    hasReachedDestination(){
        let diffX = this.targetPosition.x - this.pos.x;
        let diffY = this.targetPosition.y - this.pos.y;
        let mag = Math.sqrt(diffX*diffX + diffY*diffY);
        return (mag < 15  || this.isAtDestination);
    }
    setTargetPosition(x,y){
        this.targetPosition = {x,y};
        this.expectedPosition = {x,y};
        this.isAtDestination=false;
        this.attackTarget=null;
    }

    tick(delta, updateManager, stateManager){
        //if attack target set, chase them and/or attack
        switch(this.stateMachine.currentState){
            case 'Idle': this.Idle(delta, updateManager, stateManager); break;
            case 'Move': this.Move(delta, updateManager, stateManager); break;
            case 'Attack': this.Attack(delta, updateManager, stateManager); break;
            case 'FindTarget': this.FindTarget(delta, updateManager, stateManager); break;
            case 'Defend': this.Defend(delta, updateManager, stateManager); break;
            case 'ChaseTarget': this.ChaseTarget(delta, updateManager, stateManager); break;
        }
        if(this.attackTarget)
            this.chaseAndAttackTarget(delta, updateManager, stateManager);
        else
            this.moveAtDesiredPosition(delta, updateManager, stateManager);
    }

    Idle(delta, updateManager, stateManager){
        //in idle state
    }
    Move(delta, updateManager, stateManager){
        moveAtDesiredPosition(delta, updateManager, stateManager);
    }
    Attack(delta, updateManager, stateManager){
        this.attackTarget.health -= delta*this.damage;
        this.health -= delta*this.attackTarget.damage;

        this.attackTarget.health = Math.max(0, this.attackTarget.health);
        this.health = Math.max(0, this.health);
        
        updateManager.queueServerEvent({
            type: PacketType.ByServer.SOLDIER_ATTACKED,
            a: this.getSnapshot(),
            b: this.attackTarget.getSnapshot()
        });

        if(this.attackTarget.health === 0){
            updateManager.queueServerEvent({
                type: PacketType.ByServer.SOLDIER_KILLED,
                playerId: this.attackTarget.playerId,
                soldierId: this.attackTarget.id
            });
            stateManager.removeSoldier(this.attackTarget.playerId, this.attackTarget.id);
        }
        if(this.health === 0){
            updateManager.queueServerEvent({
                type: PacketType.ByServer.SOLDIER_KILLED,
                playerId: this.playerId,
                soldierId: this.id
            });
            stateManager.removeSoldier(this.playerId, this.id);
            return;
        }
    }
    FindTarget(delta, updateManager, stateManager){
        try{

        }
        catch(err){

        }
    }
    Defend(delta, updateManager, stateManager){
        //also same as attack
    }
    ChaseTarget(delta, updateManager, stateManager){
        try
        {
            if(!stateManager.SocketToPlayerData.get(this.attackTarget.playerId).getSoldier(this.attackTarget.id)){
                this.targetPosition.x = this.attackTarget.pos.x;
                this.targetPosition.x = this.attackTarget.pos.y;
                this.expectedPosition.x = this.targetPosition.x;
                this.expectedPosition.y = this.targetPosition.y;
                this.attackTarget=null;
                return;
            }
            let diffX = this.attackTarget.pos.x - this.pos.x;
            let diffY = this.attackTarget.pos.y - this.pos.y;
            let mag = Math.sqrt(diffX*diffX + diffY*diffY);
            mag = (mag < 0.1)?0.1:mag;
            diffX /= mag;
            diffY /= mag;
            this.setPosition(this.pos.x+this.speed*delta*diffX, this.pos.y+this.speed*delta*diffY);
            stateManager.scene.checkOne(this, (res)=>{
                let a = res.a;
                let b = res.b;

                var collisionBetweenGroupMembers = (a.targetPosition.x === b.targetPosition.x && a.targetPosition.y === b.targetPosition.y);
                var eitherReachedDest = a.hasReachedDestination() || b.hasReachedDestination();
                if(collisionBetweenGroupMembers && eitherReachedDest){
                    a.isAtDestination = b.isAtDestination = true;
                }

                a.setPosition(a.pos.x - res.overlapV.x, a.pos.y - res.overlapV.y);

                var eitherAtDestination = a.hasReachedDestination() || b.hasReachedDestination();
                var bodiesInSameGroup = a.targetPosition.x === b.targetPosition.x && a.targetPosition.y === b.targetPosition.y;

                if(bodiesInSameGroup && eitherAtDestination){
                    a.expectedPosition = {x: a.pos.x, y: a.pos.y};
                    b.expectedPosition = {x: b.pos.x, y: b.pos.y};
                }
            });

            //this.parent.stateManager.scene.updateBody(this);
            updateManager.queueServerEvent({
                type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
                soldier: this.getSnapshot()
            });
        }catch(err){
            this.targetPosition.x = this.attackTarget.pos.x;
            this.targetPosition.x = this.attackTarget.pos.y;
            this.expectedPosition.x = this.targetPosition.x;
            this.expectedPosition.y = this.targetPosition.y;
            this.attackTarget=null;
            console.log(err);
        }
    }


    chaseAndAttackTarget(delta, updateManager, stateManager)
    {
        try
        {
            //check if attackTarget unit exists
            if(!stateManager.SocketToPlayerData.get(this.attackTarget.playerId).getSoldier(this.attackTarget.id)){
                this.targetPosition.x = this.attackTarget.pos.x;
                this.targetPosition.x = this.attackTarget.pos.y;
                this.expectedPosition.x = this.targetPosition.x;
                this.expectedPosition.y = this.targetPosition.y;
                this.attackTarget=null;
                return;
            }
            let diffX = this.attackTarget.pos.x - this.pos.x;
            let diffY = this.attackTarget.pos.y - this.pos.y;
            let mag = Math.sqrt(diffX*diffX + diffY*diffY);
            mag = (mag < 0.1)?0.1:mag;
            diffX /= mag;
            diffY /= mag;
            if(mag <= 50)
            {
                //both units attack each other
                this.attackTarget.health -= delta*this.damage;
                this.health -= delta*this.attackTarget.damage;

                this.attackTarget.health = Math.max(0, this.attackTarget.health);
                this.health = Math.max(0, this.health);
                
                updateManager.queueServerEvent({
                    type: PacketType.ByServer.SOLDIER_ATTACKED,
                    a: this.getSnapshot(),
                    b: this.attackTarget.getSnapshot()
                });

                if(this.attackTarget.health === 0){
                    updateManager.queueServerEvent({
                        type: PacketType.ByServer.SOLDIER_KILLED,
                        playerId: this.attackTarget.playerId,
                        soldierId: this.attackTarget.id
                    });
                    stateManager.removeSoldier(this.attackTarget.playerId, this.attackTarget.id);
                }
                if(this.health === 0){
                    updateManager.queueServerEvent({
                        type: PacketType.ByServer.SOLDIER_KILLED,
                        playerId: this.playerId,
                        soldierId: this.id
                    });
                    stateManager.removeSoldier(this.playerId, this.id);
                    return;
                }
            }

            this.setPosition(this.pos.x+this.speed*delta*diffX, this.pos.y+this.speed*delta*diffY);
            
            stateManager.scene.checkOne(this, (res)=>{
                let a = res.a;
                let b = res.b;

                var collisionBetweenGroupMembers = (a.targetPosition.x === b.targetPosition.x && a.targetPosition.y === b.targetPosition.y);
                var eitherReachedDest = a.hasReachedDestination() || b.hasReachedDestination();
                if(collisionBetweenGroupMembers && eitherReachedDest){
                    a.isAtDestination = b.isAtDestination = true;
                }

                a.setPosition(a.pos.x - res.overlapV.x, a.pos.y - res.overlapV.y);

                var eitherAtDestination = a.hasReachedDestination() || b.hasReachedDestination();
                var bodiesInSameGroup = a.targetPosition.x === b.targetPosition.x && a.targetPosition.y === b.targetPosition.y;

                if(bodiesInSameGroup && eitherAtDestination){
                    a.expectedPosition = {x: a.pos.x, y: a.pos.y};
                    b.expectedPosition = {x: b.pos.x, y: b.pos.y};
                }
            });

            //this.parent.stateManager.scene.updateBody(this);
            updateManager.queueServerEvent({
                type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
                soldier: this.getSnapshot()
            });
        }catch(err){
            this.targetPosition.x = this.attackTarget.pos.x;
            this.targetPosition.x = this.attackTarget.pos.y;
            this.expectedPosition.x = this.targetPosition.x;
            this.expectedPosition.y = this.targetPosition.y;
            this.attackTarget=null;
            console.log(err);
        }
    }
    moveAtDesiredPosition(delta, updateManager, stateManager){

        //get unit vector pointing toward desired point
        let diffX = this.expectedPosition.x - this.pos.x;
        let diffY = this.expectedPosition.y - this.pos.y;
        let mag = Math.sqrt(diffX*diffX + diffY*diffY);
        if(mag === 0){
            this.isAtDestination=true;
            return;
        }
        else if(mag <= 1){
            diffX = diffY = 0;
            this.setPosition(this.expectedPosition.x, this.expectedPosition.y);
            this.isAtDestination=true;
        } 
        else {
            diffX = diffX/mag;
            diffY = diffY/mag;
        }
        this.setPosition(this.pos.x+this.speed*delta*diffX, this.pos.y+this.speed*delta*diffY);
        stateManager.scene.checkOne(this, (res)=>{
            let a = res.a;
            let b = res.b;
            
            var collisionBetweenGroupMembers = (a.targetPosition.x === b.targetPosition.x && a.targetPosition.y === b.targetPosition.y);
            var eitherReachedDest = a.hasReachedDestination() || b.hasReachedDestination();
            if(collisionBetweenGroupMembers && eitherReachedDest){
                a.isAtDestination = b.isAtDestination = true;
            }

            a.setPosition(a.pos.x - res.overlapV.x, a.pos.y - res.overlapV.y);

            var eitherAtDestination = a.hasReachedDestination() || b.hasReachedDestination();
            var bodiesInSameGroup = a.targetPosition.x === b.targetPosition.x && a.targetPosition.y === b.targetPosition.y;

            if(bodiesInSameGroup && eitherAtDestination){
                a.expectedPosition = {x: a.pos.x, y: a.pos.y};
                b.expectedPosition = {x: b.pos.x, y: b.pos.y};
            }
        });

        //this.parent.stateManager.scene.updateBody(this);
        updateManager.queueServerEvent({
            type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
            soldier: this.getSnapshot()
        });
    }


    attackUnit(unitReference){
        this.attackTarget = unitReference;
    }

    //Returns a perfectly serializable object with no refs, this object can be shared between threads
    getSnapshot(){
        return {
            currentPositionX: this.pos.x,
            currentPositionY: this.pos.y,

            expectedPositionX: this.expectedPosition.x,
            expectedPositionY: this.expectedPosition.y,

            type: this.soldierType,

            //Collider
            width: this.w,
            height: this.h,

            health: this.health,
            speed: this.speed,
            damage: this.damage,
            cost: this.cost,

            id: this.id,
            playerId: this.playerId
        }
    }

    //sort of like a destructor
    clearObject(stateManager){
        if(stateManager){

            this.attackTarget=null;

            this.parent=null;
            stateManager.scene.remove(this);
        }
        else
            console.log('Soldier failed to be cleared from Collision-System');
    }
}
module.exports = Soldier