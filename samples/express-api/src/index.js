const express = require('express');
const { connectDB } = require('./models/User');
const { authMiddleware } = require('./middleware/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const { logger, formatResponse } = require('./utils/helpers');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(authMiddleware);
app.use(logger);

app.get('/api/health', (req, res) => {
  res.json(formatResponse({ status: 'ok', timestamp: new Date().toISOString() }));
});

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

app.listen(PORT, async () => {
  await connectDB();
  console.log(`Server running on port ${PORT}`);
});
