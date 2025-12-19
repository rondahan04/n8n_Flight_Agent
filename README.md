# n8n Flight Agent

An automated flight monitoring and alerting system built with n8n that searches for flights using the Amadeus API, processes results, and sends notifications when conditions are met.

## Overview

This n8n workflow automates the process of:
1. Reading flight search requests from a Google Sheet
2. Expanding search dates (±3 days around target dates)
3. Querying the Amadeus API for flight availability
4. Parsing and enriching flight data
5. Comparing results with previous searches
6. Sending alerts or updating records based on changes

## Workflow Diagram

The complete workflow is visualized in the screenshot below:

![n8n Flight Agent Workflow](Screenshot%202025-12-19%20at%2015.06.44.png)

## Workflow Logic

### 1. **Schedule Trigger**
- Starts the workflow on a scheduled basis (e.g., daily, hourly)
- Acts as the entry point for the automation

### 2. **Get row(s) in sheet**
- Reads flight search requests from a Google Sheet
- Each row contains:
  - `Date`: Target flight date (dd/mm/yyyy format)
  - `Origin`: Departure airport code
  - `Destination`: Arrival airport code
  - `Max_Price`: Maximum acceptable price

### 3. **Code in JavaScript** (`TakeResult.js`)
This node expands each search request to cover a date range:

- **Input**: Single row with a target date
- **Logic**:
  - Parses the date from `dd/mm/yyyy` format
  - Generates search dates from **-3 days to +3 days** around the target date
  - **Skips dates in the past** (only searches future dates)
  - Flags the original target date with `is_preferred_date: true`
- **Output**: Multiple items (up to 7) with:
  - `search_date`: ISO format date (YYYY-MM-DD)
  - `origin`: Departure airport code
  - `destination`: Arrival airport code
  - `max_price`: Maximum price threshold
  - `is_preferred_date`: Boolean indicating if this is the original target date

**Example**: If the target date is `25/12/2025`, it will search for flights on:
- 22/12/2025 (is_preferred_date: false)
- 23/12/2025 (is_preferred_date: false)
- 24/12/2025 (is_preferred_date: false)
- 25/12/2025 (is_preferred_date: true) ← Original date
- 26/12/2025 (is_preferred_date: false)
- 27/12/2025 (is_preferred_date: false)
- 28/12/2025 (is_preferred_date: false)

### 4. **HTTP Request**
- Makes GET requests to the Amadeus API test endpoint
- URL format: `https://test.api.amadeus.com/...`
- Sends search parameters (date, origin, destination, max price)
- Returns flight availability data

### 5. **Parser for n8n** (`Parser.js`)
This node processes and enriches the API response:

- **Input**: Raw API response from Amadeus
- **Logic**:
  1. **Unwraps JSON**: If the response contains stringified JSON in `data` field, it parses it
  2. **Validates Results**: Checks if `data.data` exists and is a non-empty array (confirms flights were found)
  3. **Enriches Data**: Maps airline codes to full airline names using the `dictionaries.carriers` object
     - Extracts the validating airline code (e.g., "TP")
     - Looks up the full name in the carrier dictionary
     - Adds `airline_name` field to each flight object
- **Output**: Enriched flight data with airline names, or empty if no flights found

**Example Enrichment**:
```javascript
// Before: flight.validatingAirlineCodes = ["TP"]
// After: flight.airline_name = "TAP Air Portugal"
```

### 6. **Split Out**
- Splits the flight results array into individual items
- Each flight becomes a separate workflow item for processing

### 7. **Edit Fields**
- Manual field editing/transformation
- Allows custom data manipulation before routing

### 8. **Switch** (Mode: Expression)
- Routes items based on a conditional expression
- Two output paths:
  - **Output "0"**: Condition evaluates to false
  - **Output "1"**: Condition evaluates to true
- Likely checks if flights meet certain criteria (e.g., price threshold, availability)

### 9. **Get Results Sheet** (Parallel Path)
- Reads existing flight results from a Google Sheet
- Runs in parallel with the main workflow path
- Used for comparison with new results

### 10. **Change vars to Old_vars**
- Renames variables to indicate these are previous/old results
- Prepares data for comparison with new results

### 11. **Merge** (Combine Mode)
- Combines data from multiple sources:
  - **Input 1**: Items from Switch output "0"
  - **Input 2**: Items from Switch output "1" AND items from "Change vars to Old_vars"
- Merges new flight results with historical data for comparison

### 12. **If** (Conditional Check)
- Performs a final conditional check on merged data
- Two output paths:
  - **"true"**: Condition is met (likely indicates significant change or alert condition)
  - **"false"**: Condition is not met (normal update scenario)

### 13. **Send a message** (true path)
- Sends a notification/alert when the condition is true
- Likely triggers when:
  - New flights are found
  - Price changes significantly
  - Flights become unavailable
  - Other alert-worthy conditions

### 14. **Append or update row in sheet** (false path)
- Updates the results sheet with new flight data
- Appends new rows or updates existing ones
- Maintains historical record of flight searches

## Code Files

### `TakeResult.js`
Expands flight search requests to cover a ±3 day window around the target date, skipping past dates.

**Key Features**:
- Date parsing from `dd/mm/yyyy` format
- Date range generation (-3 to +3 days)
- Past date filtering
- Preferred date flagging

### `Parser.js`
Processes Amadeus API responses, validates flight data, and enriches it with airline names.

**Key Features**:
- JSON unwrapping for stringified responses
- Flight availability validation
- Airline code to name mapping
- Data enrichment

## Data Flow Summary

```
Schedule Trigger
    ↓
Read Search Requests (Sheet)
    ↓
Expand Dates (±3 days) [TakeResult.js]
    ↓
Query Amadeus API
    ↓
Parse & Enrich Results [Parser.js]
    ↓
Split Individual Flights
    ↓
Edit Fields
    ↓
Switch (Route by Condition)
    ↓
Merge with Previous Results
    ↓
If (Final Check)
    ├─→ true: Send Alert
    └─→ false: Update Sheet
```

## Prerequisites

- n8n instance (self-hosted or cloud)
- Google Sheets integration configured
- Amadeus API credentials (test or production)
- Message/notification service configured (e.g., Slack, email, WhatsApp)

## Configuration

1. **Google Sheets**: Set up connections for:
   - Input sheet (flight search requests)
   - Results sheet (historical data)

2. **Amadeus API**: Configure API endpoint and authentication

3. **Schedule**: Set the trigger frequency based on your monitoring needs

4. **Alert Service**: Configure the message sending node (Slack, email, etc.)

## Use Cases

- **Price Monitoring**: Track flight prices and get alerts when they drop
- **Availability Tracking**: Monitor when flights become available or sold out
- **Multi-date Search**: Automatically search flexible date ranges
- **Historical Comparison**: Compare current prices with previous searches

## Notes

- The workflow skips past dates to avoid unnecessary API calls
- Airline codes are automatically converted to readable names
- The system maintains a history of searches for comparison
- Alerts are only sent when significant changes are detected

