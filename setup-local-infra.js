const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync, spawn } = require("child_process");
const readline = require("readline");

const TRAEFIK_NAMESPACE = "kube-system";
const TRAEFIK_SERVICE = "traefik";
const TRAEFIK_PORT = 80;
const LOCAL_FORWARD_PORT = 8080;

function isWindows() {
  return os.platform().startsWith("win");
}

function execCmd(cmd) {
  try {
    return execSync(cmd, { stdio: "pipe" }).toString().trim();
  } catch (e) {
    return null;
  }
}

function startLocalRegistry() {
  const registryName = "local-registry";
  const registryPort = 5000;

  try {
    const existing = execCmd(`docker ps --filter "name=${registryName}" --format "{{.Names}}"`);

    if (existing === registryName) {
      console.log(`✅ Registry '${registryName}' is already running.`);
      return;
    }

    console.log(`📦 Starting local Docker registry '${registryName}' on port ${registryPort}...`);
    execSync(`docker run -d -p ${registryPort}:5000 --name ${registryName} registry:2`, { stdio: "inherit" });
    console.log("✅ Local registry started.");
  } catch (err) {
    console.error("❌ Failed to start local registry:", err.message);
  }
}

function cleanupDockerImages() {
  console.log("🧹 Cleaning up duplicate Docker images...");
  try {
    const result = execCmd("docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}'")
      .split("\n")
      .filter(Boolean);

    const seen = new Map();

    for (const line of result) {
      const [repoTag, id] = line.split(" ");
      if (seen.has(repoTag)) {
        console.log(`🗑️ Removing duplicate image: ${repoTag}`);
        execSync(`docker rmi -f ${id}`);
      } else {
        seen.set(repoTag, id);
      }
    }

    console.log("✅ Docker images cleaned.");
  } catch (err) {
    console.error("❌ Docker image cleanup failed:", err.message);
  }
}

function ensureRedisInK8s() {
  console.log("🧠 Ensuring Redis is running in namespace 'rts'...");

  try {
    const redisPod = execCmd(`kubectl get pods -n rts -l app=redis --no-headers --output=custom-columns=:.status.phase || true`);

    if (redisPod === "Running") {
      console.log("✅ Redis is already running in namespace 'rts'.");
      return;
    }

    console.log("⚠️ Redis not found or not running. Deploying Redis...");

    if (!execCmd("kubectl get ns rts")) {
      console.log("📦 Creating namespace 'rts'...");
      execSync("kubectl create ns rts", { stdio: "inherit" });
    }

    const manifest = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: rts
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7
          ports:
            - containerPort: 6379
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: rts
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
`;
    const tmpPath = path.join(os.tmpdir(), "redis-k8s.yaml");
    fs.writeFileSync(tmpPath, manifest);

    execSync(`kubectl apply -f ${tmpPath}`, { stdio: "inherit" });
    console.log("✅ Redis deployed to Kubernetes.");
  } catch (err) {
    console.error("❌ Failed to deploy Redis:", err.message);
  }
}

function prompt(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(message, (ans) => {
      rl.close();
      resolve(ans);
    });
  });
}

function runSkaffold() {
  console.log("🚀 Starting Skaffold (profile: dev)...");
  const skaffold = spawn("skaffold", ["dev", "-p", "dev"], {
    stdio: "inherit",
    shell: true,
  });

  skaffold.on("exit", (code) => {
    console.log(`Skaffold exited with code ${code}`);
  });
}

// Windows-only: Setup portproxy with netsh
function setupPortProxyWindows() {
  try {
    console.log(`🔌 Setting up port proxy from 0.0.0.0:80 → 127.0.0.1:${LOCAL_FORWARD_PORT}...`);

    // Delete if exists
    execSync(`netsh interface portproxy delete v4tov4 listenport=80 listenaddress=0.0.0.0`, { stdio: "ignore" });

    // Add port proxy
    execSync(`netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=${LOCAL_FORWARD_PORT} connectaddress=127.0.0.1`, { stdio: "inherit" });

    console.log("✅ Port proxy set up on Windows. You may need to run PowerShell as Admin.");
  } catch (e) {
    console.warn("⚠️ Failed to set up port proxy. You might need to run this script with Administrator privileges.");
    console.warn(e.message);
  }
}

// Start kubectl port-forward in background
function startPortForward() {
  console.log(`⏳ Starting 'kubectl port-forward' on localhost:${LOCAL_FORWARD_PORT} → ${TRAEFIK_NAMESPACE}/${TRAEFIK_SERVICE}:${TRAEFIK_PORT} ...`);
  const pf = spawn("kubectl", ["port-forward", `-n`, TRAEFIK_NAMESPACE, `service/${TRAEFIK_SERVICE}`, `${LOCAL_FORWARD_PORT}:${TRAEFIK_PORT}`], {
    shell: true,
    stdio: "inherit",
  });

  pf.on("exit", (code) => {
    console.log(`Port-forward process exited with code ${code}`);
  });
  return pf;
}

async function main() {
  cleanupDockerImages();
  startLocalRegistry();
  ensureRedisInK8s();

  if (isWindows()) {
    setupPortProxyWindows();
    startPortForward();

    console.log("\n👉 Now open your browser at http://localhost or http://gameserver.192.168.127.2.nip.io");
    console.log("If port 80 is blocked, use http://localhost:8080 or http://gameserver.192.168.127.2.nip.io:8080");
  } else {
    // Linux / macOS: just run port-forward
    startPortForward();

    console.log("\n👉 Now open your browser at http://localhost or http://gameserver.192.168.127.2.nip.io");
  }

  // Optionally wait for user before starting skaffold:
  await prompt("\nPress Enter after verifying access in browser to start Skaffold...");

  runSkaffold();
}

main();
