import { Application, Router } from "https://deno.land/x/oak@v10.5.1/mod.ts";
import { cyan } from "https://deno.land/std@0.138.0/fmt/colors.ts";

const CERTIFICATE_PATH =
  "/etc/letsencrypt/live/server-api.jamalam.tech/fullchain.pem";
const PRIVATE_KEY_PATH =
  "/etc/letsencrypt/live/server-api.jamalam.tech/privkey.pem";

if (Deno.args.length > 0 && Deno.args[0].includes("--gen-key")) {
  console.log(`Generated key: ${cyan(crypto.randomUUID())}`);
  Deno.exit(0);
}

const keys: string[] = [];

for (const line of (await Deno.readTextFile("keys.txt")).split("\n")) {
  if (line.includes("=")) {
    const value = line.split("=")[1];
    keys.push(value.trim());
  }
}

const app = new Application();
const router = new Router();

router.post("/deploy/pinguino", async (ctx) => {
  const version = ctx.request.url.searchParams.get("version");
  const mavenUrl =
    `https://maven.jamalam.tech/releases/io/github/jamalam360/pinguino/${version}/pinguino-${version}.jar`;
  const data = await (await fetch(mavenUrl)).arrayBuffer();
  await Deno.remove("/root/Pinguino/pinguino.jar");
  await Deno.writeFile("/root/Pinguino/pinguino.jar", new Uint8Array(data));

  const p = Deno.run({ cmd: ["systemctl", "restart", "pinguino.service"] });
  await p.status();

  ctx.response.status = 200;
  ctx.response.body = {
    message: `Successfully updated Pinguino to ${version}`,
  };
});

router.post("/deploy/pack", async (ctx) => {
  const p = Deno.run({
    cmd: ["git", "pull"],
    cwd: "/var/www/pack",
  });
  await p.status();
  const p2 = Deno.run({
    cmd: ["nginx", "-s", "reload"],
  });
  await p2.status();

  ctx.response.status = 200;
  ctx.response.body = {
    message: "Successfully updated pack",
  };
});

app.use(async (ctx, next) => {
  if (
    ctx.request.headers.has("authorization") &&
    keys.includes(ctx.request.headers.get("authorization")!)
  ) {
    await next();
  } else {
    console.log(
      cyan(ctx.request.method + " " + ctx.request.url + " - Unauthorized"),
    );
    ctx.response.status = 403;
    ctx.response.body = {
      message: "Invalid authorization token",
    };
  }
});

app.use(router.routes());

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(
    cyan(ctx.request.method + " " + ctx.request.url + " - " + rt),
  );
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", ms + "ms");
});

await app.listen({
  port: 9010,
  secure: true,
  certFile: CERTIFICATE_PATH,
  keyFile: PRIVATE_KEY_PATH,
});
