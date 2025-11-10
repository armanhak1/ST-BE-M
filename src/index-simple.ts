// Minimal test server - if this doesn't work, something is fundamentally wrong with Railway
import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  console.log("✅ Root endpoint hit!");
  res.json({ 
    status: "ok",
    message: "Minimal test server is working!",
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3000
  });
});

app.get("/health", (req, res) => {
  console.log("✅ Health endpoint hit!");
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

console.log(`🔧 Environment:`);
console.log(`   PORT: ${process.env.PORT}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🔧 Starting server on ${HOST}:${PORT}...`);

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 MINIMAL SERVER RUNNING on ${HOST}:${PORT}`);
  console.log(`📍 Visit: http://localhost:${PORT}/`);
  console.log(`✅ Server is ready to accept connections`);
});

server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
  console.error('   Code:', error.code);
  console.error('   Message:', error.message);
});

// Handle Railway's health checks
process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

