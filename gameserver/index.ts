 /**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to host your server on Colyseus Cloud
 *
 * If you're self-hosting (without Colyseus Cloud), you can manually
 * instantiate a Colyseus Server as documented here:
 *
 * See: https://docs.colyseus.io/server/api/#constructor-options
 */
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import { createServer } from "http";
import { nanoid } from 'nanoid';
import { matchMaker, RedisDriver, RedisPresence, Server } from "colyseus";
import { SessionRoom } from "./SessionRoom";
import { playground } from "@colyseus/playground";
import { monitor } from "@colyseus/monitor";
import path from "path";
import fs from "fs";
import { readFile } from "fs/promises";
import basicAuth from "express-basic-auth";
import { ITiled2DMap } from "../common/ITiled2DMap";
console.log(process.env);
console.log('***********************************')


console.log(process.env);
console.log('***********************************')

const username = process.env.ADMIN_USERNAME as string;
const password = process.env.ADMIN_PASSWORD as string;
const basicAuthMiddleware = basicAuth({
  users: {
    [username]: password,
  },
  // sends WWW-Authenticate header, which will prompt the user to fill
  // credentials in
  challenge: true,
});

const PORT = Number(process.env.PORT) + Number(process.env.NODE_APP_INSTANCE || 0);
const app = express();
app.use(express.json());

app.use(express.static("dist"));
app.use(express.static("public"));
app.use(express.static("static"));

/**
 * Use @colyseus/monitor
 * It is recommended to protect this route with a password
 * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
 */
app.use("/monitor", basicAuthMiddleware, monitor());
app.use("/playground", basicAuthMiddleware, playground);

const cachedMap = new Map<
  string,
  ITiled2DMap
>();

async function loadMap(filename: string) {
  const pathName = path.resolve(__dirname, "static", "maps");
  const fp = path.resolve(pathName, `${filename}.json`);
  if (cachedMap.get(fp)) {
    return cachedMap.get(fp);
  }
  const data = JSON.parse(await readFile(fp, { encoding: "utf8" }));
  cachedMap.set(filename, data);
  return data as ITiled2DMap;
}

app.get('/liveness', async (req, res) => {
  return res.status(200).send();
})
app.get("/", async (req, res) => {
  try {
    const pathName = path.resolve(__dirname, "dist");
    const files = await fs.promises.readdir(pathName);
    const filename = files.find((file) => path.extname(file) === ".html");
    if (!filename) {
      console.log(`Serving back 500`);
      return res
        .status(500)
        .send(`<h1>ERROR! No HTML files found in ${pathName}</h1>`);
    }
    const filepath = path.resolve(pathName, filename);
    const stats = await fs.promises.stat(filepath);
    console.log(`Serving : ${filepath}`);
    if (!stats.isFile()) {
      return res.status(500).send(`<h1>ERROR! ${filename} is not a file.</h1>`);
    }
    console.log(`Serving : ${filepath}`);
    res.sendFile(filepath);
  } catch (err) {
    console.error(err);
    res.status(500).send("<h1>Internal Server Error, Try again later.</h1>");
  }
});

app.get("/maps", async (req, res) => {
  try {
    const requestedFile = <string>req.query.id;
    const jsonMap = await loadMap(requestedFile);
    if (!jsonMap)
      throw new Error(`map not found`);
    return res.status(200).json({
      data: jsonMap,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Error fetching map",
    });
  }
});
console.log('NODE_APP_INSTANCE: ', process.env.NODE_APP_INSTANCE);
const publicAddressForProcess = `server-${nanoid()}.${process.env.PUBLIC_ADDRESS}`;
const redisOption = {
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD
}

console.log('public address of process: ', publicAddressForProcess);
const gameServer = new Server({
  server: createServer(app),
  presence: new RedisPresence(redisOption),
  driver: new RedisDriver(redisOption),
  publicAddress: publicAddressForProcess,
  selectProcessIdToCreateRoom: async function (roomName: string, clientOptions: any) {
    // process with least connection atm is picked for room creation
    const pid = (await matchMaker.stats.fetchAll())
      .sort((p1, p2) => p1.ccu > p2.ccu ? 1 : -1)[0]
      .processId;
    console.log('process picked for room creation: ', pid);
    return pid;
  },
});
gameServer.define("session_room", SessionRoom);

gameServer.listen(PORT, undefined, undefined, () => {
  console.log("SERVER WILL BE LISTENING ON PORT ", PORT, 'with ws-server ', publicAddressForProcess);
});
