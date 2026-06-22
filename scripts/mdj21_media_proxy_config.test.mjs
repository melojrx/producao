import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const nginxConfig = readFileSync("docker/nginx/prod.conf", "utf8");
const proxyCompose = readFileSync("docker/compose/prod.proxy.yml", "utf8");

test("prod nginx serves /media directly from the shared media volume", () => {
  const mediaLocation = nginxConfig.match(/location\s+\/media\/\s*\{(?<body>[\s\S]*?)\n\s*\}/);

  assert.ok(mediaLocation?.groups?.body, "missing /media/ location in prod nginx config");
  assert.match(mediaLocation.groups.body, /alias\s+\/app\/media\/;/);
  assert.doesNotMatch(mediaLocation.groups.body, /proxy_pass\s+http:\/\/pcp_backend/);
});

test("prod proxy mounts media_data read-only at /app/media", () => {
  assert.match(proxyCompose, /media_data:\/app\/media:ro/);
});
