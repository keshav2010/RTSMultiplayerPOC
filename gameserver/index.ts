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
import express from "express";
import { createServer } from "http";
import { Server } from "colyseus";
import { SessionRoom } from "./SessionRoom";
import cors from "cors";
import { playground } from "@colyseus/playground";
import { monitor } from "@colyseus/monitor";
import path from "path";
import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();
const PORT = process.env.COLYSEUS_SERVER_PORT;
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("dist"));
app.use(express.static("public"));
if (process.env.NODE_ENV !== "production") {
  app.use("/playground", playground);
}

/**
 * Use @colyseus/monitor
 * It is recommended to protect this route with a password
 * Read more: https://docs.colyseus.io/tools/monitor/#restrict-access-to-the-panel-using-a-password
 */
app.use("/monitor", monitor());

app.get("/", async (req, res) => {
  try {
    const pathName = path.resolve(__dirname, "dist");
    const files = await fs.promises.readdir(pathName);
    const filename = files.find((file) => path.extname(file) === ".html");
    if (!filename) {
      return res
        .status(500)
        .send(`<h1>ERROR! No HTML files found in ${pathName}</h1>`);
    }
    const filepath = path.resolve(pathName, filename);
    const stats = await fs.promises.stat(filepath);
    if (!stats.isFile()) {
      return res.status(500).send(`<h1>ERROR! ${filename} is not a file.</h1>`);
    }
    res.sendFile(filepath);
  } catch (err) {
    console.error(err);
    res.status(500).send("<h1>Internal Server Error, Try again later.</h1>");
  }
});

const gameServer = new Server({
  server: createServer(app),
  // transport: new uWebSocketsTransport(),
  // driver: new RedisDriver(),
  // presence: new RedisPresence(),
});
gameServer.define("session_room", SessionRoom);
gameServer.listen(Number(PORT));
