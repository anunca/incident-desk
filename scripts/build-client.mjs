import { build, context } from "esbuild";
const watch = process.argv.includes("--watch");
const options = {
  entryPoints: ["src/client/main.tsx"],
  bundle: true,
  outfile: "public/assets/app.js",
  format: "esm",
  platform: "browser",
  jsx: "automatic",
  minify: !watch,
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      watch ? "development" : "production",
    ),
  },
};
if (watch) {
  const builder = await context(options);
  await builder.watch();
} else await build(options);
