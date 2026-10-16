// Worker de la DiosesmonWiki: la web son archivos estáticos (los sirve Cloudflare directamente);
// este código solo atiende /api/*, configurado en wrangler.jsonc (assets.run_worker_first).
import { handleCazas } from "./cazas.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/cazas") return handleCazas(request, env);
    return env.ASSETS.fetch(request);
  },
};
