import esbuild from "esbuild";
import process from "process";
const isWatch = process.argv.includes("--watch");
const ctx = await esbuild.context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "codemirror", "@codemirror/*"],
  format: "cjs", target: "es2018", logLevel: "info",
  sourcemap: "inline", treeShaking: true, outfile: "main.js",
});
if (isWatch) { await ctx.watch(); } else { await ctx.rebuild(); ctx.dispose(); }
