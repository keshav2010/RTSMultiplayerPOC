const CONSTANT = require('../constant');
const {GAMEEVENTS} = CONSTANT;
const PacketType = require('../../common/PacketType');
const {Spearman} = require('../soldiers/Spearman');
import {BaseScene} from './BaseScene';
const {Column} =  require('phaser-ui-tools');
const {ClientStateManager} = require('../ClientStateManager');

var buttonState=false;
var socket;

var selectorGraphics;
var selectorColor = 0xffff00;
var selectorThickness = 2;
var selectorDraw=false;

export class GameScene extends BaseScene {
    constructor(){
        super(CONSTANT.SCENES.GAME)
        this.playerReadyStatus = new Column(this, 100, 50);
        this.stateManager = new ClientStateManager(socket);
    }

    init()
    {
        socket = io.connect('ws://localhost:3000', {
            reconnection: false
        });

        //Lasso Selection Code
        selectorGraphics = this.add.graphics();
        this.input.on('pointerdown', function(pointer){
            console.log('mouse clicked at ', pointer);
            selectorDraw=true;
        })
        this.input.on('pointerup', function(pointer){
            console.log('mouse released');
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

        this.events.on(PacketType.ByClient.PLAYER_JOINED, (data)=>{
            console.log('Player Joined Game  : ', data);
            this.playerReadyStatus.addNode(this.add.text(this, 0, 0, `${data.playerId} Joined`))
        });
        this.events.on(PacketType.ByClient.PLAYER_READY, (data)=>{
            console.log('Player Ready  : ', data);
            this.playerReadyStatus.addNode(this.add.text(this, 0, 0, `${data.playerId} Ready`))
        });
        this.events.on(PacketType.ByClient.PLAYER_UNREADY, (data)=>{
            console.log('Player Unready  : ', data);
            this.playerReadyStatus.addNode(this.add.text(this, 0, 0, `${data.playerId} Marked UnReady`))
        });

        socket.on('connect', ()=>{
            //register socket with socket manager
            this.stateManager.socket = socket;
        });
        socket.on('disconnect', reason => {
            console.log(reason);
            this.scene.start(CONSTANT.SCENES.MENU);
        });

        //tick brings in delta updates
        socket.on('tick',(d)=>{
            let deltaChanges = JSON.parse(d).data;
            console.log('tick--', deltaChanges);
            
            deltaChanges.forEach(deltaUpdate=>{
                this.events.emit(deltaUpdate.type, deltaUpdate);
            });
        });
    }
    preload(){
        this.load.image('playbutton', "../assets/playbutton.png");
        this.load.image('knight', "../assets/knight.png");
        this.load.image('spearman', "../assets/spearman.png");
        console.log('about to make spearman');
    }
    create(){
        var t = this.add.text(0, 0, "Game Started");

        var ReadyButton = this.add.text(200, 220, "I'm Ready!").setInteractive().on('pointerdown', ()=>{
            console.log("I'm Ready");
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
        })
        var x = new Spearman(this, 50,50, 'spearman');
    }
    update(time, delta){
        //console.log('GameScene Update : ', time, delta, 1000/delta)
    }
}