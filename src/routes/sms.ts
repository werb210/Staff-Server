import express from "express";

const router = express.Router();

router.post("/incoming", (req, res) => {
  console.log("Inbound SMS:", req.body);
  return res.type("text/xml").send("<Response></Response>");
});

export default router;
