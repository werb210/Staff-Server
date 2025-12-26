import express, { Request, Response } from "express";

const app = express();

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).send("OK");
});

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
