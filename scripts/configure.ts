import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export interface UrlatticeConfig {
  redirectDomain: string;
  creatorDomain: string;
  allowedPubkey: string;
  relays: string[];
}
export function parseConfig(value: unknown): UrlatticeConfig {
  const c = value as UrlatticeConfig;
  if (
    !c ||
    !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(c.redirectDomain) ||
    !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(c.creatorDomain) ||
    c.redirectDomain === c.creatorDomain ||
    !/^[0-9a-f]{64}$/.test(c.allowedPubkey) ||
    !Array.isArray(c.relays) ||
    c.relays.length < 3 ||
    c.relays.some((url) => !url.startsWith("wss://"))
  )
    throw new TypeError("invalid urlattice configuration");
  return c;
}
async function main() {
  const index = process.argv.indexOf("--config");
  const path = index >= 0 ? process.argv[index + 1] : undefined;
  if (!path)
    throw new Error(
      "usage: npm run configure -- --config urlattice.config.json",
    );
  const config = parseConfig(JSON.parse(await readFile(path, "utf8")));
  const write = async (file: string, content: string) => {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, content);
  };
  await write(
    "wrangler.jsonc",
    JSON.stringify(
      {
        $schema: "./node_modules/wrangler/config-schema.json",
        name: "urlattice",
        main: "apps/redirector/src/index.ts",
        compatibility_date: "2026-07-31",
        workers_dev: false,
        routes: [
          {
            pattern: `${config.redirectDomain}/*`,
            zone_name: config.redirectDomain,
          },
        ],
        vars: {
          RELAY_URLS: config.relays.join(","),
          ALLOWED_PUBKEY: config.allowedPubkey,
        },
      },
      null,
      2,
    ) + "\n",
  );
  await write("apps/creator-web/public/CNAME", `${config.creatorDomain}\n`);
  await write(
    "apps/creator-web/public/config.json",
    JSON.stringify(config) + "\n",
  );
}
if (import.meta.url === `file://${resolve(process.argv[1])}`) void main();
