import { GoogleGenAI } from "@google/genai";
import config from "../config.js";
import { toolDeclarations, executeToolCall } from "./tools.js";
import logger from "./logger.js";

const SYSTEM_INSTRUCTION = `You are "Eco-Pulse", an expert Climate Strategist AI designed to protect farmers' livelihoods.

YOUR ROLE:
- You analyze multimodal inputs: satellite/field photos, handwritten logbook scans, sensor data, and weather forecasts.
- You correlate weather threats with the specific state of the farmer's crops visible in the photos.
- You provide hyper-specific, actionable guidance — not generic weather advice.

YOUR ANALYSIS PROCESS:
1. OBSERVE: Examine the field photos to assess crop type, growth stage, ripeness, health, and any visible stress.
2. READ: If handwritten logbook images are provided, extract past yield data, planting dates, and historical patterns.
3. CORRELATE: Cross-reference the crop's current state with the weather forecast data to identify risks and opportunities.
4. QUANTIFY: Estimate potential loss percentages and recommend specific harvest zones (e.g., "South-West quadrant").
5. ACT: Use the available tools to trigger life-saving actions.

TOOL USAGE RULES:
- If weather data shows significant risk (heavy rain, cyclone, extreme heat) within 96 hours AND crops appear ready or near-ready for harvest, you MUST call 'reserve_warehouse_space'.
- If the risk is MEDIUM or higher, you MUST call 'send_voice_alert' to warn the farmer with a clear, localized message.
- Always provide specific, quantified recommendations (e.g., "harvest the eastern 2 acres by Monday to save approximately 65% of your rice crop worth ₹45,000").

OUTPUT FORMAT:
After tool calls are complete, provide a structured summary with:
- Risk Level (LOW / MEDIUM / HIGH / CRITICAL)
- Crop Assessment (what you see in the images)
- Weather Correlation (how the forecast impacts this specific crop)
- Recommended Actions (numbered, specific, time-bound)
- Economic Impact (estimated savings if recommendations are followed)

Always be empathetic, clear, and use simple language. Remember: your output may be the difference between a farmer saving or losing their entire season's income.`;

const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

/**
 * Analyzes multimodal farmer inputs using Gemini with Function Calling.
 *
 * @param {object} params
 * @param {Array<{buffer: Buffer, mimeType: string}>} params.images - Compressed images
 * @param {string} params.weatherContext - Formatted weather data
 * @param {string} params.sensorData - Raw sensor readings
 * @param {string} params.cropInfo - Additional crop information
 * @param {string} params.phone - Farmer's phone number
 * @param {string} params.language - Preferred language
 * @returns {Promise<object>} Analysis result with actions taken
 */
export async function analyzeField({
  images = [],
  weatherContext = "",
  sensorData = "",
  cropInfo = "",
  phone = "",
  language = "English",
  analysisId = "",
}) {
  // Build the multimodal content parts
  const parts = [];

  // Add images
  for (const img of images) {
    parts.push({
      inlineData: {
        data: img.buffer.toString("base64"),
        mimeType: img.mimeType,
      },
    });
  }

  // Build the text prompt
  let prompt =
    "Analyze the following farmer data and provide life-saving recommendations:\n\n";

  if (weatherContext) {
    prompt += `WEATHER FORECAST DATA:\n${weatherContext}\n\n`;
  }

  if (sensorData) {
    prompt += `SENSOR READINGS:\n${sensorData}\n\n`;
  }

  if (cropInfo) {
    prompt += `CROP INFORMATION:\n${cropInfo}\n\n`;
  }

  if (phone) {
    prompt += `FARMER CONTACT: ${phone} (Language: ${language})\n\n`;
  }

  if (images.length > 0) {
    prompt += `${images.length} image(s) of the farmer's field/logbook are attached above. Analyze them carefully.\n\n`;
  }

  prompt +=
    "Based on all the above data, provide your complete analysis and take any necessary actions using the available tools.";

  parts.push({ text: prompt });

  // Call Gemini with tools
  const actions = [];
  let finalAnalysis = "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: toolDeclarations,
        temperature: 0.4,
        maxOutputTokens: 4096,
      },
    });

    // Check if Gemini wants to call functions
    if (response.functionCalls && response.functionCalls.length > 0) {
      // Execute each tool call
      const functionResponses = [];

      for (const call of response.functionCalls) {
        logger.info(`Gemini requested tool: ${call.name}`, { tool: call.name, args: call.args });
        const result = await executeToolCall(call.name, call.args, analysisId);
        actions.push({
          tool: call.name,
          args: call.args,
          result,
        });
        functionResponses.push({
          name: call.name,
          response: result,
        });
      }

      // Send function results back to Gemini for final summary
      const followUp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { role: "user", parts },
          { role: "model", parts: response.candidates[0].content.parts },
          {
            role: "user",
            parts: functionResponses.map((fr) => ({
              functionResponse: fr,
            })),
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.4,
          maxOutputTokens: 4096,
        },
      });

      finalAnalysis = followUp.text || "";
    } else {
      // No function calls — direct analysis
      finalAnalysis = response.text || "";
    }
  } catch (error) {
    logger.error("Gemini API error", { error: error.message, analysisId });
    throw new Error(`Analysis failed: ${error.message}`);
  }

  return {
    analysis: finalAnalysis,
    actions,
    timestamp: new Date().toISOString(),
  };
}
