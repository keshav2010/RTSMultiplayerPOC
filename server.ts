import cluster from "cluster";
import dotenv from "dotenv";
dotenv.config();

async function start() {
  if (cluster.isPrimary) {
    await import("./master");
    // Use the imported 'master' module here
  } else {
    await import("./worker");
    // Use the imported 'worker' module here
  }
}

start();
