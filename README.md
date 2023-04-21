# RTSMultiplayerPOC
[![Node.js CI](https://github.com/keshav2010/RTSMultiplayerPOC/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/keshav2010/RTSMultiplayerPOC/actions/workflows/node.js.yml)

Multiplayer RTS Dedicated Game Server written in NodeJS for a small-scale game.

Approach

1. Client send their Inputs/State
2. Server pushes client requests in a FIFO approach
3. Server update game state in each tick (gameserver may ideally have a tick rate of say 10, i.e 100ms are allocated for each tick)
4. Server also builds a cumulativeUpdate packet (delta updates)
5. Server send back delta updates (stored in cumulativeUpdate array) back to all clients

This is a timestep based approach that makes sure server only send delta updates back to all clients instead of whole game state.

# Preview (Debug info is displayed for each unit)

[![Image from Gyazo](https://i.gyazo.com/2dec336b740c0d9ecf454c53cac8991f.gif)](https://gyazo.com/2dec336b740c0d9ecf454c53cac8991f)
