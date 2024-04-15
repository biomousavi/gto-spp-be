import { Hono } from "hono";
import * as Ably from "ably";
import { cors } from "hono/cors";
import { nanoid } from "nanoid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { D1Database } from "@cloudflare/workers-types";
import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { SignJWT } from "jose";

type Bindings = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

const rest = new Ably.Rest(
  "PfP6Tw.y905Hw:ZDdSKXsEFqZ2G4wHoXbwws-14GuyuFv2I7IMIR-MvMc"
);

// TODO: include domains
app.use("*", cors());

app.get("/", async (ctx) => {
  const adapter = new PrismaD1(ctx.env.DB);
  const prisma = new PrismaClient({ adapter });

  const poker = await prisma.poker.findMany();
  return ctx.json(poker);
});

const pokerSchema = z.object({
  revealers: z.enum(["ALL"]).or(z.array(z.string())),
  showAverage: z.boolean(),
  autoReveal: z.boolean(),
  issueManagers: z.enum(["ALL"]).or(z.array(z.string())),
  system: z.enum(["FIBONACCI", "T-SHIRT", "POWERS_OF_TWO"]),
  name: z.string().max(24),
});
const updatePokerSchema = z.object({
  revealers: z.enum(["ALL"]).or(z.array(z.string())).optional(),
  showAverage: z.boolean().optional(),
  autoReveal: z.boolean().optional(),
  issueManagers: z.enum(["ALL"]).or(z.array(z.string())).optional(),
  system: z.enum(["FIBONACCI", "T-SHIRT", "POWERS_OF_TWO"]).optional(),
  name: z.string().max(24).optional(),
  link: z.string().max(24),
});

app.post("/new", zValidator("json", pokerSchema), async (ctx) => {
  const { autoReveal, name, showAverage, system } = ctx.req.valid("json");

  const adapter = new PrismaD1(ctx.env.DB);
  const prisma = new PrismaClient({ adapter });

  const poker = await prisma.poker.create({
    data: {
      name,
      system,
      autoReveal,
      showAverage,
      link: nanoid(),
    },
  });

  return ctx.json(poker);
});

app.get(
  "/pokers/:link",
  zValidator("param", z.object({ link: z.string() })),
  async (ctx) => {
    try {
      const { link } = ctx.req.valid("param");

      const adapter = new PrismaD1(ctx.env.DB);
      const prisma = new PrismaClient({ adapter });

      const poker = await prisma.poker.findFirstOrThrow({ where: { link } });

      return ctx.json(poker);
    } catch (_) {
      return ctx.notFound();
    }
  }
);
app.put("/pokers/:link", zValidator("json", updatePokerSchema), async (ctx) => {
  try {
    const { autoReveal, name, showAverage, system, link } =
      ctx.req.valid("json");

    const adapter = new PrismaD1(ctx.env.DB);
    const prisma = new PrismaClient({ adapter });

    const { id } = await prisma.poker.findFirstOrThrow({ where: { link } });

    const poker = await prisma.poker.update({
      where: { id },
      data: { autoReveal, name, showAverage, system },
    });

    return ctx.json(poker);
  } catch (_) {
    return ctx.notFound();
  }
});

app.get(
  "/auth/token",
  zValidator("query", z.object({ clientId: z.string() })),
  async (ctx) => {
    try {
      const { clientId } = ctx.req.valid("query");
      const secret = new TextEncoder().encode("bio_secret_999123zZ");
      const alg = "HS256";

      const token = await new SignJWT({ sub: clientId })
        .setProtectedHeader({ alg })
        .sign(secret);

      return ctx.json({ token });
    } catch (_) {
      console.log(_);
      return ctx.notFound();
    }
  }
);

app.get(
  "/subscription/token",
  zValidator("query", z.object({ link: z.string(), clientId: z.string() })),
  async (ctx) => {
    try {
      const { link, clientId } = ctx.req.valid("query");

      const secret = new TextEncoder().encode("bio_secret_999123zZ");
      const alg = "HS256";

      const token = await new SignJWT({
        sub: clientId,
        channel: `poker:${link}`,
      })
        .setProtectedHeader({ alg })
        .sign(secret);

      return ctx.json({ token });
    } catch (_) {
      console.log(_);
      return ctx.notFound();
    }
  }
);

export default app;
