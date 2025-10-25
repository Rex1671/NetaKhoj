import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Main member page route
router.get('/', (req, res) => {
  const { name, type } = req.query;
  
  console.log(`📍 [MEMBER] Page requested: ${name} (${type})`);
  
  if (!name || !type) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - Missing Parameters</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              background: #0f172a; 
              color: white; 
            }
          </style>
        </head>
        <body>
          <div>
            <h1>❌ Missing Parameters</h1>
            <p>Name and type are required</p>
            <a href="/" style="color: #667eea;">← Back to Map</a>
          </div>
        </body>
      </html>
    `);
  }
  
  // Serve the member detail page
  res.sendFile(path.join(__dirname, '..', 'public', 'member_detail.html'));
});

export default router;