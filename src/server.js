const app = require("./app");
const { connectDb } = require("./config/db");

const PORT = process.env.PORT || 8090;

connectDb()
  .then(() => {
    console.log("Database connection successful");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error", error);
    process.exit(1);
  });
