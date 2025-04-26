const express = require('express');
const app = express();

// Use PORT from environment variables or default to 10000
const port = process.env.PORT || 10000;

// Respond to GET requests at the root URL '/'
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Start server, bind to 0.0.0.0 for Render
app.listen(port, '0.0.0.0', () => {
  console.log(`Server is running and listening on port ${port}`);
});
