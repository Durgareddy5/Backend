const express = require("express");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const cors = require('cors');
const fs = require("fs");
const path = require("path");

// Import Custom Middlewares
const requestIdMiddleware = require("./common/middlewares/requestId.middleware");
const loggerMiddleware = require("./common/middlewares/logger.middleware");
const responseFormatterMiddleware = require("./common/middlewares/responseFormatter.middleware");
const securityMiddlewares = require("./common/middlewares/security.middleware");
const notFoundMiddleware = require("./common/middlewares/notFound.middleware");
const errorHandlerMiddleware = require("./common/middlewares/errorHandler.middleware");

// Import Modules
const landingModule = require("./modules/landing");
const authModule = require("./modules/authentication");
const profileModule = require("./modules/profile");
const followModule = require("./modules/follow");
const connectionsModule = require("./modules/connections");
const scholarModule = require("./modules/scholar");
const feedModule = require("./modules/feed");
const publicationModule = require("./modules/publication");
const messageModule = require("./modules/messages");
const searchModule = require("./modules/search");
const uploadModule = require("./modules/upload");
const projectModule = require("./modules/project");
const datasetModule = require("./modules/dataset");
const notificationsModule = require("./modules/notifications");

const collaborationRoutes = require("./modules/collaborations/routes/collaboration.routes");
const identityRoutes = require("./modules/identity/routes/identity.routes");
const recommendationsModule = require("./modules/recommendations");

const app = express();

// Disable X-Powered-By
app.disable("x-powered-by");

// Request ID assignment
app.use(requestIdMiddleware);

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err); // falls through to errorHandlerMiddleware
  }
});

// Security configuration (Helmet, CORS, Limiter handled inside securityMiddlewares)
app.use(securityMiddlewares);

// Compression
app.use(compression());

// Parse incoming request payloads
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Serve static uploaded files (With serverless write-permission fallback)
let uploadsDir = path.join(process.cwd(), "uploads");
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (error) {
  // If the directory is read-only (like AWS Lambda /var/task), fall back to the writable /tmp sandbox
  uploadsDir = path.join("/tmp", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}
app.use("/uploads", express.static(uploadsDir));

// Request logger
app.use(loggerMiddleware);

// Response formatter helper
app.use(responseFormatterMiddleware);

// Mount API Modules
app.use("/api", landingModule.routes);
app.use("/api/v1/auth", authModule.routes);
app.use("/api/v1/profile", profileModule.routes);
app.use("/api/v1/follows", followModule.routes);
app.use("/api/v1/connections", connectionsModule.routes);
app.use("/api/v1", scholarModule.routes);
app.use("/api/v1/notifications", notificationsModule.routes);
app.use("/api/v1", feedModule.routes);
app.use("/api/v1/publications", publicationModule.routes);
app.use("/api/v1/messages", messageModule.routes);
app.use("/api/v1/search", searchModule.routes);
app.use("/api/v1/uploads", uploadModule.routes);
app.use("/api/v1/projects", projectModule.routes);
app.use("/api/v1/datasets", datasetModule.routes);
app.use("/api/v1/collaborations", collaborationRoutes);

app.use("/api/v1/identity", identityRoutes);
app.use("/api/v1/recommendations", recommendationsModule.routes);

// Default root redirect to /api
app.get("/", (req, res) => {
  res.redirect("/api");
});
app.get("/health", (req, res)=>{
  res.send({message:"server running successfully"});
});

// Capture non-existent routes
app.use(notFoundMiddleware);

// Centralized error handling
app.use(errorHandlerMiddleware);

module.exports = app;
