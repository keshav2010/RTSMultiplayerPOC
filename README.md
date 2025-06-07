# Conquesta-RTS
[![Node.js CI](https://github.com/keshav2010/RTSMultiplayerPOC/actions/workflows/node.js.yml/badge.svg?branch=main)](https://github.com/keshav2010/RTSMultiplayerPOC/actions/workflows/node.js.yml)


# Preview (Debug info is displayed for each unit)

[![Image from Gyazo](https://i.gyazo.com/feeede8b589d2119c8af020fd952c707.gif)](https://gyazo.com/feeede8b589d2119c8af020fd952c707)

Both the GIFs shows basic boid avoidance behaviour
[![Image from Gyazo](https://i.gyazo.com/2dec336b740c0d9ecf454c53cac8991f.gif)](https://gyazo.com/2dec336b740c0d9ecf454c53cac8991f)

# Dev Testing with kubernetes setup:

In case you're on windows, it is recommended to use rancher-desktop to run the infra locally.
* Please Ensure that rancher is setup to use dockerd (moby) instead of containerd as a container-engine.

Additionally, You'll be required to install
1. skaffold
2. redis (run it on windows via docker / rancher) , you may as well use any online hosted redis installation if not willing to setup a local instance of it.


Once you've installed rancher-desktop, and skaffold you're now ready to run the infra locally, use the command 
"npm run setup-local-infra"

This will
1. Create a local registry, where the images will be uploaded.
2. Create a gameserver service.

# DEV Testing without infra/k3s setup
1. npm run build
2. npm run start

