const fs = require("fs");
const path = require("path");

const SOURCE_PATH = path.join(__dirname, "..", "..", "instances-source.json");
const OUTPUT_PATH = path.join(__dirname, "..", "..", "instances.json");

async function fetchApiInfo(baseUrl) {
  const apiUrl = `${baseUrl.replace(/\/$/, "")}/api/v1`;
  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const UPSTREAM_WEBSITE = "https://github.com/TeamVivid/Vivid";

    const hasPrivacyPolicy =
      typeof data.privacyPolicyUrl === "string" && data.privacyPolicyUrl.trim() !== "";

    return {
      ok: true,
      version: data.version ?? "unknown",
      versions_behind: typeof data.behind === "number" ? data.behind : null,
      custom_source: typeof data.website === "string" && data.website.trim() !== UPSTREAM_WEBSITE,
      source_url: data.website && data.website.trim() !== "" ? data.website : null,
      custom_privacy_policy: hasPrivacyPolicy,
      privacy_policy_url: hasPrivacyPolicy ? data.privacyPolicyUrl : null,
    };
  } catch (err) {
    return {
      ok: false,
      version: "unreachable",
      versions_behind: null,
      custom_source: null,
      source_url: null,
      custom_privacy_policy: null,
      privacy_policy_url: null,
      error: String(err.message || err),
    };
  }
}

async function main() {
  const source = JSON.parse(fs.readFileSync(SOURCE_PATH, "utf-8"));

  const instances = [];
  for (const entry of source.instances) {
    const info = await fetchApiInfo(entry.url);
    instances.push({
      url: entry.url,
      region: entry.region,
      proxy: entry.proxy,
      cloudflare: entry.cloudflare,
      reachable: info.ok,
      version: info.version,
      versions_behind: info.versions_behind,
      custom_source: info.custom_source,
      source_url: info.source_url,
      custom_privacy_policy: info.custom_privacy_policy,
      privacy_policy_url: info.privacy_policy_url,
      ...(info.error ? { error: info.error } : {}),
    });
  }

  const output = {
    generated_at: new Date().toISOString(),
    instances,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${instances.length} instances to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
