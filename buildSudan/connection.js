import mongoose from "mongoose";

// Never register these models on the host application's default connection.
export const connection = mongoose.createConnection();
connection.on("error", () => {
  // Driver messages may contain a connection string or other sensitive details.
  console.error("BuildSudan database connection error");
});
