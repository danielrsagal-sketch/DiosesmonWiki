// /api/cazas (lo llama worker/index.js)
//   GET  → cazas actuales (público, lo usa Inicio).
//   PUT  → guarda las cazas (solo admin: cabecera «Authorization: Bearer <contraseña>»).
// Necesita en el Worker: el KV CAZAS_KV (en wrangler.jsonc) y el secreto ADMIN_PASSWORD (en el panel de Cloudflare).
const KEY = "cazas-actuales";
const MAX_HUNTS = 6;

const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
});

// Compara la contraseña sin filtrar su longitud ni su contenido por el tiempo de respuesta.
async function sameSecret(given, expected) {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([given, expected].map((text) => crypto.subtle.digest("SHA-256", encoder.encode(text))));
  const left = new Uint8Array(a);
  const right = new Uint8Array(b);
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left[index] ^ right[index];
  return diff === 0;
}

function cleanHunts(list, withIvs) {
  if (!Array.isArray(list) || list.length > MAX_HUNTS) return null;
  const hunts = [];
  for (const item of list) {
    const id = Number(item?.id);
    const stars = Number(item?.stars);
    const name = String(item?.name ?? "").trim().slice(0, 40);
    if (!Number.isInteger(id) || id < 1 || id > 1025 || !name) return null;
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return null;
    const hunt = { id, name, stars };
    if (withIvs) {
      const ivs = Number(item?.ivs);
      if (!Number.isInteger(ivs) || ivs < 1 || ivs > 6) return null;
      hunt.ivs = ivs;
    }
    hunts.push(hunt);
  }
  return hunts;
}

function configError(env) {
  if (!env.CAZAS_KV) return "Falta el KV: revisa kv_namespaces (CAZAS_KV) en wrangler.jsonc.";
  if (!env.ADMIN_PASSWORD) return "Falta la contraseña: añade el secreto ADMIN_PASSWORD en el Worker (Settings → Variables and Secrets).";
  return null;
}

export async function onRequestGet({ env }) {
  if (!env.CAZAS_KV) return json({ error: configError(env) }, 503);
  const saved = await env.CAZAS_KV.get(KEY, "json");
  return saved ? json(saved) : json({ error: "Todavía no hay cazas guardadas." }, 404);
}

export async function onRequestPut({ request, env }) {
  const problem = configError(env);
  if (problem) return json({ error: problem }, 503);
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token || !(await sameSecret(token, env.ADMIN_PASSWORD))) {
    // Pequeña espera para frenar a quien pruebe contraseñas a lo bruto.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return json({ error: "Contraseña incorrecta." }, 401);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "El cuerpo no es JSON válido." }, 400);
  }
  const startedAt = Date.parse(body?.startedAt);
  const captura = cleanHunts(body?.captura, false);
  const crianza = cleanHunts(body?.crianza, true);
  if (!Number.isFinite(startedAt) || !captura || !crianza) return json({ error: "Datos incompletos o no válidos." }, 400);
  const saved = { startedAt: new Date(startedAt).toISOString(), captura, crianza, updatedAt: new Date().toISOString() };
  await env.CAZAS_KV.put(KEY, JSON.stringify(saved));
  return json(saved);
}

export function handleCazas(request, env) {
  if (request.method === "GET" || request.method === "HEAD") return onRequestGet({ env });
  if (request.method === "PUT") return onRequestPut({ request, env });
  return json({ error: "Método no permitido." }, 405, { allow: "GET, PUT" });
}
