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

const app = express();
app.use(cors());
app.use(express.static("dist"));
app.use(express.static("public"));

var clusterWorkersPort = null;
const WorkerIdToPendingHTTPRequest = {};

class SessionManager {
  constructor() {
    this.sessions = {};
  }
  getSessionsByWorkerId(workerId) {
    if (!workerId) return null;
    let sessionsByWorkerId = Object.values(this.sessions).filter(
      (sessionData) => sessionData.workerId === workerId
    );
    return sessionsByWorkerId;
  }
  getSessions(sid = null) {
    if (sid === null) return Object.values(this.sessions);
    return this.sessions[sid] || null;
  }
  killSession(sid) {
    if (sid && this.sessions.hasOwnProperty(sid)) delete this.sessions[sid];
  }
  createNewSession(sid, workerId, isAcceptingNewConnections = true) {
    this.sessions[sid] = {
      sessionId: sid,
      workerId,
      open: isAcceptingNewConnections,
      playerCount: 0,
    };
  }
  updateSession(sid, updateParams) {
    const acceptedParams = ["playerCount", "open"];
    if (typeof updateParams !== "object") {
      throw new Error("updateParams must be an object.");
    } else if (Object.keys(updateParams).length < 1) {
      throw new Error("Atleast 1 update param must be provided.");
    }
    let containsInvalidParam = Object.keys(updateParams).filter(
      (param) => !acceptedParams.includes(param)
    );
    if (containsInvalidParam.length !== 0) {
      throw new Error(`Invalid updateParams found.`);
    }

    this.sessions[sid] = {
      ...this.sessions[sid],
      ...updateParams,
    };
  }
}

class WorkerManager {
  constructor(maxSessionsPerWorker) {
    console.log('maxSessionsPerWorker', maxSessionsPerWorker);
    this.workers = {}; //workerId as a key
    this.MAX_SESSIONS_PER_WORKER = Number(maxSessionsPerWorker);
  }

  //Returns worker which is capable of hosting a new session.
  getAvailableWorker() {
    let availableWorker = null;
    availableWorker =
      Object.values(this.workers).find(
        (workerData) =>
          workerData.sessionManager.getSessions().length <
          this.MAX_SESSIONS_PER_WORKER
      )?.worker || null;
    return availableWorker;
  }

  //Returns array of all workers if no workerId provided,
  //otherwise returns a single worker-data object.
  getWorkers(workerId = null) {
    if(!workerId) {
      return Object.values(this.workers);
    }
    return this.workers[workerId] || null;
  }

  //Creates a new worker process with a session.
  createWorker() {
    let workerInstance = cluster.fork();
    this.workers[workerInstance.id] = {
      worker: workerInstance,
      sessionManager: new SessionManager(),
    };

    this.createSession(workerInstance.id);
    return this.workers[workerInstance.id];
  }
  createSession(wid) {
    const sessionID = uuidv4();
    this.workers[wid]
    .sessionManager
    .createNewSession(sessionID, wid);

    this.workers[wid].worker.send({
      type: "SESSION_CREATE_REQUESTED",
      sessionId: sessionID,
      workerId: wid,
    });
    return sessionID;
  }
  getSessionManager(wid) {
    return this.workers[wid].sessionManager || null;
  }
  getSessions(wid = null) {
    if(!wid) {
      let allSessions = Object.values(this.workers).map(({sessionManager}) => sessionManager.getSessions()).flat(1);
      return allSessions;
    }
    let sessions = this.workers[wid].sessionManager.getSessions();
    return sessions;
  }
  getWorkerBySessionId(sessionId) {
    let worker = Object.values(this.workers).find(worker => {
      worker.sessionManager.getSessions(sessionId) !== null
    });
    if(!worker) return null;
    return worker;
  }
  killWorker(workerId) {
    if(!this.workers.hasOwnProperty(workerId)) {
      console.log(`[WorkerManager/killWorker]: Failed to find worker #${workerId}, either already killed or invalid ID.`);
      return;
    }
    const isDead = this.workers[workerId].worker.isDead();
    console.log(`[WorkerManager/killWorker]: ${workerId} (isDead: ${isDead}) `);
    if(!isDead)
      this.workers[workerId].worker.kill();
    delete this.workers[workerId];
  }
}
const workerManager = new WorkerManager(Number(process.env.MAX_SESSION_PER_WORKER));

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

app.post("/session", async (req, res) => {
  //find worker that can handle new session.
  let availableWorker = workerManager.getAvailableWorker();
  if (!availableWorker) {
    if (workerManager.getWorkers().length >= numCPUs)
      return res.status(503).json({
        message: `Unable to create session, max capacity reached on this instance.`,
        code: "MAX_SESSIONS_REACHED",
      });
    
    //creates a worker with 1 session.
    workerData = workerManager.createWorker();
    availableWorker = workerData.worker;
  }
  else {
    workerManager.createSession(availableWorker.id);
  }
  WorkerIdToPendingHTTPRequest[availableWorker.id] = res;
});

app.get("/sessions", (req, res) => {
  if (!clusterWorkersPort) return res.status(500).send({});
  let { id: sessionId, limit, offset } = req.query;
  limit = limit || 1;
  offset = offset || 0;
  
  if(sessionId) {
    let fetchedSession = workerManager
      .getWorkerBySessionId(sessionId)
      ?.sessionManager?.getSessions(sessionId);
    
      if (!fetchedSession)
        return res.status(404).send();
      return res.status(200).json({
        sessions: [fetchedSession.sessionId],
        port: clusterWorkersPort
      });
  }

  // fetch all available sessions
  let availableSessions = workerManager.getSessions().filter(s => s.open).map(s => s.sessionId);
  return res.status(200).json({
    sessions: availableSessions,
    port: clusterWorkersPort,
  });
});

app.get("*", (req, res) => {
  res.status(404).send();
});

//When any of the workers die
cluster.on("exit", (worker, code, signal) => {
  console.log(`[cluster exit]: Worker #${worker.id} exited | [code:${code}] [signal:${signal}]`);
  workerManager.killWorker(worker.id);
});

//Emitted after the worker IPC channel has disconnected
cluster.on("disconnect", (worker) => {
  console.log(`[cluster-disconnect]: Worker#${worker.id} disconnected: ${worker.isDead()}`);
  workerManager.killWorker(worker.id);
  if (WorkerIdToPendingHTTPRequest.hasOwnProperty(worker.id)) {
    WorkerIdToPendingHTTPRequest[worker.id].status(503).json({
      message: "worker channel has disconnected",
    });
    delete WorkerIdToPendingHTTPRequest[worker.id];
  }
});

cluster.on("message", (worker, message) => {
  console.log('cluster message received : ', message);
  if (message.type === "SESSION_CREATED_ACK") {
    const { sessionId, workerId } = message;
    const responseData = {
      sessionId: sessionId,
      port: clusterWorkersPort,
    };

    WorkerIdToPendingHTTPRequest[worker.id].status(200).json(responseData);
    delete WorkerIdToPendingHTTPRequest[worker.id];
  } 
  else if (message.type === "SESSION_UPDATED") {
    const { sessionId, gameStarted, players } = message;
    workerManager
      .getWorkerBySessionId(sessionId)
      ?.sessionManager.updateSession(sessionId, {
        open: !gameStarted,
        playerCount: players,
      });
  } 
  else if (message.type === "SESSION_DESTROYED") {
    const { sessionId, workerId } = message;
    console.log(`master: Received SESSION_DESTROYED: Killing session(${sessionId})`);
    workerManager.getSessionManager(workerId).killSession(sessionId);
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
