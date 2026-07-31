import { validateRecordEvent } from "../../../packages/protocol/src/record.js";
import type { RelayClient } from "../../../packages/relay/src/client.js";

export async function resolveCode(
  client: RelayClient,
  code: string,
  allowedPubkey: string,
): Promise<Response> {
  const results = await client.queryByCode(code);
  if (!results.some((result) => result.status === "accepted"))
    return new Response("relay unavailable", { status: 503 });
  const destinations = new Set<string>();
  for (const result of results)
    for (const event of result.events ?? []) {
      const parsed = await validateRecordEvent(event);
      if (
        parsed.valid &&
        parsed.code === code &&
        event.pubkey === allowedPubkey
      )
        destinations.add(parsed.payload.url);
    }
  if (destinations.size === 0)
    return new Response("not found", { status: 404 });
  if (destinations.size > 1) return new Response("collision", { status: 409 });
  return Response.redirect([...destinations][0], 302);
}
