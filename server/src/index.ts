import express, { Request, Response } from "express";

const app = express();
const port = Number(process.env.PORT) || 8080;
const host = "0.0.0.0";

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

app.listen(port, host, () => {
  console.log(`Server listening on ${port}`);
});
