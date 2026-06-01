import { rollup } from "rollup";
// @ts-expect-error tsx resolves .ts imports at runtime
import config from "./rollup.config.js";

const bundle = await rollup(config);
const output = Array.isArray(config.output) ? config.output[0] : config.output;
if (output) await bundle.write(output);
await bundle.close();
console.log("Build complete!");
