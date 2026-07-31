import { NostrRelayClient } from "../../../packages/relay/src/client.js";
import { resolveCode } from "./resolve.js";

export default {
  fetch(request, env) {
    const code = new URL(request.url).pathname.slice(1);
    if (!/^[1-9A-HJ-NP-Za-km-z]{14}$/.test(code))
      return new Response("not found", { status: 404 });
    return resolveCode(new NostrRelayClient(env.RELAY_URLS.split(",")), code);
  },
} satisfies ExportedHandler<{ RELAY_URLS: string }>;
