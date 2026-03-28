/**
 * History API route — retrieves past analyses from Cloud Firestore.
 *
 * @module routes/history
 */

import { Router } from 'express';
import { getAnalysisHistory, getAnalysisById } from '../services/firestore.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';
import { HTTP_STATUS, FIRESTORE, ERROR_MESSAGES } from '../constants.js';

const router = Router();

/**
 * GET /api/history
 * List recent analyses with optional location filtering.
 * @query {number} [limit=10] - Max results (capped at 50)
 * @query {number} [lat] - Latitude filter
 * @query {number} [lon] - Longitude filter
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(
      parseInt(req.query.limit, 10) || FIRESTORE.DEFAULT_HISTORY_LIMIT,
      FIRESTORE.MAX_HISTORY_LIMIT,
    );
    const lat = req.query.lat ? parseFloat(req.query.lat) : undefined;
    const lon = req.query.lon ? parseFloat(req.query.lon) : undefined;

    const history = await getAnalysisHistory({ limit, lat, lon });

    res.json({
      success: true,
      count: history.length,
      analyses: history,
    });
  } catch (_error) {
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({ error: ERROR_MESSAGES.HISTORY_FAILED });
  }
});

/**
 * GET /api/history/:id
 * Get a specific analysis by its document ID.
 * @param {string} id - Firestore document ID (min 5 chars)
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id.length < FIRESTORE.MIN_ID_LENGTH) {
      throw new ValidationError(ERROR_MESSAGES.INVALID_ANALYSIS_ID);
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
    res.status(HTTP_STATUS.INTERNAL_ERROR).json({ error: ERROR_MESSAGES.HISTORY_FAILED });
  }
});

export default router;
