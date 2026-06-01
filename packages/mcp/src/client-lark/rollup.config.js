import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import postcss from "rollup-plugin-postcss";
import json from "@rollup/plugin-json";
import { readFileSync } from "node:fs";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";
import jsdom from "jsdom"

// Provide a full JSDOM environment so @lark.js/mvc can load in Node.js
// (index.js references document.implementation + document.location at top level)
if (typeof globalThis.document === "undefined") {
  const dom = new jsdom.JSDOM("<!DOCTYPE html>");
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
}

const { compileTemplate, extractGlobalVars } = await import("@lark.js/mvc");

/**
 * Custom Rollup plugin to compile Lark .html template files.
 * Uses compileTemplate() + extractGlobalVars() from @lark.js/mvc
 * to transform .html imports into JS template functions at build time.
 * @param {{ debug?: boolean }} [options]
 * @returns {import('rollup').Plugin}
 */
function larkTemplatePlugin(options) {
  const debug = options?.debug ?? false;

  return {
    name: "lark-template",

    /**
     *
     * @param {string} source
     * @param {string | null} importer
     * @returns
     */
    resolveId(source, importer) {
      if (source.endsWith(".html") && importer) {
        const dir = dirname(importer);
        const fullPath = pathResolve(dir, source);
        return fullPath + "?lark-template";
      }
      return null;
    },

    /**
     *
     * @param {string} id
     * @returns
     */
    async load(id) {
      if (!id.endsWith("?lark-template")) return null;
      const filePath = id.replace("?lark-template", "");
      const source = readFileSync(filePath, "utf-8");
      const globalVars = extractGlobalVars(source);
      return compileTemplate(source, {
        globalVars,
        debug,
        file: filePath,
      });
    },
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  input: pathResolve(__dirname, "src/boot.ts"),
  output: {
    file: pathResolve(__dirname, "dist/bundle.js"),
    format: "es",
    sourcemap: true,
  },
  plugins: [
    json(),
    larkTemplatePlugin(),
    resolve({
      browser: true,
      extensions: [".js", ".ts"],
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json",
    }),
    postcss({
      extract: true,
      minimize: true,
    }),
  ],
});
