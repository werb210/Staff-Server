const fs = require("fs")

if (!fs.existsSync("dist/index.js")) {
  console.error("ERROR: dist build missing. Run npm run build")
  process.exit(1)
}

console.log("Build verified")
