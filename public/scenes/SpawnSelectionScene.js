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
var NetworkManager;
var selectorGraphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw=false;

var pointerDownWorldSpace=null;
var buttonState=false;
var cursors;

export class SpawnSelectionScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.SPAWNSELECTSCENE)
        this.mapWidth=3500;
        this.mapHeight=1500;
    }

    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.load.image('knight', "../assets/knight.png");
        this.load.image('spearman', "../assets/spearman.png");
        this.load.image('map',"../assets/map.png");
        this.load.image('flag',"../assets/flag.jpg");
    }
    create(){

        StateManager = this.registry.get('stateManager');
        NetworkManager = this.registry.get('networkManager');
        socket = this.registry.get('socket');

        this.playerReadyStatus = new Column(this, 0, 120);
        selectorGraphics = this.add.graphics();
        selectorGraphics.clear();

        this.timerBar = new LoadingBar(this, this, {
            x:250, 
            y:150, 
            maxValue:15, 
            currentValue:15, 
            width:800, 
            height:30
        });
        this.input.on('pointerdown', function(pointer)
        {
            if(pointer.button === 0){
                selectorGraphics.clear();
                selectorDraw=true;
                pointerDownWorldSpace = {
                    x: pointer.worldX,
                    y: pointer.worldY
                }
            }
            else if(pointer.button === 1) //mmb
            {
                //middle mouse btn press => create spawn point
                NetworkManager.sendEventToServer(PacketType.ByClient.SPAWN_POINT_REQUESTED, {
                    spawnX: pointer.worldX,
                    spawnY: pointer.worldY
                });
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
            console.log(`[PLAYER_INIT]:`, data);
            const {playerId, players, _} = data;
            StateManager.playerId = playerId;
            players.forEach(player=>{
                StateManager.addPlayer(new Player(player));
            })
        });
        this.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            console.log(`[PLAYER_JOINED]:`, data);
            let player = data.player;
            StateManager.addPlayer(new Player(player));
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${player.id} Joined`))
        });
        this.events.on(PacketType.ByServer.SPAWN_POINT_ACK, ({spawnX, spawnY, playerId})=>{
            this.add.image(spawnX, spawnY, 'flag');
        });
        this.events.on(PacketType.ByServer.COUNTDOWN_TIME, (data)=>{
            let {time} = data;
            if(this.timerBar)
                this.timerBar.decrease(this.timerBar.currentValue - time)
            if(time === 0){
                this.events.shutdown();
                this.scene.launch(CONSTANT.SCENES.GAME);
                this.scene.stop();
            }
        })
        
        this.events.on(PacketType.ByClient.PLAYER_READY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Ready`))
        });
        this.events.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Marked UnReady`))
        });

        
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
            console.log(StateManager);
            if(buttonState)
                NetworkManager.sendEventToServer(PacketType.ByClient.PLAYER_READY, {});
            else
                NetworkManager.sendEventToServer(PacketType.ByClient.PLAYER_UNREADY,{});
        });

        this.events.on('shutdown', (data)=>{
            console.log('shutdown ', data.config.key);
            this.events.removeListener("shutdown");
            this.events.removeListener(PacketType.ByClient.PLAYER_UNREADY);
            this.events.removeListener(PacketType.ByClient.PLAYER_READY);
            this.events.removeListener(PacketType.ByServer.COUNTDOWN_TIME);
            this.events.removeListener(PacketType.ByServer.SPAWN_POINT_ACK);
            this.events.removeListener(PacketType.ByClient.PLAYER_JOINED);
            this.events.removeListener(PacketType.ByServer.PLAYER_INIT);
            this.input.removeListener("pointerdown");
            this.input.removeListener("pointerup");
            this.input.removeListener("pointermove");
        });
        this.events.on("destroy", () => {
            this.input.removeAllListeners();
            this.events.removeAllListeners();
        });
    }
    update(time, delta){
        this.controls.update(delta);
        StateManager.update(time, delta);
        this.timerBar.draw();
    }
}