const cluster = require("cluster");
const http = require("http");
const numCPUs = require("os").cpus().length;
const url = require("url");
const express = require("express");
const PORT = process.env.PORT || 3000;
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const cors = require("cors");
const nbLoop = require("./common/nonBlockingLoop");

//worker id to session id
const WorkerDict = {};
var clusterWorkersPort = null;
const WorkerIdToPendingHTTPRequest = {};
const SessionInfo = {};

const MAX_SESSION_PER_WORKER = process.env.MAX_SESSION_PER_WORKER;
const app = express();
app.use(cors());
app.use(express.static("dist"));
app.use(express.static("public"));
const server = http.createServer(app);

// Serve HTML
app.get("/", async function (req, res) {
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

app.post("/session", (req, res) => {
  console.log("SESSION CREATE REQUEST");
  //find worker where session can be created.
  let availableWorker = Object.values(WorkerDict).find(
    (workerData) => workerData.sessions.length < Number(MAX_SESSION_PER_WORKER)
  )?.worker;
  const usingExistingWorker = availableWorker !== undefined;
  if (!availableWorker) {
    if (Object.keys(WorkerDict) >= numCPUs)
      return res.status(503).json({
        message: `Unable to create session, max capacity reached on this instance.`,
        code: "MAX_SESSIONS_REACHED",
      });

    // spawn a new worker.
    availableWorker = cluster.fork();
  }

  //if is a new worker, create details object, otherwise fetch it from dict.
  const sessionId = uuidv4();
  const workerDetail = !usingExistingWorker
    ? {
        sessions: [],
        worker: availableWorker,
      }
    : WorkerDict[availableWorker.id];
  workerDetail.sessions.push(sessionId);

  //update dict.
  WorkerDict[availableWorker.id] = workerDetail;
  WorkerIdToPendingHTTPRequest[availableWorker.id] = res;
  availableWorker.send({
    type: "SESSION_INIT",
    sessionId: sessionId,
    workerId: availableWorker.id,
  });
});

app.get("/sessions", (req, res) => {
  if (!clusterWorkersPort) return res.status(500).send({});
  let { id: sessionId, limit, offset } = req.query;
  limit = limit || 1;
  offset = offset || 0;
  if (
    //if sessionId not provided or, if provided but is invalid.
    typeof sessionId === "undefined" ||
    Object.values(WorkerDict).filter((worker) =>
      worker.sessions.includes(sessionId)
    ).length === 0
  ) {
    if (typeof sessionId !== "undefined")
      return res.status(404).json({
        sessions: [],
        port: null,
      });
    let availableSessions = Object.values(WorkerDict)
      .map((worker) =>
        worker.sessions.filter((sessionId) => SessionInfo[sessionId].open)
      )
      .flat(1);
    return res.status(200).json({
      sessions: availableSessions.map((sessionId) => SessionInfo[sessionId]),
      port: clusterWorkersPort,
    });
  }
});

app.get("*", (req, res) => {
  res.statusCode(404).send();
});

//When any of the workers die
cluster.on("exit", (worker, code, signal) => {
  console.log(`Worker ${worker.id} exited with code ${code}, signal ${signal}`);
  delete WorkerDict[worker.id];
});

//Emitted after the worker IPC channel has disconnected
cluster.on("disconnect", (worker) => {
  console.log(`[cluster-disconnect]: Worker#${worker.id} disconnected`);
  WorkerDict[worker.id].sessions.forEach((sessionId) => {
    delete SessionInfo[sessionId];
  });
  delete WorkerDict[worker.id];
  if (WorkerIdToPendingHTTPRequest.hasOwnProperty(worker.id)) {
    WorkerIdToPendingHTTPRequest[worker.id].status(503).json({
      message: "worker channel has disconnected",
    });
    delete WorkerIdToPendingHTTPRequest[worker.id];
  }
});

cluster.on("message", (worker, message) => {
  if (message.type === "SESSION_CREATED") {
    const { sessionId, workerId } = message;
    const responseData = {
      sessionId: sessionId,
      port: clusterWorkersPort,
    };
    SessionInfo[sessionId] = {
      ...(SessionInfo[sessionId] || {}),
      open: true,
      sessionId: sessionId,
      workerId
    };

    WorkerIdToPendingHTTPRequest[worker.id].status(200).json(responseData);
    delete WorkerIdToPendingHTTPRequest[worker.id];
  } 
  else if (message.type === "SESSION_UPDATE") {
    const { sessionId, gameStarted, players } = message;
    SessionInfo[sessionId] = {
      open: !gameStarted,
      playerCount: players,
      ...(SessionInfo[sessionId] || {}),
    };
  } 
  else if (message.type === "SESSION_DESTROYED") {
    const { sessionId, workerId } = message;

    let sessionIndex = WorkerDict[workerId].sessions.indexOf(sessionId);
    if (sessionIndex > -1)
      WorkerDict[workerId].sessions.splice(sessionIndex, 1);
    delete SessionInfo[sessionId];
  }
});

cluster.on("listening", (worker, address) => {
  console.log(
    `[cluster:listening] Worker ${worker.id} ready to accept sessions (port ${address.port})`
  );
  clusterWorkersPort = clusterWorkersPort || address.port;
});

server.listen(PORT, () => {
  console.log(`Master HTTP Server listening on port ${server.address().port}`);
});
