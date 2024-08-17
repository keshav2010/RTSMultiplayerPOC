// ecosystem.config.js
module.exports = {
    apps: [{
        port        : 3000,
        name        : "colyseus-rts-gameserver",
        script      : "gameserver_dist/gameserver/index.js", // your entrypoint file
        watch       : true,           // optional
        instances   : 1,
        exec_mode   : 'fork',         // IMPORTANT: do not use cluster mode.
        env: {
            DEBUG: "colyseus:errors",
            NODE_ENV: "production",
        }
    }]
}