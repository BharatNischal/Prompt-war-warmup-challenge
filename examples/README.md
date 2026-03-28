# Example Data for Eco-Pulse

This folder contains sample data you can use to test the application without needing real sensors or field photos.

## Files

| File | Description | How to Use |
|---|---|---|
| `sample_sensor_data.txt` | Messy soil moisture, temperature, and humidity readings | Paste into the "Sensor Readings / Notes" textarea |
| `sample_logbook_notes.txt` | Simulated handwritten logbook transcription | Paste into the "Sensor Readings / Notes" textarea |
| `sample_request.json` | Example POST body for `/api/analyze` (JSON fields) | Use with `curl` for API testing |
| `sample_response.json` | Example successful response from `/api/analyze` | Reference for frontend rendering |
| `sample_weather_response.json` | Example OpenWeatherMap response | Reference for weather widget |
| `field_photo_rice.jpg` | Generated sample rice paddy field photo | Upload via the "Field & Logbook Photos" zone |
| `logbook_scan.jpg` | Generated sample handwritten logbook scan | Upload via the "Field & Logbook Photos" zone |

## Quick Test with curl

```bash
# Text-only analysis (no images)
curl -X POST http://localhost:8080/api/analyze \
  -F "latitude=16.5062" \
  -F "longitude=80.6480" \
  -F "cropInfo=Rice (Sona Masuri), 3 acres, planted 85 days ago, expected harvest in 2 weeks" \
  -F "sensorData=$(cat examples/sample_sensor_data.txt)" \
  -F "phone=+919876543210" \
  -F "language=Telugu"

# With images
curl -X POST http://localhost:8080/api/analyze \
  -F "fieldImages=@examples/field_photo_rice.jpg" \
  -F "fieldImages=@examples/logbook_scan.jpg" \
  -F "latitude=16.5062" \
  -F "longitude=80.6480" \
  -F "cropInfo=Rice (Sona Masuri), 3 acres, planted 85 days ago" \
  -F "sensorData=$(cat examples/sample_sensor_data.txt)" \
  -F "phone=+919876543210" \
  -F "language=Telugu"
```
