/**
 * Structured Cloud Logging service for Eco-Pulse.
 * Uses @google-cloud/logging in production, falls back to console in development.
 * Provides severity-leveled, JSON-structured logs with request context.
 *
 * @module services/logger
 */

import { Logging } from '@google-cloud/logging';
import config from '../config.js';

const LOG_NAME = 'eco-pulse';
let cloudLogger = null;

// Initialize Cloud Logging in production
if (config.nodeEnv === 'production' && config.gcpProjectId) {
  try {
    const logging = new Logging({ projectId: config.gcpProjectId });
    cloudLogger = logging.log(LOG_NAME);
    console.log('☁️  Cloud Logging initialized');
  } catch (err) {
    console.warn('⚠️  Cloud Logging init failed, using console:', err.message);
  }
}

/**
 * Write a structured log entry.
 * In production with Cloud Logging: writes structured entries to Google Cloud.
 * In development (or on Cloud Logging failure): writes to console.
 *
 * @param {'INFO'|'WARNING'|'ERROR'|'CRITICAL'|'DEBUG'} severity
 * @param {string} message - Human-readable message
 * @param {object} [data] - Additional structured data
 * @param {string} [requestId] - Request correlation ID
 */
async function writeLog(severity, message, data = {}, requestId = null) {
  const entry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    service: 'eco-pulse',
    ...(requestId && { requestId }),
    ...data,
  };

  if (cloudLogger) {
    try {
      const metadata = { severity, resource: { type: 'cloud_run_revision' } };
      const logEntry = cloudLogger.entry(metadata, entry);
      await cloudLogger.write(logEntry);
    } catch {
      // Fall back to console if Cloud Logging fails
      console.log(JSON.stringify(entry));
    }
  } else {
    // Development: structured console output
    const prefix = { INFO: 'ℹ️', WARNING: '⚠️', ERROR: '❌', CRITICAL: '🚨', DEBUG: '🔍' };
    console.log(
      `${prefix[severity] || '•'} [${severity}] ${message}`,
      Object.keys(data).length ? data : '',
    );
  }
}

/** @type {{ info: Function, warn: Function, error: Function, critical: Function, debug: Function }} */
const logger = {
  info: (msg, data, reqId) => writeLog('INFO', msg, data, reqId),
  warn: (msg, data, reqId) => writeLog('WARNING', msg, data, reqId),
  error: (msg, data, reqId) => writeLog('ERROR', msg, data, reqId),
  critical: (msg, data, reqId) => writeLog('CRITICAL', msg, data, reqId),
  debug: (msg, data, reqId) => writeLog('DEBUG', msg, data, reqId),
};

export default logger;

/**
 * Internal setter for testing — allows injecting a mock cloud logger.
 * @param {object|null} mock - The mock cloud logger (with entry/write methods)
 */
export function _setCloudLogger(mock) {
  cloudLogger = mock;
}
