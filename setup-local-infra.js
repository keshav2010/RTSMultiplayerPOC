const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync, spawn } = require("child_process");
const readline = require("readline");

function startLocalRegistry() {
  const registryName = "local-registry";
  const registryPort = 5000;

  try {
    const existing = execSync(`docker ps --filter "name=${registryName}" --format "{{.Names}}"`).toString().trim();

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

function configureWSL() {
  const wslConfigPath = path.join(os.homedir(), ".wslconfig");
  console.log('wsl path = ', wslConfigPath);
  const desiredConfig = `[wsl2]
networkingMode=mirrored
`;

  let existingConfig = "";
  if (fs.existsSync(wslConfigPath)) {
    existingConfig = fs.readFileSync(wslConfigPath, "utf-8");
  }

  if (existingConfig.trim() === desiredConfig.trim()) {
    console.log("✅ .wslconfig already has the desired networking mode.");
    return false;
  }

  console.log("📁 Updating .wslconfig with mirrored networking mode...");
  fs.writeFileSync(wslConfigPath, desiredConfig);
  console.log("✅ .wslconfig updated.");
  return true;
}

function shutdownWSL() {
  console.log("🛑 Shutting down WSL to apply network settings...");
  try {
    execSync("wsl --shutdown", { stdio: "inherit" });
    console.log("✅ WSL shut down successfully.");
  } catch (err) {
    console.error("❌ Failed to shut down WSL:", err.message);
  }
}

function promptRestartRancherDesktop(callback) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question(
    "\n🌀 Please restart Rancher Desktop manually, then press Enter to continue...\n",
    () => {
      rl.close();
      callback();
    }
  );
}

function cleanupDockerImages() {
  console.log("🧹 Cleaning up duplicate Docker images...");
  try {
    const result = execSync("docker images --format '{{.Repository}}:{{.Tag}} {{.ID}}'")
      .toString()
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
    // Check if the Redis pod is running
    const redisPod = execSync(`kubectl get pods -n rts -l app=redis --no-headers --output=custom-columns=:.status.phase || true`)
      .toString()
      .trim();

    if (redisPod === "Running") {
      console.log("✅ Redis is already running in namespace 'rts'.");
      return;
    }

    console.log("⚠️ Redis not found or not running. Deploying Redis...");

    // Create namespace if not exists
    try {
      execSync("kubectl get ns rts", { stdio: "ignore" });
    } catch {
      console.log("📦 Creating namespace 'rts'...");
      execSync("kubectl create ns rts", { stdio: "inherit" });
    }

    // Apply Redis deployment & service
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

function main() {
  //const didUpdateWSLConfig = configureWSL();
  if (false) {
    //shutdownWSL();
  }

  promptRestartRancherDesktop(() => {
    cleanupDockerImages();
    startLocalRegistry();
    ensureRedisInK8s();
    runSkaffold();
  });
}

main();
