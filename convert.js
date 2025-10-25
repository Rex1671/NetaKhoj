




import fs from 'fs';

// Load the JSON
const data = JSON.parse(fs.readFileSync('public/data/constituency_data.json', 'utf-8'));

const rajyaSabhaByState = {};

// Process each constituency
for (const constituency in data) {
  const mlas = data[constituency].MLAs;

  // Safely get state from the first MLA, fallback to "Unknown"
  const state = (mlas && mlas.length > 0 && mlas[0].state) || "Unknown";

  if (data[constituency].Rajya_Sabha) {
    if (!rajyaSabhaByState[state]) rajyaSabhaByState[state] = [];

    data[constituency].Rajya_Sabha.forEach(mp => {
      // Avoid duplicates by mp_index
      if (!rajyaSabhaByState[state].some(existing => existing.mp_index === mp.mp_index)) {
        rajyaSabhaByState[state].push(mp);
      }
    });
  }

  // Remove Rajya Sabha from constituency
  delete data[constituency].Rajya_Sabha;
}

// Save the cleaned original JSON
fs.writeFileSync('all_data.json', JSON.stringify(data, null, 2), 'utf-8');

// Save the state-wise Rajya Sabha JSON
fs.writeFileSync('rajya_sabha.json', JSON.stringify(rajyaSabhaByState, null, 2), 'utf-8');

console.log("Files created: all_data.json and rajya_sabha.json");
