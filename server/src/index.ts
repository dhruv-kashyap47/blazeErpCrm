import dotenv from "dotenv";
import { resolve } from "node:path";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { errorHandler, notFound } from "./lib/http.js";
import { authRouter } from "./routes/auth.js";
import { challansRouter } from "./routes/challans.js";
import { customersRouter } from "./routes/customers.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { productsRouter } from "./routes/products.js";

// Local setup keeps the shared environment file at the monorepo root.
dotenv.config({ path: resolve(process.cwd(), "../.env") });
dotenv.config();
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");
const app = express();
app.use(cors()); app.use(express.json()); app.use(morgan("dev"));
app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRouter); app.use("/api/customers", customersRouter); app.use("/api/products", productsRouter); app.use("/api/challans", challansRouter); app.use("/api/dashboard", dashboardRouter);
app.use(notFound); app.use(errorHandler);
app.listen(Number(process.env.PORT || 4000), () => console.log(`API listening on ${process.env.PORT || 4000}`));
