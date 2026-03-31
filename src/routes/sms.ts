import express from "express";

const router = express.Router();

router.post("/incoming", (req, res) => {
  console.log("Inbound SMS:", req.body);
  res.send("<Response></Response>");
});

export default router;
