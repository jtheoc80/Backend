const app = require('./app');

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ValveChain Sidecar API running on port ${PORT}`);
});
