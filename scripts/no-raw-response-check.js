const fs = require("fs");
const path = require("path");

const banned = ["res.send(", "res.end(", "res.json({"];

function scan(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const full = path.join(dir, file);

    if (fs.statSync(full).isDirectory()) {
      scan(full);
    } else {
      const content = fs.readFileSync(full, "utf8");

      banned.forEach((term) => {
        if (content.includes(term)) {
          console.error(`RAW RESPONSE FOUND: ${term} in ${full}`);
          process.exit(1);
        }
      });
    }
  }
}

scan(path.join(__dirname, "../src"));
