const express = require('express');
const app = express();
const PORT = 3000; // or any port you like

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
