const {Worker, isMainThread, parentPort, workerData} = require('worker_threads');

var gameState = {};
function tick(script){
    setImmediate(tick);
}
parentPort.on('message', (msg)=>{
    let obj = JSON.parse(msg);
    switch(obj.packetType){
    
    }
})
setImmediate(tick);