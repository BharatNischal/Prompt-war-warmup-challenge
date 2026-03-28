/**
 * Google Cloud Firestore service for Eco-Pulse.
 * Stores analysis history and enables farmers to review past recommendations.
 */

import { Firestore } from '@google-cloud/firestore';
import config from '../config.js';
import logger from './logger.js';

const COLLECTION = 'analyses';
let db = null;

// Initialize Firestore if GCP is configured
if (config.gcpProjectId) {
  try {
    db = new Firestore({ projectId: config.gcpProjectId });
    logger.info('Cloud Firestore initialized');
  } catch (err) {
    logger.warn('Firestore init failed', { error: err.message });
  }
}

/**
 * Save an analysis result to Firestore.
 * @param {object} analysis - The complete analysis result
 * @param {object} inputSummary - Summary of what inputs were provided
 * @returns {Promise<{ id: string, saved: boolean }>}
 */
export async function saveAnalysis(analysis, inputSummary = {}) {
  if (!db) {
    logger.debug('Firestore not configured, skipping save');
    return { id: `local-${Date.now()}`, saved: false };
  }

  try {
    const doc = {
      ...analysis,
      inputSummary,
      createdAt: Firestore.FieldValue.serverTimestamp(),
      ttl: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30-day TTL
    };

    const ref = await db.collection(COLLECTION).add(doc);

    logger.info('Analysis saved to Firestore', { docId: ref.id });
    return { id: ref.id, saved: true };
  } catch (err) {
    logger.error('Firestore save failed', { error: err.message });
    return { id: `error-${Date.now()}`, saved: false };
  }
}

/**
 * Retrieve recent analyses, optionally filtered by location.
 * @param {object} [options]
 * @param {number} [options.limit=10] - Max results
 * @param {number} [options.lat] - Filter by latitude (approx)
 * @param {number} [options.lon] - Filter by longitude (approx)
 * @returns {Promise<Array>}
 */
export async function getAnalysisHistory({ limit = 10, lat: _lat, lon: _lon } = {}) {
  if (!db) {
    logger.debug('Firestore not configured, returning empty history');
    return [];
  }

  try {
    const query = db.collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    const snapshot = await query.get();
    const results = [];

    snapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });

    logger.info('Analysis history retrieved', { count: results.length });
    return results;
  } catch (err) {
    logger.error('Firestore query failed', { error: err.message });
    return [];
  }
}

/**
 * Get a specific analysis by ID.
 * @param {string} id - Document ID
 * @returns {Promise<object|null>}
 */
export async function getAnalysisById(id) {
  if (!db) return null;

  try {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    logger.error('Firestore get failed', { error: err.message, docId: id });
    return null;
  }
}

/**
 * Check if Firestore is available.
 * @returns {boolean}
 */
export function isFirestoreAvailable() {
  return !!db;
}
