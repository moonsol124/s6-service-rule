const express = require('express');
const app = express();

// --- NEW CODE: START ---
// Load environment variables from .env file
require('dotenv').config();

// Import the Pool object from the pg library
const { Pool } = require('pg');

// Check if the DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  process.exit(1); // Exit the application if DB URL is missing
}

// Create a new PostgreSQL connection pool using the connection URI
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase typically requires SSL, but may not reject unauthorized connections
  // depending on your network setup. Adjust if needed.
  // ssl: {
  //   rejectUnauthorized: false // Use with caution in production
  // }
});

// Optional: Test the database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err.stack);
  } else {
    console.log('Successfully connected to the database at:', res.rows[0].now);
  }
});

// --- NEW CODE: END ---


// Use PORT from environment variables or default to 10000
const port = process.env.PORT || 10000;

// Respond to GET requests at the root URL '/'
app.get('/', (req, res) => {
  res.send('Hello World!');
});


// --- NEW CODE: START ---
// Define the '/rules' endpoint
app.get('/rules', async (req, res) => {
  // Define the SQL query to join the three tables
  // Using aliases (a, rw, rt) for clarity and to avoid column name conflicts (like 'id')
  // Selecting specific columns with aliases makes the output predictable.
  const sqlQuery = `
    SELECT
        a.id AS asset_id,
        a.name AS asset_name,
        a.asset_type,
        rw.attribute_name AS when_attribute,
        rw.operator AS when_operator,
        rw.value AS when_value,
        rt.attribute_name AS then_attribute,
        rt.value AS then_value
    FROM
        asset a
    INNER JOIN
        rule_when rw ON a.id = rw.id
    INNER JOIN
        rule_then rt ON a.id = rt.id;
  `;
    // Note: This specific join structure requires an asset to have AT LEAST ONE
    // corresponding row in BOTH rule_when AND rule_then to appear in the results.
    // If you need assets with only 'when' or only 'then' rules, or a different
    // representation of rules (e.g., one rule having multiple 'when'/'then' parts),
    // the query would need to be adjusted (e.g., using LEFT JOINs or restructuring).

  let client; // Declare client outside try block for access in finally
  try {
    // Get a client connection from the pool
    client = await pool.connect();
    // Execute the query
    const result = await client.query(sqlQuery);
    // Send the results back as JSON
    res.status(200).json(result.rows);
  } catch (err) {
    // Log the error and send an error response
    console.error('Error executing /rules query:', err.stack);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  } finally {
    // VERY IMPORTANT: Release the client connection back to the pool
    // This ensures the connection is available for other requests.
    if (client) {
      client.release();
    }
  }
});

// --- NEW CODE: END ---


// Start server, bind to 0.0.0.0 for Render (or similar platforms)
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running and listening on port ${port}`);
});