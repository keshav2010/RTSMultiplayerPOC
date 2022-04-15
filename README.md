# RTSMultiplayerPOC
Multiplayer RTS Dedicated Game Server written in NodeJS for a small-scale game.

Approach

1. Client send their Inputs/State
2. Server pushes client requests in a stack/LIFO approach
3. Server update game state in each tick (gameserver may ideally have a tick rate of say 10, i.e 100ms are allocated for each tick)
4. Server also builds a cumulativeUpdate packet (delta updates)
5. Server send back delta updates (stored in cumulativeUpdate array) back to all clients

This is a timestep based approach that makes sure server only send delta updates back to all clients instead of whole game state.

As shown in this gif below, server is running at tickrate of 15 and not doing much computation apart from moving units.
![TickRate15](https://media.giphy.com/media/MqarH02vUbLk0t6q4q/giphy.gif)

Another gif, with even more soldier units, server sending position at tick rate of 75 in this example. (just playin around)
![TickRate75](https://media.giphy.com/media/dqC9pJBTrHiztFfNr9/giphy.gif)

---- With Collision---
Latest Updates after collision detection lib. integrated, easily able to handle upwards of 500 units (not tested with more)
![Alt Text](https://media.giphy.com/media/KCPZcYd3PSkRwAsWNC/giphy.gif)

More Units
![Alt Text](https://media.giphy.com/media/uPMNVzFXLdrv3ECKku/giphy.gif)
