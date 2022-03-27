const CONSTANT = require('../constant');
const {GAMEEVENTS} = CONSTANT;
const PacketType = require('../../common/PacketType');
const {Spearman} = require('../soldiers/Spearman');
import {BaseScene} from './BaseScene';
const {Column, Viewport, Scrollbar} =  require('phaser-ui-tools');
const ClientStateManager = require('../ClientStateManager');

var buttonState=false;
var socket;

var selectorGraphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw=false;

export class GameScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.GAME)
    }

    init()
    {
        socket = io.connect('ws://localhost:3000', {
            reconnection: false
        });

        //Lasso Selection Code
        selectorGraphics = this.add.graphics();
        this.input.on('pointerdown', function(pointer){
            selectorDraw=true;
        })
        this.input.on('pointerup', function(pointer){
            selectorDraw=false;
            selectorGraphics.clear();
        })
        this.input.on('pointermove', function(pointer){
            if(selectorDraw){
                selectorGraphics.clear();
                selectorGraphics.lineStyle(selectorThickness, selectorColor, 1);
                selectorGraphics.strokeRect(pointer.downX, pointer.downY, pointer.x - pointer.downX, pointer.y - pointer.downY);
            }
        });

        

        socket.on('connect', ()=>{
            //register socket with socket manager
            this.stateManager.socket = socket;
        });
        socket.on('disconnect', reason => {
            console.log(reason);
            this.scene.start(CONSTANT.SCENES.MENU);
        });
        this.stateManager = new ClientStateManager(this, socket);

        //tick brings in delta updates
        socket.on('tick',(d)=>{
            let deltaChanges = JSON.parse(d).data;
            console.log('tick--', deltaChanges);
            deltaChanges.forEach(deltaUpdate=>{
                console.log('emitting ', deltaUpdate.type)
                this.events.emit(deltaUpdate.type, deltaUpdate);
            });
        });
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.load.image('knight', "../assets/knight.png");
        this.load.image('spearman', "../assets/spearman.png");
    }
    create(){
        this.add.text(5, 5, "Game Started");
        this.playerReadyStatus = new Column(this, 0, 0, 'knight');

        this.events.on(PacketType.ByServer.PLAYER_INIT, (data)=>{
            console.log('Player Init Packet From Server :', data);
        });
        this.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            console.log('Player Joined Game  : ', data);
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.player.id} Joined`))
        });
        this.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.player.id} Joined`))
        });
        this.events.on(PacketType.ByClient.PLAYER_READY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Ready`))
        });
        this.events.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
            this.playerReadyStatus.addNode(this.add.text(150, 150, `${data.playerId} Marked UnReady`))
        });

        this.events.on(GAMEEVENTS.SOLDIER_SELECTED, (d)=>{
            console.log('Soldier Selected ...',d);
        })
        this.events.on(GAMEEVENTS.SOLDIER_UNSELECTED, (d)=>{

        });

        var ReadyButton = this.add.text(200, 220, "I'm Ready!").setInteractive().on('pointerdown', ()=>{
            buttonState=!buttonState;
            ReadyButton.setColor(buttonState ? 'green':'white');
            if(buttonState)
                socket.emit(PacketType.ByClient.PLAYER_READY, {});
            else 
                socket.emit(PacketType.ByClient.PLAYER_UNREADY,{});
        });
        var QuitButton = this.add.text(700, 220, "Leave Server").setInteractive().on('pointerdown', ()=>{
            console.log("Quit");
            socket.disconnect();
        });

        var x = new Spearman(this, 50,50, 'spearman');
    }
    update(time, delta){
        //console.log('GameScene Update : ', time, delta, 1000/delta)
    }
}