const CONSTANT = require('../constant');
const {GAMEEVENTS} = CONSTANT;
const PacketType = require('../../common/PacketType');
const {Spearman} = require('../soldiers/Spearman');
import {BaseScene} from './BaseScene';
const SoldierType = require('../../common/SoldierType')
const {Column, Viewport, Scrollbar} =  require('phaser-ui-tools');
const Player = require('../Player');
var $ = require('jquery');

var selectorGraphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw=false;

var pointerDownWorldSpace=null;
var cursors;
$(()=>{
    $('#send-chat-btn').on('click', function(){
        SendChatMessage()
    })
})

function SendChatMessage()
{
    try{
        var socket = this.registry.get('socket');
        var messageText = $('#chat-message').val();
        console.log('message : ', messageText);
        socket.emit(PacketType.ByClient.CLIENT_SENT_CHAT, {
            message: messageText
        });
    }
    catch(err){
        console.error(err);
    }
}
function addNewChatMessage(msg, sender){
    let msgBlock = `<div>
        <div class="d-flex justify-content-between">
            <p class="small mb-1">${sender}</p>
        </div>
        <div class="d-flex flex-row justify-content-start">
            <div>
                <p style="background-color: #f5f6f7;">
                    ${msg}
                </p>
            </div>
        </div>
    </div>`
    $('.card-body').append(msgBlock);
}

export class GameScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.GAME)
        this.mapWidth=3500;
        this.mapHeight=1500;
    }

    init()
    {
        var StateManager = this.registry.get('stateManager');
        this.stateManager = StateManager;
        var socket = this.registry.get('socket');

        console.log('GameScene started');

        this.events.on(PacketType.ByServer.SOLDIER_POSITION_UPDATED, (data)=>{
            var {soldier, type} = data;
            StateManager.ConnectedPlayers.get(soldier.playerId).getSoldiers().forEach(s =>{
                if(s.id === soldier.id){
                    //no interpolation applied for now
                    s.x = soldier.currentPositionX;
                    s.y = soldier.currentPositionY;
                    s.expectedPositionX = soldier.currentPositionX;
                    s.expectedPositionY = soldier.currentPositionY;
                }
            });
        })
        this.events.on(GAMEEVENTS.SOLDIER_SELECTED, (d)=>{
            StateManager.selectedSoldiers.set(d.id, d);
        });

        selectorGraphics = this.add.graphics();
        this.input.on('pointerdown', function(pointer)
        {
            if(pointer.button === 0){ //lmb
                selectorGraphics.clear();
                let soldiers = StateManager.getPlayer().getSoldiers();
                soldiers.forEach(soldier=>{
                    soldier.markUnselected();
                });
                selectorDraw=true;
                pointerDownWorldSpace = {
                    x: pointer.worldX,
                    y: pointer.worldY
                }
            }
            else if(pointer.button === 1) //mmb
            {
                //middle mouse btn press => create spearman
                socket.emit(PacketType.ByClient.SOLDIER_CREATE_REQUESTED, {
                    soldierType: SoldierType.SPEARMAN,
                    currentPositionX: pointer.worldX,
                    currentPositionY: pointer.worldY
                });
            }
            else if(pointer.button === 2){
                
                //if any soldier selected
                if(StateManager.selectedSoldiers.size > 0){

                    //If enemy unit in nearby radius, randomly select 1 and send attack signal
                    let searchAreaSize = 35;
                    let rect = new Phaser.Geom.Rectangle(pointer.worldX-searchAreaSize/2, pointer.worldY-searchAreaSize/2, searchAreaSize, searchAreaSize);
                    selectorGraphics.strokeRectShape(rect);
                    let enemySoldiers = StateManager.getOpponentSoldiers();
                    
                    let targetSoldier=null;
                    for(let i=0; i<enemySoldiers.length; i++){
                        let soldier = enemySoldiers[i]
                        let bound = soldier.getBounds();
                        if(Phaser.Geom.Intersects.RectangleToRectangle(bound, rect)){
                            targetSoldier = soldier;
                            break;
                        }
                    }

                    //if wants to attack a soldier, mark it as target
                    if(targetSoldier) {
                        socket.emit(PacketType.ByClient.SOLDIER_ATTACK_REQUESTED, {
                            soldiers: [...StateManager.selectedSoldiers.values()].map(v=>v.id).join(','),
                            targetPlayerId: targetSoldier.playerId,
                            targetSoldierId: targetSoldier.id
                        });
                    }
                    else {
                        socket.emit(PacketType.ByClient.SOLDIER_MOVE_REQUESTED, {
                            soldiers: [...StateManager.selectedSoldiers.values()].map(v=>v.id).join(','),
                            expectedPositionX: pointer.worldX,
                            expectedPositionY: pointer.worldY
                        });
                    }
                }   
                
                //this.scene.events.emit(GAMEEVENTS.RIGHT_CLICK, pointer.position);
            }
        })
        this.input.on('pointerup', function(pointer){
            selectorDraw=false;
            selectorGraphics.clear();
            pointerDownWorldSpace = null;
        })
        this.input.on('pointermove', function(pointer){
            if(!pointer.isDown){
                selectorGraphics.clear();
                return;
            }
            if(selectorDraw && pointer.button === 0){
                selectorGraphics.clear();
                selectorGraphics.lineStyle(selectorThickness, selectorColor, 1);

                let rect = new Phaser.Geom.Rectangle(pointerDownWorldSpace.x, pointerDownWorldSpace.y, pointer.worldX - pointerDownWorldSpace.x, pointer.worldY - pointerDownWorldSpace.y);
                if(rect.width < 0){
                    rect.x += rect.width;
                    rect.width = Math.abs(rect.width);
                }
                if(rect.height < 0){
                    rect.y += rect.height;
                    rect.height = Math.abs(rect.height);
                }
                selectorGraphics.strokeRectShape(rect);

                //for every sprite belonging to this player, check if it overlaps with rect
                let soldiers = StateManager.getPlayer().getSoldiers();
                
                soldiers.forEach(soldier=>{
                    let bound = soldier.getBounds();
                    if(Phaser.Geom.Intersects.RectangleToRectangle(bound, rect)){
                        soldier.markSelected();
                    }
                    else{
                        soldier.markUnselected();
                    }
                });
            }
            else if(pointer.button === 2 && pointer.isDown){
                //mmb down
                this.cameras.main.scrollX -= (pointer.x - pointer.prevPosition.x)/this.cameras.main.zoom;
                this.cameras.main.scrollY -= (pointer.y - pointer.prevPosition.y)/this.cameras.main.zoom;
            }
        });
        this.scene.launch(CONSTANT.SCENES.HUD_SCORE);
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.load.image('knight', "../assets/knight.png");
        this.load.image('spearman', "../assets/spearman.png");
        this.load.image('map',"../assets/map.png");
        this.load.image('flag',"../assets/flag.jpg");
    }
    create(){
        var socket = this.registry.get('socket');
        var StateManager = this.registry.get('stateManager');

        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight).setName('WorldCamera');
        
        var mapGraphics = this.add.graphics();
        mapGraphics.depth=-5;
        mapGraphics.fillStyle(0x002200, 1);
        mapGraphics.fillRect(0,0,this.mapWidth,this.mapHeight);

        cursors = this.input.keyboard.createCursorKeys();
        const controlConfig = {
            camera: this.cameras.main,
            left: cursors.left,
            right: cursors.right,
            up: cursors.up,
            down: cursors.down,
            drag:0.001,
            acceleration: 0.02,
            maxSpeed: 1.0
        };
        this.controls = new Phaser.Cameras.Controls.SmoothedKeyControl(controlConfig);

        this.events.on(PacketType.ByServer.PLAYER_LEFT, (data)=>{
            let {playerId} = data;
            StateManager.removePlayer(playerId);
        })
        this.events.on(PacketType.ByServer.NEW_CHAT_MESSAGE, (data)=>{
            let {message, playerId} = data;
            addNewChatMessage(message, playerId);
        });
        this.events.on(PacketType.ByServer.SOLDIER_CREATE_ACK, ({isCreated, soldier, playerId, soldierType})=>{
            if(!isCreated)
                return;
            StateManager.getPlayer(playerId).addSoldier(new Spearman(this, soldier.currentPositionX, soldier.currentPositionY, 'spearman', null, {
                health: soldier.health,
                speed: soldier.speed,
                cost: soldier.cost,
                damage: soldier.damage,
                id: soldier.id,
                color: StateManager.getPlayer(playerId).color
            }))
        });
        this.events.on(PacketType.ByServer.SOLDIER_ATTACKED, (data)=>{

            let {a, b} = data;
            StateManager.updateSoldierFromServerSnapshot(a);
            StateManager.updateSoldierFromServerSnapshot(b);
        });
        this.events.on(PacketType.ByServer.SOLDIER_KILLED, ({playerId, soldierId})=>{
            
            let soldier = StateManager.getPlayer(playerId).getSoldier(soldierId);
            if(soldier.length < 1)
                return;
            soldier = soldier[0];
            StateManager.getPlayer(playerId).removeSoldier(soldier);
        });

        this.input.on('wheel', (pointer, gameobjects, deltaX, deltaY, deltaZ)=>{
            this.cameras.main.setZoom(Math.max(0,this.cameras.main.zoom-deltaY*0.0003));
        });
        var QuitButton = this.add.text(150, 220, "Leave Game").setInteractive().on('pointerdown', ()=>{
            socket.disconnect();
            this.scene.stop(CONSTANT.SCENES.HUD_SCORE)
        });
        this.events.on('shutdown', (data)=>{
            console.log('shutdown ', data.config.key);
            this.input.removeAllListeners();
            this.events.removeAllListeners();
        })
    }
    update(time, delta){
        var StateManager = this.registry.get('stateManager');
        this.controls.update(delta);
        StateManager.update(time, delta);
    }
}