import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, test } from "node:test";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// Compile the real route/helper sources with the installed TypeScript compiler.
// Inject only infrastructure boundaries; no Next server, real database or network.
function load(file, mocks = {}) {
  const cache = new Map();
  function localLoad(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const loaded = { exports: {} };
    cache.set(path, loaded);
    const source = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith("@/")) return localLoad(resolve(root, `${id.slice(2)}.ts`));
      if (id.startsWith(".")) return localLoad(resolve(dirname(path), `${id}.ts`));
      return require(id);
    };
    new Function("require", "module", "exports", source)(localRequire, loaded, loaded.exports);
    return loaded.exports;
  }
  return localLoad(resolve(root, file));
}

const secret = "s".repeat(64);
const token = "12345678-1234-4234-8234-123456789012";
let environment;
beforeEach((t) => {
  environment = { ...process.env };
  delete process.env.DATABASE_URL;
  delete process.env.VERCEL;
  process.env.RESEND_API_KEY = "test-only";
  process.env.TELEGRAM_BOT_TOKEN = "123:test-only";
  process.env.TELEGRAM_WEBHOOK_SECRET = secret;
  process.env.TELEGRAM_BOT_USERNAME = "opoalertbot";
  process.env.SITE_URL = "https://opoalerta.es";
  process.env.ALERT_RATE_LIMIT_SECRET = secret;
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected network access"); });
});
afterEach(() => {
  for (const key of Object.keys(process.env)) if (!(key in environment)) delete process.env[key];
  Object.assign(process.env, environment);
});

function request(body, headers = {}) {
  return new Request("https://opoalerta.es/api/test", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...headers },
  });
}

test("bounded JSON rejects primitives, arrays, null, malformed JSON and oversized streams", async () => {
  const { readJsonObject } = load("lib/alert-input.ts");
  for (const value of [null, [], "string", 1, true]) {
    await assert.rejects(readJsonObject(request(value)), { status: 400 });
  }
  await assert.rejects(readJsonObject(new Request("https://test", { method: "POST", body: "{" })), { status: 400 });
  await assert.rejects(readJsonObject(request({ q: "a".repeat(4096) })), { status: 413 });
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('{"q":"'));
    controller.enqueue(new TextEncoder().encode("x".repeat(4096)));
    controller.close();
  } });
  await assert.rejects(readJsonObject(new Request("https://test", {
    method: "POST", body: stream, duplex: "half", headers: { "content-length": "1" },
  })), { status: 413 });
  assert.deepEqual(await readJsonObject(request({ q: "á" })), { q: "á" });
});

test("filters and email validate runtime types, bounds, enums and normalization", () => {
  const { parseFilters, parseEmail } = load("lib/alert-input.ts");
  assert.deepEqual(parseFilters({ q: "  auxiliar ", ccaa: "AN", ambito: "autonomico", fuente_codigo: "boja" }),
    { q: "auxiliar", ccaa: "AN", ambito: "autonomico", fuente_codigo: "boja" });
  assert.deepEqual(parseFilters({ q: "", ccaa: null }), { q: null, ccaa: null, ambito: null, fuente_codigo: null });
  for (const value of [{ q: [] }, { q: {} }, { q: 12 }, { q: "a".repeat(201) }, { q: "a\nb" },
    { ccaa: "XX" }, { ambito: "invalid" }, { fuente_codigo: "<b>" }]) assert.throws(() => parseFilters(value));
  assert.equal(parseEmail(" User@Example.com "), "user@example.com");
  for (const value of [null, {}, [], "bad", "a\nb@example.com", "x".repeat(255) + "@test.es", "<a>@test.es"]) {
    assert.throws(() => parseEmail(value));
  }
});

test("HTML helper escapes text and both kinds of attribute quote", () => {
  assert.equal(load("lib/html.ts").escapeHtml(`<b title="x">'&`), "&lt;b title=&quot;x&quot;&gt;&#39;&amp;");
});

function subscriptionRoute(channel, quota = { ok: true }, createError = false) {
  const effects = [];
  const route = load(`app/api/${channel === "email" ? "suscribir" : "suscribir-telegram"}/route.ts`, {
    "@/lib/suscripciones": {
      crearSuscripcion: async (...args) => { effects.push(["create", ...args]); if (createError) throw new Error("private@example.com"); return { token }; },
      crearSuscripcionTelegram: async (...args) => { effects.push(["create", ...args]); return { token }; },
    },
    "@/lib/alert-rate-limit": { limitSubscription: async (...args) => { effects.push(["quota", ...args]); return quota; } },
    "@/lib/email": { emailConfigured: () => true, SITE_URL: "https://opoalerta.es", sendEmail: async (options) => { effects.push(["send", options]); return { ok: true }; } },
  });
  return { ...route, effects };
}

for (const channel of ["email", "telegram"]) {
  test(`${channel}: invalid inputs never reserve quota, write or send`, async () => {
    const route = subscriptionRoute(channel);
    for (const value of [null, [], { email: "user@example.com", q: {} }, { email: "user@example.com", ambito: "bad" }]) {
      assert.equal((await route.POST(request(value))).status, 400);
    }
    assert.deepEqual(route.effects, []);
  });
  test(`${channel}: quota rejection prevents writes and sends and exposes Retry-After`, async () => {
    const route = subscriptionRoute(channel, { ok: false, status: 429, retryAfter: 600 });
    const result = await route.POST(request({ email: "user@example.com" }));
    assert.equal(result.status, 429);
    assert.equal(result.headers.get("retry-after"), "600");
    assert.deepEqual(route.effects.map((e) => e[0]), ["quota"]);
  });
  test(`${channel}: unavailable limiter fails closed`, async () => {
    const route = subscriptionRoute(channel, { ok: false, status: 503 });
    assert.equal((await route.POST(request({ email: "user@example.com" }))).status, 503);
    assert.deepEqual(route.effects.map((e) => e[0]), ["quota"]);
  });
}

test("confirmation email renders hostile filter text as text, not markup", async () => {
  const route = subscriptionRoute("email");
  assert.equal((await route.POST(request({ email: "USER@example.com", q: '<img src="x"> & texto' }))).status, 200);
  const message = route.effects.find((e) => e[0] === "send")[1];
  assert.equal(message.to, "user@example.com");
  assert.ok(message.html.includes("&lt;img src=&quot;x&quot;&gt; &amp; texto"));
  assert.ok(!message.html.includes("<img"));
  assert.ok(message.html.includes(`/alertas/confirmar?token=${token}`));
});

test("subscription database exceptions do not escape or expose the address", async () => {
  const route = subscriptionRoute("email", { ok: true }, true);
  const result = await route.POST(request({ email: "user@example.com" }));
  assert.equal(result.status, 500);
  assert.ok(!(await result.text()).includes("private@example.com"));
  assert.ok(!route.effects.some((e) => e[0] === "send"));
});

function webhook() {
  const effects = [];
  const telegram = load("lib/telegram.ts");
  const route = load("app/api/telegram/route.ts", {
    "@/lib/telegram": { ...telegram, sendTelegram: async (...args) => effects.push(["send", ...args]) },
    "@/lib/suscripciones": {
      vincularTelegram: async (...args) => { effects.push(["link", ...args]); return {}; },
      bajaTelegram: async (...args) => { effects.push(["delete", ...args]); return 1; },
      resumenFiltros: () => '<a href="https://evil.test">evil</a>',
    },
  });
  return { ...route, effects };
}
const update = (text, chat = { id: 123, type: "private" }) => ({ message: { text, chat } });
const authenticated = (body) => request(body, { "x-telegram-bot-api-secret-token": secret });

test("webhook requires configured secret and correct header before all side effects", async () => {
  const route = webhook();
  delete process.env.TELEGRAM_WEBHOOK_SECRET;
  assert.equal((await route.POST(authenticated(update("/stop")))).status, 503);
  process.env.TELEGRAM_WEBHOOK_SECRET = secret;
  assert.equal((await route.POST(request(update("/stop")))).status, 401);
  assert.equal((await route.POST(request(update("/stop"), { "x-telegram-bot-api-secret-token": "z".repeat(64) }))).status, 401);
  assert.deepEqual(route.effects, []);
});

test("webhook ignores malformed updates, groups, unsafe IDs and non-exact commands", async () => {
  const route = webhook();
  for (const payload of [null, [], { message: { text: {} } }, update("/stopall"), update("/stop extra"),
    update("/stop@otherbot"), update("/stop", { type: "group", id: -123 }),
    update("/stop", { type: "private", id: Number.MAX_SAFE_INTEGER + 1 }),
    update("/stop", { type: "private", id: "123" }), update("/start not-a-uuid")]) {
    assert.equal((await route.POST(authenticated(payload))).status, 200);
  }
  assert.deepEqual(route.effects, []);
});

test("webhook links a valid UUID and escapes existing stored filters", async () => {
  const route = webhook();
  assert.equal((await route.POST(authenticated(update(`/start ${token}`)))).status, 200);
  assert.deepEqual(route.effects[0], ["link", token, 123]);
  assert.ok(route.effects[1][2].includes("&lt;a href=&quot;https://evil.test&quot;&gt;"));
  assert.ok(!route.effects[1][2].includes('<a href="https://evil.test">'));
});

test("webhook accepts /stop addressed to this bot", async () => {
  const route = webhook();
  assert.equal((await route.POST(authenticated(update("/stop@opoalertbot")))).status, 200);
  assert.deepEqual(route.effects[0], ["delete", 123]);
});

function limiter(result = 0, fail = false) {
  const calls = [];
  const loaded = load("lib/alert-rate-limit.ts", { "@neondatabase/serverless": {
    neon: () => async (_query, policies) => { calls.push(JSON.parse(policies)); if (fail) throw new Error("private"); return [{ retry_after: result }]; },
  } });
  return { ...loaded, calls };
}

test("limiter fails closed on absent config, database error or malformed result", async () => {
  const api = limiter();
  assert.deepEqual(await api.limitSubscription(request({}), "email", "user@example.com"), { ok: false, status: 503 });
  assert.equal(api.calls.length, 0);
  process.env.DATABASE_URL = "postgresql://test-only";
  for (const api of [limiter(-1), limiter("0"), limiter(0, true)]) {
    assert.deepEqual(await api.limitSubscription(request({}), "email", "user@example.com"), { ok: false, status: 503 });
  }
});

test("limiter uses HMAC keys and ignores forged IP headers outside Vercel", async () => {
  process.env.DATABASE_URL = "postgresql://test-only";
  const api = limiter();
  assert.deepEqual(await api.limitSubscription(request({}, { "x-forwarded-for": "1.2.3.4" }), "email", "user@example.com"), { ok: true });
  await api.limitSubscription(request({}, { "x-forwarded-for": "9.8.7.6" }), "email", "USER@example.com");
  assert.deepEqual(api.calls[0], api.calls[1]);
  const keys = JSON.stringify(api.calls);
  for (const value of ["user@example.com", "1.2.3.4", secret]) assert.ok(!keys.includes(value));
  assert.equal(api.calls[0].length, 5);
});

test("Vercel IP parsing fails closed; quota wait is returned", async () => {
  process.env.DATABASE_URL = "postgresql://test-only";
  process.env.VERCEL = "1";
  const api = limiter(120);
  for (const ip of ["", "bad", "1.2.3.4, 9.8.7.6"]) {
    assert.equal((await api.limitSubscription(request({}, { "x-forwarded-for": ip }), "telegram")).status, 503);
  }
  assert.deepEqual(await api.limitSubscription(request({}, { "x-forwarded-for": "2001:db8::1" }), "telegram"),
    { ok: false, status: 429, retryAfter: 120 });
});

test("provider failures return no raw response, contact or bot token", async (t) => {
  const email = load("lib/email.ts");
  const telegram = load("lib/telegram.ts");
  for (const transportError of [false, true]) {
    t.mock.method(globalThis, "fetch", async () => {
      if (transportError) throw new Error("123:test-only user@example.com");
      return new Response("123:test-only user@example.com", { status: 400 });
    });
    for (const result of [await email.sendEmail({ to: "user@example.com", html: "test", subject: "test" }),
      await telegram.sendTelegram(123, "test")]) {
      assert.equal(result.ok, false);
      assert.ok(!JSON.stringify(result).includes("test-only"));
      assert.ok(!JSON.stringify(result).includes("user@example.com"));
    }
  }
});
