import { app } from "./app";

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

export { app };
export default app;
