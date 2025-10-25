import express from 'express';
import Logger from '../services/logger.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

router.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.ADMIN_API_KEY) {
    Logger.logSecurity('unauthorized_log_access', req);
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

router.get('/stats', async (req, res) => {
  try {
    const stats = await Logger.getLogStats();
    res.json(stats);
  } catch (error) {
    Logger.logError(error);
    res.status(500).json({ error: 'Failed to get log stats' });
  }
});

router.get('/read/:filename', (req, res) => {
  const { filename } = req.params;
  const { lines = 100 } = req.query;
  
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const logPath = path.join(__dirname, '..', 'logs', filename);
  
  if (!fs.existsSync(logPath)) {
    return res.status(404).json({ error: 'Log file not found' });
  }
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const logLines = content.split('\n').slice(-lines).filter(Boolean);
  
  res.json({
    filename,
    lines: logLines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return line;
      }
    })
  });
});

export default router;