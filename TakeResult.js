const results = [];

// Get "Today" and zero out the time so we can compare just the dates
const today = new Date();
today.setHours(0, 0, 0, 0);

for (const item of $input.all()) {
  
  // 1. Parse your dd/mm/yyyy format
  const dateString = item.json.Date; 
  const parts = dateString.split('/'); 
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  const year = parseInt(parts[2], 10);
  
  const targetDate = new Date(year, month, day);

  // 2. Loop: -3 days to +3 days
  for (let i = -3; i <= 3; i++) {
    let searchDate = new Date(targetDate);
    searchDate.setDate(targetDate.getDate() + i);
    
    //  Check if this date is in the past
    // We compare the searchDate (at midnight) to today (at midnight)
    let checkDate = new Date(searchDate);
    checkDate.setHours(0, 0, 0, 0);
    
    if (checkDate < today) {
      continue; // Skip this loop iteration and move to the next date
    }
    // --------------------------------------------------

    const dateStr = searchDate.toISOString().split('T')[0];

    results.push({
      json: {
        search_date: dateStr,
        origin: item.json.Origin,
        destination: item.json.Destination,
        max_price: item.json.Max_Price,
        is_preferred_date: (i === 0) 
      }
    });
  }
}

return results;