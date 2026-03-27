import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __dirname_ } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __dirname_(__filename);
import {
  global_path_default
} from "./chunk-I3IX2FMH.js";
import {
  printError
} from "./chunk-N7ABINT7.js";
import {
  output_manager_default
} from "./chunk-FDJURQMQ.js";
import {
  require_source
} from "./chunk-S7KYDPEM.js";
import {
  __toESM
} from "./chunk-TZ2YI2VH.js";

// src/util/agent/auto-install-agentic.ts
var import_chalk2 = __toESM(require_source(), 1);
import { readFile as readFile2, writeFile as writeFile2, readdir } from "fs/promises";
import { access } from "fs/promises";
import { join as join2 } from "path";
import { homedir } from "os";
import { spawn } from "child_process";
import { KNOWN_AGENTS as KNOWN_AGENTS2 } from "@vercel/detect-agent";

// src/commands/agent/init.ts
var import_chalk = __toESM(require_source(), 1);
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { KNOWN_AGENTS } from "@vercel/detect-agent";
var BEST_PRACTICES_START = "<!-- VERCEL BEST PRACTICES START -->";
var BEST_PRACTICES_END = "<!-- VERCEL BEST PRACTICES END -->";
var BEST_PRACTICES_BODY = `## Best practices for developing on Vercel

These defaults are optimized for AI coding agents (and humans) working on apps that deploy to Vercel.

- Treat Vercel Functions as stateless + ephemeral (no durable RAM/FS, no background daemons), use Blob or marketplace integrations for preserving state
- Edge Functions (standalone) are deprecated; prefer Vercel Functions
- Don't start new projects on Vercel KV/Postgres (both discontinued); use Marketplace Redis/Postgres instead
- Store secrets in Vercel Env Variables; not in git or \`NEXT_PUBLIC_*\`
- Provision Marketplace native integrations with \`vercel integration add\` (CI/agent-friendly)
- Sync env + project settings with \`vercel env pull\` / \`vercel pull\` when you need local/offline parity
- Use \`waitUntil\` for post-response work; avoid the deprecated Function \`context\` parameter
- Set Function regions near your primary data source; avoid cross-region DB/service roundtrips
- Tune Fluid Compute knobs (e.g., \`maxDuration\`, memory/CPU) for long I/O-heavy calls (LLMs, APIs)
- Use Runtime Cache for fast **regional** caching + tag invalidation (don't treat it as global KV)
- Use Cron Jobs for schedules; cron runs in UTC and triggers your production URL via HTTP GET
- Use Vercel Blob for uploads/media; Use Edge Config for small, globally-read config
- If Enable Deployment Protection is enabled, use a bypass secret to directly access them
- Add OpenTelemetry via \`@vercel/otel\` on Node; don't expect OTEL support on the Edge runtime
- Enable Web Analytics + Speed Insights early
- Use AI Gateway for model routing, set AI_GATEWAY_API_KEY, using a model string (e.g. 'anthropic/claude-sonnet-4.6'), Gateway is already default in AI SDK
  needed. Always curl https://ai-gateway.vercel.sh/v1/models first; never trust model IDs from memory
- For durable agent loops or untrusted code: use Workflow (pause/resume/state) + Sandbox; use Vercel MCP for secure infra access`;
var BEST_PRACTICES_CONTENT = `${BEST_PRACTICES_START}
${BEST_PRACTICES_BODY}
${BEST_PRACTICES_END}
`;
function getTargetFile(agentName) {
  if (agentName === KNOWN_AGENTS.CLAUDE) {
    return "CLAUDE.md";
  }
  return "AGENTS.md";
}
async function agentInit(client, yes) {
  const targetFile = getTargetFile(client.agentName);
  const filePath = join(client.cwd, targetFile);
  let existing = null;
  try {
    existing = await readFile(filePath, "utf-8");
  } catch {
  }
  const hasMarkers = existing !== null && existing.includes(BEST_PRACTICES_START) && existing.includes(BEST_PRACTICES_END);
  const action = hasMarkers ? "update" : existing !== null ? "append" : "create";
  const promptMessage = hasMarkers ? `We're going to update Vercel best practices in your ${import_chalk.default.bold(targetFile)}. Proceed?` : `We're going to add Vercel best practices to your ${import_chalk.default.bold(targetFile)}. Proceed?`;
  if (!yes && client.stdin.isTTY) {
    const confirmed = await client.input.confirm(promptMessage, true);
    if (!confirmed) {
      output_manager_default.log("Canceled");
      return 0;
    }
  } else if (!yes && !client.stdin.isTTY) {
    output_manager_default.error(
      "Missing required flag --yes. Use --yes to skip confirmation, or run interactively in a terminal."
    );
    return 1;
  }
  output_manager_default.spinner(`Writing Vercel best practices to ${targetFile}`);
  try {
    if (action === "update") {
      const startIdx = existing.indexOf(BEST_PRACTICES_START);
      const endIdx = existing.indexOf(BEST_PRACTICES_END) + BEST_PRACTICES_END.length;
      const trailingNewline = existing[endIdx] === "\n" ? 1 : 0;
      const updated = existing.slice(0, startIdx) + BEST_PRACTICES_CONTENT + existing.slice(endIdx + trailingNewline);
      await writeFile(filePath, updated, "utf-8");
      output_manager_default.stopSpinner();
      output_manager_default.success(
        `Updated Vercel best practices in ${import_chalk.default.bold(targetFile)}`
      );
    } else if (action === "append") {
      const separator = existing.endsWith("\n") ? "\n" : "\n\n";
      await writeFile(
        filePath,
        existing + separator + BEST_PRACTICES_CONTENT,
        "utf-8"
      );
      output_manager_default.stopSpinner();
      output_manager_default.success(
        `Appended Vercel best practices to ${import_chalk.default.bold(targetFile)}`
      );
    } else {
      await writeFile(filePath, BEST_PRACTICES_CONTENT, "utf-8");
      output_manager_default.stopSpinner();
      output_manager_default.success(
        `Created ${import_chalk.default.bold(targetFile)} with Vercel best practices`
      );
    }
  } catch (error) {
    output_manager_default.stopSpinner();
    printError(error);
    return 1;
  }
  output_manager_default.log(import_chalk.default.dim("Run vercel deploy to ship your project"));
  return 0;
}

// src/util/agent/auto-install-agentic.ts
var PREVIEW_LINES = 5;
var PREFS_FILE = "agent-preferences.json";
var AGENT_TO_TARGET = {
  [KNOWN_AGENTS2.CLAUDE]: "claude-code",
  [KNOWN_AGENTS2.COWORK]: "claude-code",
  [KNOWN_AGENTS2.CURSOR]: "cursor",
  [KNOWN_AGENTS2.CURSOR_CLI]: "cursor"
};
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
async function readPrefs() {
  try {
    const raw = await readFile2(
      join2(global_path_default(), PREFS_FILE),
      "utf-8"
    );
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
async function writePrefs(prefs) {
  try {
    await writeFile2(
      join2(global_path_default(), PREFS_FILE),
      JSON.stringify(prefs, null, 2),
      "utf-8"
    );
  } catch {
  }
}
function getTargetFile2(agentName) {
  if (agentName === KNOWN_AGENTS2.CLAUDE) {
    return "CLAUDE.md";
  }
  return "AGENTS.md";
}
function printPreview() {
  const lines = BEST_PRACTICES_BODY.split("\n").filter((l) => l.trim() !== "");
  const preview = lines.slice(0, PREVIEW_LINES);
  const remaining = lines.length - PREVIEW_LINES;
  output_manager_default.log("");
  for (const line of preview) {
    output_manager_default.log(import_chalk2.default.dim(`  ${line}`));
  }
  if (remaining > 0) {
    output_manager_default.log(import_chalk2.default.dim(`  (+ ${remaining} more lines)`));
  }
  output_manager_default.log("");
}
async function getPluginTargets(agentName) {
  if (agentName && AGENT_TO_TARGET[agentName]) {
    return [AGENT_TO_TARGET[agentName]];
  }
  const home = homedir();
  const targets = [];
  if (await fileExists(join2(home, ".claude"))) {
    targets.push("claude-code");
  }
  if (await fileExists(join2(home, ".cursor"))) {
    targets.push("cursor");
  }
  return targets;
}
async function isPluginInClaudeRegistry() {
  try {
    const raw = await readFile2(
      join2(homedir(), ".claude", "plugins", "installed_plugins.json"),
      "utf-8"
    );
    const data = JSON.parse(raw);
    const plugins = data?.plugins ?? {};
    return Object.keys(plugins).some(
      (key) => key.toLowerCase().includes("vercel-plugin")
    );
  } catch {
    return false;
  }
}
async function isPluginInCursorPlugins() {
  const pluginsDir = join2(homedir(), ".cursor", "plugins");
  try {
    const entries = await readdir(pluginsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory())
        continue;
      if (entry.name.includes("vercel-plugin")) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}
async function isPluginInstalledForTarget(target) {
  if (target === "claude-code") {
    return isPluginInClaudeRegistry();
  }
  if (target === "cursor") {
    return await isPluginInClaudeRegistry() || await isPluginInCursorPlugins();
  }
  return false;
}
async function confirm(client, message, autoConfirm) {
  if (autoConfirm && !client.isAgent) {
    return true;
  }
  if (!client.stdin.isTTY) {
    return false;
  }
  return client.input.confirm(message, true);
}
async function autoInstallAgentTooling(client, options) {
  try {
    const prefs = await readPrefs();
    if (!options?.skipAgentInit && !prefs.agentInitDismissed) {
      try {
        const targetFile = getTargetFile2(client.agentName);
        const filePath = join2(client.cwd, targetFile);
        let existing = null;
        try {
          existing = await readFile2(filePath, "utf-8");
        } catch {
        }
        const hasMarkers = existing !== null && existing.includes(BEST_PRACTICES_START) && existing.includes(BEST_PRACTICES_END);
        if (hasMarkers) {
          await agentInit(client, true);
        } else if (client.isAgent) {
          await agentInit(client, true);
        } else {
          printPreview();
          const accepted = await confirm(
            client,
            `Add Vercel best practices to ${import_chalk2.default.bold(targetFile)}?`,
            options?.autoConfirm
          );
          if (accepted) {
            await agentInit(client, true);
          } else {
            prefs.agentInitDismissed = true;
            await writePrefs(prefs);
          }
        }
      } catch (err) {
        output_manager_default.debug(`Agent init failed: ${err}`);
      }
    }
    if (!prefs.pluginDismissed) {
      const targets = await getPluginTargets(client.agentName);
      const uninstalledTargets = [];
      for (const target of targets) {
        if (!await isPluginInstalledForTarget(target)) {
          uninstalledTargets.push(target);
        }
      }
      if (uninstalledTargets.length > 0) {
        if (client.isAgent && !client.stdin.isTTY) {
          const next = uninstalledTargets.map((target) => ({
            command: `npx plugins add vercel/vercel-plugin --target ${target} -y`,
            when: `Install Vercel plugin for ${target}`
          }));
          client.stdout.write(
            `${JSON.stringify(
              {
                status: "action_required",
                reason: "plugin_install",
                message: "The Vercel plugin enhances your agent experience. Would you like to install it?",
                next
              },
              null,
              2
            )}
`
          );
          prefs.pluginDismissed = true;
          await writePrefs(prefs);
          return;
        }
        const accepted = await confirm(
          client,
          "Install the Vercel plugin?",
          options?.autoConfirm
        );
        if (accepted) {
          for (const target of uninstalledTargets) {
            output_manager_default.spinner(`Installing Vercel plugin for ${target}...`);
            const exitCode = await new Promise((resolve) => {
              const child = spawn(
                "npx",
                [
                  "plugins",
                  "add",
                  "vercel/vercel-plugin",
                  "--target",
                  target,
                  "-y"
                ],
                { stdio: "pipe" }
              );
              child.on("close", (c) => resolve(c ?? 1));
              child.on("error", () => resolve(1));
            });
            output_manager_default.stopSpinner();
            if (exitCode === 0) {
              output_manager_default.success(`Installed Vercel plugin for ${target}`);
            } else {
              output_manager_default.debug(`Failed to install Vercel plugin for ${target}`);
            }
          }
        } else {
          prefs.pluginDismissed = true;
          await writePrefs(prefs);
        }
      }
    }
  } catch (err) {
    output_manager_default.debug(`Auto-install agent tooling failed: ${err}`);
  }
}
async function showPluginTipIfNeeded() {
  try {
    const prefs = await readPrefs();
    if (prefs.pluginDismissed)
      return;
    const targets = await getPluginTargets();
    for (const target of targets) {
      if (!await isPluginInstalledForTarget(target)) {
        output_manager_default.log(
          import_chalk2.default.dim(
            "Tip: Run `npx plugins add vercel/vercel-plugin` to enhance your agent experience"
          )
        );
        return;
      }
    }
  } catch {
  }
}

export {
  agentInit,
  autoInstallAgentTooling,
  showPluginTipIfNeeded
};
