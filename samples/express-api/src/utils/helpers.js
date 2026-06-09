const crypto = require('crypto');

function encryptPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function formatResponse(data) {
  return { success: true, data };
}

function logger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
}

function paginate(query, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
}

module.exports = { encryptPassword, formatResponse, logger, paginate };
