import { spawn } from "node:child_process";

const children = [];

function run(label, command, args, shell = false) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    shell,
  });
  children.push(child);
  child.on("exit", code => {
    if (code && !process.exitCode) process.exitCode = code;
  });
}

function shutdown() {
  for (const child of children) child.kill();
}

process.on("SIGINT", () => {
  shutdown();
  process.exit();
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit();
});

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

run("api", process.execPath, ["server.js"]);
run("web", npx, ["vite", "--host", "127.0.0.1"], process.platform === "win32");
