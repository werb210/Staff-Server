import app from "./app";

console.log("BOOTING SERVER...");

const port = Number(process.env.PORT || 3000);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
