import express from "express";

const app = express();

//routes import

import userRouter from "./routes/auth.routes.js";

//routes declaration
app.use("/api/v1/users", userRouter);


export default app;
