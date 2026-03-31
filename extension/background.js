const ZONES_REGISTRY_URL = "https://vibezones.github.io/zones/index.json";
const DEV_BASE = "http://localhost:3553/dist";
const dnsCache = new Map();
let meta = null;
let baseUrl = null;

// MUST match domainToInt in zones/build.js and zones/index.html
function domainToInt(domain) {
  let h = 0;
  for (const ch of domain) {
    h = (h * 31 + ch.codePointAt(0)) >>> 0;
  }
  return h;
}

async function getBaseUrl() {
  if (baseUrl) return baseUrl;

  const { customServer } = await chrome.storage.local.get("customServer");
  if (customServer) {
    baseUrl = `${customServer}/dist`;
    return baseUrl;
  }

  try {
    const res = await fetch(ZONES_REGISTRY_URL);
    const { servers } = await res.json();
    baseUrl = `${servers[0]}/dist`;
  } catch {
    baseUrl = DEV_BASE;
  }
  return baseUrl;
}

async function getMeta() {
  if (!meta) {
    const url = await getBaseUrl();
    const res = await fetch(`${url}/count.json`);
    meta = await res.json();
  }
  return meta;
}

async function resolveDomain(domain) {
  if (dnsCache.has(domain)) {
    return dnsCache.get(domain);
  }

  const url = await getBaseUrl();
  const { shards } = await getMeta();
  const bucket = domainToInt(domain) % shards;
  const res = await fetch(`${url}/zones/${bucket}.json`);
  if (!res.ok) return null;

  const shard = await res.json();
  const target = shard[domain];
  if (!target) return null;

  dnsCache.set(domain, target);
  return target;
}

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const input = text.trim();
  if (!input) return;

  try {
    const target = await resolveDomain(input);
    if (target) {
      suggest([{
        content: `https://${target}`,
        description: `${input} → ${target}`,
      }]);
    }
  } catch (err) {
    console.error("[alt-dns] resolve error:", err);
  }
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  let targetUrl = text;
  if (!text.startsWith("http")) {
    try {
      const target = await resolveDomain(text.trim());
      if (target) {
        targetUrl = `https://${target}`;
      } else {
        return;
      }
    } catch {
      return;
    }
  }

  if (disposition === "currentTab") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.update(tab.id, { url: targetUrl });
  } else {
    chrome.tabs.create({ url: targetUrl });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "getStatus") {
    (async () => {
      const { customServer } = await chrome.storage.local.get("customServer");
      const activeServer = await getBaseUrl();
      sendResponse({ activeServer, customServer: customServer || null });
    })();
    return true;
  }
  if (message.action === "setCustomServer") {
    (async () => {
      await chrome.storage.local.set({ customServer: message.url });
      baseUrl = null;
      meta = null;
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message.action === "clearCustomServer") {
    (async () => {
      await chrome.storage.local.remove("customServer");
      baseUrl = null;
      meta = null;
      sendResponse({ ok: true });
    })();
    return true;
  }
});
