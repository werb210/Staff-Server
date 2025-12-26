import express, { Request, Response } from "express";

const app = express();
const port = process.env.PORT || 8080;

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
