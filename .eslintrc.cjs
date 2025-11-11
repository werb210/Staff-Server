module.exports = {
  extends: ["next", "next/core-web-vitals"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["./tsconfig.json", "./server/tsconfig.json"],
  },
  ignorePatterns: ["*.config.ts", "server/dist", "node_modules"],
};
