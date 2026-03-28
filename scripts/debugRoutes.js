const axios = require("axios")

async function run() {
  const res = await axios.get("https://server.boreal.financial/debug/routes")
  console.log(JSON.stringify(res.data, null, 2))
}

run()
