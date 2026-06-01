import { defineConfig } from "tsup";
import { readFileSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

import { type PluginBuild } from "esbuild";
import jsdom from "jsdom";

// Provide a full JSDOM environment so @lark.js/mvc can load in Node.js
// (index.js references document.implementation + document.location at top level)
if (typeof globalThis.document === "undefined") {
  const dom = new jsdom.JSDOM("<!DOCTYPE html>");
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
}

const { compileTemplate, extractGlobalVars } = await import("@lark.js/mvc");

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function larkTemplateEsbuildPlugin(options: { debug?: boolean } = {}) {
  const debug = options?.debug ?? false;

  return {
    name: "lark-template",

    setup(build: PluginBuild) {
      build.onResolve({ filter: /\.html$/ }, (args) => {
        if (args.importer) {
          const dir = dirname(args.importer);
          return {
            path: pathResolve(dir, args.path),
            namespace: "lark-template",
          };
        }
        return { path: args.path, namespace: "lark-template" };
      });

      build.onLoad({ filter: /.*/, namespace: "lark-template" }, (args) => {
        const source = readFileSync(args.path, "utf-8");
        const globalVars = extractGlobalVars(source);
        const contents = compileTemplate(source, {
          globalVars,
          debug,
          file: args.path,
        });
        return { contents, loader: "js", resolveDir: dirname(args.path) };
      });
    },
  };
}

export default defineConfig({
  entry: { bundle: pathResolve(__dirname, "src/boot.ts") },
  format: ["esm"],
  outDir: pathResolve(__dirname, "dist"),
  sourcemap: true,
  clean: true,
  splitting: false,
  outExtension() {
    return { js: ".js" };
  },
  minify: false,
  target: "es2023",
  platform: "browser",
  esbuildPlugins: [larkTemplateEsbuildPlugin()],
  noExternal: [/@lark\.js/],
});
