import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './db/db.config.js';
import { errorHandler } from './src/middleware/error-handler.js';
import { mainRouter } from "./src/api/routes.js";



const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors( ));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

//main route

app.use("/api", mainRouter);


app.use(errorHandler);

async function startServer() {
  try {
    const connection = await db.getConnection();
    connection.release();
    console.log(`Successfully connected to the database: ${process.env.DB_NAME}`);
  } catch (error) {
    console.error('Error connecting DB (continuing):', error.message);
  }

  app.listen(port, (err) => {
    if (err) {
      console.error('Failed to start the server:', err.message);
      process.exit(1);
    }
    console.log(`Server is running on http://localhost:${port}`);
  });
}

startServer();
