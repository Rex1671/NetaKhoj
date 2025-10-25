import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { memberQueryValidator, candidateQueryValidator } from '../middleware/validator.js';
import { scraperLimiter } from '../middleware/rateLimiter.js';
import prsService from '../services/prsService.js';
import cacheService from '../services/cacheService.js';
import browserPool from '../services/browserPool.js';
import { getCandidateData } from '../findNeta.js';

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// 🗺️ Serve GeoJSON files
router.get('/constituencies', async (req, res) => {
  try {
    const { type = 'assembly' } = req.query;
    const cacheKey = cacheService.getCacheKey('geojson', type);
    let data = await cacheService.get('geojson', cacheKey);

    if (!data) {
      const filename =
        type === 'assembly' ? 'india_assembly.geojson' : 'india_parliamentary.geojson';
      const filepath = path.join(__dirname, '..', 'data', 'geojson', filename);

      if (!fs.existsSync(filepath)) {
        return res.status(404).json({ error: 'GeoJSON file not found' });
      }

      data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      cacheService.set('geojson', cacheKey, data);
    }

    res.json(data);
  } catch (error) {
    console.error('❌ [API] Error serving constituencies:', error);
    res.status(500).json({ error: 'Failed to load constituencies' });
  }
});

// 📊 All data
router.get('/all-data', async (req, res) => {
  try {
    const cacheKey = 'all_data';
    let data = await cacheService.get('geojson', cacheKey);

    if (!data) {
      const filepath = path.join(__dirname, '..', 'data', 'all_data.json');
      data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      cacheService.set('geojson', cacheKey, data);
    }

    res.json(data);
  } catch (error) {
    console.error('❌ [API] Error serving all-data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// 🏛️ Rajya Sabha data
router.get('/rajya-sabha', async (req, res) => {
  try {
    const cacheKey = 'rajya_sabha';
    let data = await cacheService.get('geojson', cacheKey);

    if (!data) {
      const filepath = path.join(__dirname, '..', 'data', 'rajya_sabha.json');
      data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      cacheService.set('geojson', cacheKey, data);
    }

    res.json(data);
  } catch (error) {
    console.error('❌ [API] Error serving rajya-sabha:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// 🧩 PRS endpoint
router.get('/prs', scraperLimiter, memberQueryValidator, async (req, res) => {
  try {
    const { name, type } = req.query;
    console.log(`🌐 [REQ] /api/prs: ${name} (${type})`);

    const data = await prsService.getMemberData(name, type);

    if (!data.found) {
      return res
        .status(404)
        .send('<div class="text-center"><h3>Member not found</h3></div>');
    }

    res.json(data);
  } catch (error) {
    console.error('❌ [API] /prs error:', error);
    res.status(500).send('<div class="text-center"><h3>Error fetching data</h3></div>');
  }
});

// 🧑‍💼 Candidate endpoint
router.get('/candidate', scraperLimiter, candidateQueryValidator, async (req, res) => {
  try {
    const { name, constituency, party } = req.query;
    const tempId = 'tmp_' + crypto.randomBytes(8).toString('hex');
    console.log(`🔍 [API] Candidate request: ${name} (${constituency}, ${party}) tempId=${tempId}`);

    const candidateData = await getCandidateData(name, constituency, party);

    res.json({
      data: candidateData.data || candidateData,
      tempId,
    });
    console.log(candidateData.data)
    console.log("Liabilities",candidateData.data.liabilities);
    console.log("immovable asset",candidateData.data.immovableAssets)
     console.log("immovable asset",candidateData.data.movableAssets)
      console.log("immovable asset",candidateData.data.incomeTax)
  } catch (error) {
    console.error('❌ [API] /candidate error:', error);
    res.status(500).json({ error: 'Failed to fetch candidate data' });
  }
});

// 🩺 Health check
router.get('/health', (req, res) => {
  const browserStats = browserPool.getStats();
  const cacheStats = cacheService.getStats();

  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: {
      used: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
      total: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
    },
    browser: browserStats,
    cache: cacheStats,
    timestamp: new Date().toISOString(),
  });
});

// 🧹 Cache management
router.post('/cache/clear', (req, res) => {
  const { type } = req.query;
  cacheService.flush(type);
  res.json({ message: `Cache cleared: ${type || 'all'}` });
});

export default router;
