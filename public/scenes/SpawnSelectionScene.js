const CONSTANT = require('../constant');
const {GAMEEVENTS} = CONSTANT;
const PacketType = require('../../common/PacketType');
const {Spearman} = require('../soldiers/Spearman');
import {BaseScene} from './BaseScene';
const SoldierType = require('../../common/SoldierType')
const {Column, Viewport, Scrollbar} =  require('phaser-ui-tools');
const Player = require('../Player');
var $ = require('jquery')
const LoadingBar = require('../LoadingBar')

var socket;
var StateManager;
var selectorGraphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw=false;

var pointerDownWorldSpace=null;
var cursors;

export class SpawnSelectionScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.SPAWNSELECTSCENE)
        this.mapWidth=3500;
        this.mapHeight=1500;
    }

    init()
    {
        StateManager = this.registry.get('stateManager');
        socket = this.registry.get('socket');
        console.log('SpawnSelectionScene Started');
        this.playerReadyStatus = new Column(this, 0, 120);

        selectorGraphics = this.add.graphics();

        this.timerBar = new LoadingBar(this, this, {x:250, y:150, maxValue:15, currentValue:15, width:800, height:50});

        this.input.on('pointerdown', function(pointer)
        {
            if(pointer.button === 0){
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
        
        this.events.on(PacketType.ByServer.PLAYER_INIT, (data)=>{
            const {playerId, players, _} = data;
            StateManager.playerId = playerId;
            players.forEach(player=>{
                StateManager.addPlayer(new Player(player));
            })
        });

        this.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            let player = data.player;
            StateManager.addPlayer(new Player(player));
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${player.id} Joined`))
        });
        this.events.on(PacketType.ByServer.COUNTDOWN_TIME, (data)=>{
            let {time} = data;
            console.log('time remaining ', time);
            if(this.timerBar)
                this.timerBar.decrease(this.timerBar.currentValue - time)
        })
        
        this.events.on(PacketType.ByClient.PLAYER_READY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Ready`))
        });
        this.events.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Marked UnReady`))
        });
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.load.image('knight', "../assets/knight.png");
        this.load.image('spearman', "../assets/spearman.png");
        this.load.image('map',"../assets/map.png");
        this.load.image('flag',"../assets/flag.jpg");
    }
    create(){
        this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight).setName('WorldCamera');
        var mapGraphics = this.add.graphics();

        mapGraphics.depth=-5;
        mapGraphics.fillStyle(0x221200, 1);
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
    }
    update(time, delta){
        this.controls.update(delta);
        StateManager.update(time, delta);
        this.timerBar.draw();
    }
}