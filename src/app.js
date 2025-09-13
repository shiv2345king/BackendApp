import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// ✅ Static files (so uploaded images can be accessed)
app.use(express.static("public"));
app.use(cookieParser());

// ✅ Only one set of body parsers (for JSON / urlencoded APIs)
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// ✅ Mount routes AFTER middleware
import userRoutes from "./routes/user.routes.js";
app.use("/api/v1/users", userRoutes);
import videoRoutes from "./routes/video.routes.js";
app.use("/api/v1/videos", videoRoutes);
import likeRouter from "./routes/likes.routes.js"
app.use("/api/v1/likes", likeRouter);
import commentRouter from "./routes/comment.routes.js"
app.use("/api/v1/comments", commentRouter)
import tweetRouter from "./routes/tweet.routes.js"
app.use("/api/v1/tweets", tweetRouter)
export { app };
