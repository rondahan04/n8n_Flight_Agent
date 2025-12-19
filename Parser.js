const results = [];

for (const item of $input.all()) {
  let finalData = item.json;

  // 1. Unwrap the stringified JSON if needed
  if (item.json.data && typeof item.json.data === 'string') {
    try {
      finalData = JSON.parse(item.json.data);
    } catch (error) {
      continue;
    }
  } 
  
  // 2. CHECK: Did Amadeus actually find flights?
  if (finalData.data && Array.isArray(finalData.data) && finalData.data.length > 0) {
     
     // --- 3. ENRICH: Map Airline Codes to Names ---
     const carrierDict = finalData.dictionaries ? finalData.dictionaries.carriers : {};
     
     // Loop through every flight in the list and add the real name
     for (let flight of finalData.data) {
       const code = flight.validatingAirlineCodes[0]; // e.g., "TP"
       // Find the name in the dictionary, or fallback to the code if missing
       flight.airline_name = carrierDict[code] || code; 
     }
     // ---------------------------------------------

     results.push({ json: finalData });
  }
}

return results;