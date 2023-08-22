import { Hono } from "https://deno.land/x/hono@v2.5.6/mod.ts";
import {
  bearerAuth,
  logger,
} from "https://deno.land/x/hono@v2.5.6/middleware.ts";
import { serve } from "https://deno.land/std@v0.166.0/http/mod.ts";
import deployModpackUpdate from "./git.ts";
import { StatusCode } from "https://deno.land/x/hono@v2.5.6/utils/http-status.ts";

const ssl: Record<string, string> = {};

if (Deno.env.get("ORION_SSL_KEY") && Deno.env.get("ORION_SSL_CERT")) {
  ssl.key = await Deno.readTextFile(Deno.env.get("ORION_SSL_KEY")!);
  ssl.cert = await Deno.readTextFile(Deno.env.get("ORION_SSL_CERT")!);
}

const token = Deno.env.get("ORION_TOKEN")!;
const app = new Hono();

app.use("*", logger());
app.use("/deploy/*", bearerAuth({ token }));
app.get("/", (c) => c.text("Hello World!"));
app.get("/ping", (c) => c.text("Pong!"));

app.post("/deploy/pack", async (c) => {
  const res = await deployModpackUpdate("/content/pack");
  return c.json(res.response, res.code as StatusCode);
});

app.post("/deploy/teach-man-fish", async (c) => {
  const res = await deployModpackUpdate("/content/teach-man-fish");
  return c.json(res.response, res.code as StatusCode);
});

app.post("/deploy/its-clearing-up", async (c) => {
  const res = await deployModpackUpdate("/content/its-clearing-up");
  return c.json(res.response, res.code as StatusCode);
});

app.onError((err, c) => {
  console.log("Orion API encountered an error:", err);
  return c.text("Internal Server error", 500);
});

await serve(app.fetch, {
  port: parseInt(Deno.env.get("ORION_PORT") ?? "8080"),
  onListen: ({ hostname, port }) =>
    console.log(`Orion API listening on ${hostname}:${port}`),
  onError: (e) => {
    console.log("Orion API encountered an error:", e);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log("Orion API has stopped");
