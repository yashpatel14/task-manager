import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express();


// 2. CORS configuration
app.use(
  cors({
    origin: "http://localhost:5173", // Match your frontend URL exactly
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Set-Cookie", "*"],
})
);

// 1. Cookie parser first
app.use(cookieParser());
// 3. Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

//routes import

import userRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js"
import taskRouter from "./routes/task.routes.js"
import noteRouter from "./routes/note.routes.js"


//routes declaration
app.use("/api/v1/users", userRouter);
app.use("/api/v1/projects",projectRouter);
app.use("/api/v1/taskes",taskRouter);
app.use("/api/v1/notes",noteRouter);

export default app;
