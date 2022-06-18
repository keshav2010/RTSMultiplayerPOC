
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
        this.expectedPosition = new SAT.Vector(params.x, params.y);

        //actual position requested by client
        this.targetPosition = new SAT.Vector(params.x, params.y); 

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
        
        //Boid
        this.steeringVector = new SAT.Vector(0, 0);
        this.accelerationVector = new SAT.Vector(0, 0);
        this.velocityVector = new SAT.Vector(0, 0);
        //this.pos => current location
    }

    //get steering force
    setTargetVector(targetVector){
        this.targetVector = targetVector;
    }

    getSteerVector(targetVector){
        var desiredVector = new SAT.Vector().copy(targetVector);
        desiredVector.sub(this.pos);
        if(desiredVector.len() > this.speed){
            desiredVector.normalize().scale(this.speed)
        }
        var steerVector = new SAT.Vector().copy(desiredVector);
        steerVector.sub(this.velocityVector);
        return steerVector.normalize();
    }
    applyForce(forceVector){
        this.accelerationVector.add(forceVector);
    }
    setPosition(x,y){
        this.pos = new SAT.Vector(x,y);
        this.x = x;
        this.y = y;
    }
    hasReachedDestination(){
        let diffVector = new SAT.Vector(this.targetPosition.x - this.pos.x, this.targetPosition.y - this.pos.y);
        let mag = diffVector.len();
        return (mag < 15  || this.isAtDestination);
    }

    setTargetPosition(x,y){
        this.targetPosition = new SAT.Vector(x,y);
        this.expectedPosition = new SAT.Vector(x,y);
        this.isAtDestination=false;
        this.attackTarget=null;
        this.stateMachine.controller.send('Move');
    }

    tick(delta, updateManager, stateManager){

        //get forces
        this.applyForce(this.getSteerVector(this.expectedPosition));

        //move object
        let lastPos = new SAT.Vector().copy(this.pos);
        if(this.velocityVector.len() > this.speed){
            this.velocityVector.normalize().scale(this.speed);
        }
        this.pos.add(this.velocityVector);
        this.x = this.pos.x;
        this.y = this.pos.y;
        this.velocityVector = new SAT.Vector().copy(this.pos).sub(lastPos).add(this.accelerationVector);

        //check collision
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
                a.expectedPosition.copy(a);
                b.expectedPosition.copy(b);
            }
        });

        //if attack target set, chase them and/or attack
        switch(this.stateMachine.currentState){
            case 'Idle': this.Idle(delta, updateManager, stateManager); break;
            case 'Move': this.Move(delta, updateManager, stateManager); break;
            case 'ChaseTarget': this.ChaseTarget(delta, updateManager, stateManager); break;
            case 'Attack': this.Attack(delta, updateManager, stateManager); break;
            case 'FindTarget': this.FindTarget(delta, updateManager, stateManager); break;
            case 'Defend': this.Defend(delta, updateManager, stateManager); break;
        }
        this.accelerationVector.scale(0);
    }

    Idle(delta, updateManager, stateManager){
        //in idle state
    }

    //this method is called when object is moving toward a target.
    Move(delta, updateManager, stateManager){
        let diffVector = new SAT.Vector(this.pos.x, this.pos.y).sub(this.expectedPosition);
        updateManager.queueServerEvent({
            type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
            soldier: this.getSnapshot()
        });
        if(diffVector.len() < 5){
            this.velocityVector.scale(0);
            this.stateMachine.controller.send('ReachedPosition')
        }
    }
    Attack(delta, updateManager, stateManager){
        let diffVector = new SAT.Vector().copy(this.attackTarget.pos).sub(this.pos);
        if(diffVector.len() > this.width){
            this.stateMachine.controller.send('TargetNotInRange');
            return;
        }
        console.log('attack ', this.attackTarget)
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
            if(!this.attackTarget){
                console.log('attackTarget is not defined, current state = ', this.stateMachine.currentState)
                return;
            }
            //if target-soldier not found, cancel the hunt
            if(!stateManager.SocketToPlayerData.get(this.attackTarget.playerId).getSoldier(this.attackTarget.id))
            {
                this.targetPosition.copy(this.pos);
                this.expectedPosition.copy(this.pos);
                this.attackTarget=null;
                return;
            }
            this.targetPosition.copy(this.attackTarget.pos);
            this.expectedPosition.copy(this.attackTarget.pos);

            //this.parent.stateManager.scene.updateBody(this);
            updateManager.queueServerEvent({
                type: PacketType.ByServer.SOLDIER_POSITION_UPDATED,
                soldier: this.getSnapshot()
            });
        }
        catch(err)
        {
            console.log(err);
            this.targetPosition.copy(this.attackTarget.pos);
            this.expectedPosition.copy(this.targetPosition);
            this.attackTarget=null;
        }
    }
    attackUnit(unitReference){
        this.attackTarget = unitReference;
        this.stateMachine.controller.send('Attack')
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