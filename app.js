const express = require('express');
const app = express();

// Load environment variables from .env file (primarily for local development)
require('dotenv').config();

// Import the Pool object from the pg library
const { Pool } = require('pg');

// Ensure the DATABASE_URL environment variable is set.
// IMPORTANT: This should now contain the Supabase POOLER connection string.
if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL environment variable is not set.");
  console.error("Please ensure it's set and contains the Supabase POOLER connection string.");
  process.exit(1); // Exit if the critical variable is missing
}

// Create a new PostgreSQL connection pool
console.log("Configuring database pool..."); // Add log for clarity
const pool = new Pool({
  // Use the connection string provided by the environment variable
  // This should be the POOLER URI (e.g., postgresql://user:pass@host:port/db)
  connectionString: "postgresql://postgres.zyuusockfwqsvnftfuyj:myTestDb1234@aws-0-us-east-2.pooler.supabase.com:5432/postgres",

  // Configure SSL settings for Supabase Pooler connection
  ssl: {
    // Allow connections even if the certificate chain cannot be fully verified.
    // This is often necessary for poolers/proxies that might use intermediate
    // or self-signed certificates not in the default Node.js trust store.
    rejectUnauthorized: false // !!! SECURITY NOTE: Disables certificate validation. Use with caution. !!!
  }
});

// Test the database connection on startup
console.log("Attempting initial database connection test...");
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    // Provide more context in the error message
    console.error('Error connecting to the database pool during startup test:', err.stack);
    // Optional: Consider exiting if the initial connection fails critically
    // process.exit(1);
  } else {
    console.log('Successfully connected to the database pool at:', res.rows[0].now);
  }
});

// --- REST OF THE APPLICATION CODE ---

// Use PORT from environment variables or default to 10000
const port = process.env.PORT || 10000;

// Respond to GET requests at the root URL '/'
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Define the '/rules' endpoint
app.get('/rules', async (req, res) => {
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

// Start server, bind to 0.0.0.0 for Render (or similar platforms)
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running and listening on port ${port}`);
});