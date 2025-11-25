import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/', (req, res) => {
  console.log("Member req is", req.url)
  const { name, type, constituency, party, meow, bhaw } = req.query;

  console.log(`📍 [MEMBER] Page requested: ${name} (${type}), Constituency: ${constituency || 'N/A'}, Party: ${party || 'N/A'}, meow: ${meow || 'N/A'}, bhaw: ${bhaw || 'N/A'}`); // ✅ Log them

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
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

router.get('/', (req, res) => {
   console.log("Member req is",req.url)
  const { name, type, constituency, party, meow, bhaw } = req.query;
  
  console.log(`📍[MEMBER] Page requested: ${ name }(${ type }), Constituency: ${ constituency || 'N/A'}, Party: ${ party || 'N/A' }, meow: ${ meow || 'N/A' }, bhaw: ${ bhaw || 'N/A' } `); // ✅ Log them
  
  if (!name || !type) {
    return res.status(400).send(`
    < !DOCTYPE html >
      <html>
        <head>
          <title>Error - Missing Parameters</title>
          <style>
            body {
              font - family: Arial, sans-serif;
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
  
  const filePath = path.join(__dirname, '..', 'public', 'member_detail.html');
  
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('SERVER ERROR: Failed to send member_detail.html', err);
      res.status(500).send('<h1>500 Internal Server Error</h1><p>Failed to load the member details page.</p>');
    }
  });
});

export default router;