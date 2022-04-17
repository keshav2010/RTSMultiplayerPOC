const CONSTANT = require('../constant');
const {GAMEEVENTS} = CONSTANT;
const PacketType = require('../../common/PacketType');
const {Spearman} = require('../soldiers/Spearman');
import {BaseScene} from './BaseScene';
const SoldierType = require('../../common/SoldierType')
const {Column, Viewport, Scrollbar} =  require('phaser-ui-tools');
const ClientStateManager = require('../ClientStateManager');
const Player = require('../Player');
var $ = require('jquery')

var buttonState=false;
var socket;

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
        socket = io();
        socket.on('connect', ()=>{
            console.log('Connection Established with BE');
        });
        this.stateManager = new ClientStateManager(this);


        //Lasso Selection Code
        selectorGraphics = this.add.graphics();
        this.input.on('pointerdown', function(pointer)
        {
            if(pointer.button === 0){
                selectorGraphics.clear();
                let soldiers = this.scene.stateManager.getPlayer().getSoldiers();
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
                if(this.scene.stateManager.selectedSoldiers.size > 0){

                    //If enemy unit in nearby radius, randomly select 1 and send attack signal
                    let searchAreaSize = 35;
                    let rect = new Phaser.Geom.Rectangle(pointer.worldX-searchAreaSize/2, pointer.worldY-searchAreaSize/2, searchAreaSize, searchAreaSize);
                    selectorGraphics.strokeRectShape(rect);
                    let enemySoldiers = this.scene.stateManager.getOpponentSoldiers();
                    
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
                            soldiers: [...this.scene.stateManager.selectedSoldiers.values()].map(v=>v.id).join(','),
                            targetPlayerId: targetSoldier.playerId,
                            targetSoldierId: targetSoldier.id
                        });
                    }
                    else {
                        socket.emit(PacketType.ByClient.SOLDIER_MOVE_REQUESTED, {
                            soldiers: [...this.scene.stateManager.selectedSoldiers.values()].map(v=>v.id).join(','),
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
            }
            else if(selectorDraw && pointer.button === 0){
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
                let soldiers = this.scene.stateManager.getPlayer().getSoldiers();
                
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
            else if(pointer.button === 1 && pointer.isDown){
                //mmb down
            }
        });

        socket.on('disconnect', reason => {
            this.scene.stop(CONSTANT.SCENES.HUD_SCORE);
            this.scene.start(CONSTANT.SCENES.MENU);
            this.stateManager = null;
        });

        //tick brings in delta updates
        socket.on('tick',(d)=>{
            let deltaChanges = JSON.parse(d).data;
            deltaChanges.forEach(deltaUpdate=>{
                this.events.emit(deltaUpdate.type, deltaUpdate);
            });
        });

        this.scene.launch(CONSTANT.SCENES.HUD_SCORE, this.stateManager);
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.load.image('knight', "../assets/knight.png");
        this.load.image('spearman', "../assets/spearman.png");
        this.load.image('map',"../assets/map.png");
    }
    create(){
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight).setName('WorldCamera');
        this.playerReadyStatus = new Column(this, 0, 120);

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
            this.stateManager.removePlayer(playerId);
        })
        this.events.on(PacketType.ByServer.NEW_CHAT_MESSAGE, (data)=>{
            let {message, playerId} = data;
            addNewChatMessage(message, playerId);
        });
        this.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            let player = data.player;
            this.stateManager.addPlayer(new Player(this, player));
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${player.id} Joined`))
        });
        this.events.on(PacketType.ByClient.PLAYER_READY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Ready`))
        });
        this.events.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Marked UnReady`))
        });
        
        this.events.on(PacketType.ByServer.SOLDIER_CREATE_ACK, ({isCreated, soldier, playerId, soldierType})=>{
            if(!isCreated)
                return;
            console.log('soldier created ',{isCreated, soldier, playerId, soldierType})
            console.log(this.stateManager.ConnectedPlayers);
            this.stateManager.getPlayer(playerId).addSoldier(new Spearman(this, soldier.currentPositionX, soldier.currentPositionY, 'spearman', null, {
                health: soldier.health,
                speed: soldier.speed,
                cost: soldier.cost,
                damage: soldier.damage,
                id: soldier.id
            }))
        });

        this.events.on(PacketType.ByServer.SOLDIER_ATTACKED, (data)=>{

            let {a, b} = data;
            this.stateManager.updateSoldierFromServerSnapshot(a);
            this.stateManager.updateSoldierFromServerSnapshot(b);
        });

        this.events.on(PacketType.ByServer.SOLDIER_KILLED, ({playerId, soldierId})=>{
            
            let soldier = this.stateManager.getPlayer(playerId).getSoldier(soldierId);
            if(soldier.length < 1)
                return;
            soldier = soldier[0];
            this.stateManager.getPlayer(playerId).removeSoldier(soldier);
        });

        this.input.on('wheel', (pointer, gameobjects, deltaX, deltaY, deltaZ)=>{
            this.cameras.main.setZoom(Math.max(0,this.cameras.main.zoom-deltaY*0.0003));
        });

        var ReadyButton = this.add.text(15, 220, "I'm Ready!").setInteractive().on('pointerdown', ()=>{
            buttonState=!buttonState;
            ReadyButton.setColor(buttonState ? 'green':'white');
            if(buttonState)
                socket.emit(PacketType.ByClient.PLAYER_READY, {});
            else
                socket.emit(PacketType.ByClient.PLAYER_UNREADY,{});
        });
        var QuitButton = this.add.text(150, 220, "Leave Server").setInteractive().on('pointerdown', ()=>{
            console.log("Quit");
            socket.disconnect();
        });
    }
    update(time, delta){
        this.controls.update(delta);
        this.stateManager.update(time, delta);
    }
}