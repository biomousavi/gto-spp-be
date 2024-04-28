import { Hono } from "hono";
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
  anonymousVoting: z.boolean(),
  issueManagers: z.enum(["ALL"]).or(z.array(z.string())),
  system: z.enum(["FIBONACCI", "T-SHIRT", "POWERS_OF_TWO"]),
  name: z.string().max(64),
});
const updatePokerSchema = z.object({
  revealers: z.enum(["ALL"]).or(z.array(z.string())).optional(),
  showAverage: z.boolean().optional(),
  autoReveal: z.boolean().optional(),
  anonymousVoting: z.boolean().optional(),
  issueManagers: z.enum(["ALL"]).or(z.array(z.string())).optional(),
  system: z.enum(["FIBONACCI", "T-SHIRT", "POWERS_OF_TWO"]).optional(),
  name: z.string().max(64).optional(),
  link: z.string().max(24),
});

app.post("/new", zValidator("json", pokerSchema), async (ctx) => {
  const { autoReveal, name, showAverage, system, anonymousVoting } =
    ctx.req.valid("json");

  const adapter = new PrismaD1(ctx.env.DB);
  const prisma = new PrismaClient({ adapter });

  const poker = await prisma.poker.create({
    data: {
      name,
      system,
      autoReveal,
      showAverage,
      link: nanoid(),
      anonymousVoting,
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
    const { autoReveal, name, showAverage, system, link, anonymousVoting } =
      ctx.req.valid("json");

    const adapter = new PrismaD1(ctx.env.DB);
    const prisma = new PrismaClient({ adapter });

    const { id } = await prisma.poker.findFirstOrThrow({ where: { link } });

    const poker = await prisma.poker.update({
      where: { id },
      data: { autoReveal, name, showAverage, system, anonymousVoting },
    });

    return ctx.json(poker);
  } catch (_) {
    return ctx.notFound();
  }
});

app.get(
  "/auth/token",
  zValidator("query", z.object({ id: z.string(), link: z.string() })),
  async (ctx) => {
    try {
      const { id, link } = ctx.req.valid("query");

      const adapter = new PrismaD1(ctx.env.DB);
      const prisma = new PrismaClient({ adapter });

      await prisma.poker.findFirstOrThrow({ where: { link } });

      const secret = new TextEncoder().encode("bio_secret_999123zZ");
      const alg = "HS256";

      const token = await new SignJWT({ sub: id })
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
  zValidator("query", z.object({ link: z.string(), id: z.string() })),
  async (ctx) => {
    try {
      const { link, id } = ctx.req.valid("query");

      const secret = new TextEncoder().encode("bio_secret_999123zZ");
      const alg = "HS256";

      const token = await new SignJWT({ sub: id, channel: `poker:${link}` })
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
