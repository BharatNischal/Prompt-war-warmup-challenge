/**
 * History API route — retrieves past analyses from Cloud Firestore.
 */

import { Router } from 'express';
import { getAnalysisHistory, getAnalysisById } from '../services/firestore.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const router = Router();

/**
 * GET /api/history
 * List recent analyses.
 * Query params: limit (default 10), lat, lon
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const lat = req.query.lat ? parseFloat(req.query.lat) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon) : undefined;

    const history = await getAnalysisHistory({ limit, lat, lon });

    res.json({
      success: true,
      count: history.length,
      analyses: history,
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
});

/**
 * GET /api/history/:id
 * Get a specific analysis by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.length < 5) {
      throw new ValidationError('Invalid analysis ID');
    }

    const analysis = await getAnalysisById(id);
    if (!analysis) {
      throw new NotFoundError('Analysis');
    }

    res.json({ success: true, analysis });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to retrieve analysis' });
  }
});

export default router;
