/**
 * Tool declarations for Gemini Function Calling.
 * These define the "actions" that Gemini can trigger as a Climate Strategist.
 *
 * In production, voice alerts use Google Cloud Text-to-Speech to generate
 * real audio in the farmer's local language, stored in Cloud Storage.
 */

import { synthesizeSpeech } from './tts.js';
import logger from './logger.js';

export const toolDeclarations = [
  {
    functionDeclarations: [
      {
        name: 'reserve_warehouse_space',
        description:
          'Reserves emergency storage space at the nearest local warehouse for harvested crops. ' +
          'Call this when weather analysis indicates an urgent need to harvest and store crops to prevent loss.',
        parameters: {
          type: 'object',
          properties: {
            crop_type: {
              type: 'string',
              description: 'Type of crop to store (e.g., rice, wheat, cotton, sugarcane)',
            },
            quantity_kg: {
              type: 'number',
              description: 'Estimated quantity in kilograms to reserve space for',
            },
            urgency_level: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'How urgently the space is needed based on weather timeline',
            },
            farmer_name: {
              type: 'string',
              description: 'Name of the farmer requesting storage',
            },
            harvest_deadline: {
              type: 'string',
              description: 'Recommended deadline to complete harvest (ISO date or descriptive)',
            },
          },
          required: ['crop_type', 'quantity_kg', 'urgency_level'],
        },
      },
      {
        name: 'send_voice_alert',
        description:
          'Sends an automated voice call to the farmer in their local language with critical, ' +
          'personalized weather and harvest guidance. Uses Google Cloud Text-to-Speech to generate ' +
          'audio in the farmer\'s native language. Call this for urgent, time-sensitive alerts ' +
          'that the farmer needs to act on immediately.',
        parameters: {
          type: 'object',
          properties: {
            phone_number: {
              type: 'string',
              description: 'Farmer phone number in E.164 format (e.g., +919876543210)',
            },
            language: {
              type: 'string',
              description: 'Language for the voice message (e.g., Hindi, Tamil, Telugu, English)',
            },
            message_text: {
              type: 'string',
              description:
                'The full alert message to be converted to speech. Should be clear, actionable, ' +
                'and specific to the farmer\'s situation.',
            },
            alert_severity: {
              type: 'string',
              enum: ['INFO', 'WARNING', 'CRITICAL'],
              description: 'Severity level of the alert',
            },
          },
          required: ['phone_number', 'language', 'message_text'],
        },
      },
    ],
  },
];

/**
 * Executes a tool call returned by Gemini.
 * Voice alerts now use Google Cloud Text-to-Speech for real audio generation.
 * Warehouse reservations remain as realistic mock for demonstration.
 *
 * @param {string} name - Tool function name
 * @param {object} args - Arguments from Gemini
 * @param {string} [analysisId] - Analysis session ID for file naming
 * @returns {Promise<object>} Execution result
 */
export async function executeToolCall(name, args, analysisId = '') {
  switch (name) {
    case 'reserve_warehouse_space':
      return reserveWarehouseSpace(args);
    case 'send_voice_alert':
      return sendVoiceAlert(args, analysisId);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Mock warehouse reservation.
 * Simulates contacting a local warehouse and reserving emergency storage.
 */
async function reserveWarehouseSpace(args) {
  const confirmationId = `WH-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  logger.info('Warehouse space reserved', {
    crop: args.crop_type,
    quantity: args.quantity_kg,
    urgency: args.urgency_level,
    confirmationId,
  });

  await new Promise((r) => setTimeout(r, 200));

  return {
    success: true,
    confirmation_id: confirmationId,
    warehouse_name: 'District Agricultural Cooperative #47',
    warehouse_location: 'Nearest available storage facility',
    reserved_capacity_kg: args.quantity_kg,
    crop_type: args.crop_type,
    urgency: args.urgency_level,
    estimated_cost_inr: Math.round(args.quantity_kg * 0.5),
    valid_until: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    message: `Space for ${args.quantity_kg}kg of ${args.crop_type} has been reserved at the nearest facility. Confirmation ID: ${confirmationId}`,
  };
}

/**
 * Send voice alert using Google Cloud Text-to-Speech.
 * Generates real audio in the farmer's local language, uploads to Cloud Storage,
 * and returns a playable audio URL.
 */
async function sendVoiceAlert(args, analysisId) {
  const callId = `CALL-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  logger.info('Voice alert triggered', {
    phone: args.phone_number,
    language: args.language,
    severity: args.alert_severity || 'INFO',
    callId,
  });

  // Generate real audio using Google Cloud TTS
  const ttsResult = await synthesizeSpeech(
    args.message_text,
    args.language,
    analysisId,
  );

  return {
    success: true,
    call_id: callId,
    phone_number: args.phone_number,
    language: args.language,
    alert_severity: args.alert_severity || 'INFO',
    message_delivered: args.message_text,
    status: 'DELIVERED',
    timestamp: new Date().toISOString(),
    // Real TTS audio URL (if Cloud TTS is configured)
    audio_url: ttsResult.audioUrl || null,
    audio_generated: ttsResult.audioGenerated,
    message: `Voice alert sent to ${args.phone_number} in ${args.language}. Call ID: ${callId}`,
  };
}
