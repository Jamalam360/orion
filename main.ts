import { Application, Router } from "https://deno.land/x/oak@v10.5.1/mod.ts";
import { cyan } from "https://deno.land/std@0.138.0/fmt/colors.ts";

if (Deno.args.length > 0 && Deno.args[0].includes("--gen-key")) {
  console.log(`Generated key: ${cyan(crypto.randomUUID())}`);
  Deno.exit(0);
}

const keys: string[] = [];

for (const line of (await Deno.readTextFile("keys.txt")).split("\n")) {
  const value = line.split("=")[1];
  keys.push(value.trim());
}

const app = new Application();
const router = new Router();

app.use(async (ctx, next) => {
  if (
    ctx.request.headers.has("authorization") &&
    keys.includes(ctx.request.headers.get("authorization")!)
  ) {
    await next();
  } else {
    ctx.response.status = 403;
    ctx.response.body = {
      message: "Invalid authorization token",
    };
  }
});

router.post("/deploy/pinguino", async (ctx) => {
  const version = ctx.request.url.searchParams.get("version");
  const mavenUrl =
    `https://maven.jamalam.tech/releases/io/github/jamalam360/pinguino/${version}/pinguino-${version}.jar`;
  const data = await (await fetch(mavenUrl)).arrayBuffer();
  await Deno.remove("../Pinguino/pinguino.jar");
  await Deno.writeFile("../Pinguino/pinguino.jar", new Uint8Array(data));
});

app.use(router.allowedMethods());
app.use(router.routes());

await app.listen({ port: 9001 });
