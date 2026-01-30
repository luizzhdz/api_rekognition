function apiKeyAuth(requiredApiKey) {
  return function apiKeyAuthMiddleware(req, res, next) {
    if (!requiredApiKey) return next();

    const provided = req.header('x-api-key');
    if (!provided || provided !== requiredApiKey) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'Missing or invalid API key',
      });
    }

    return next();
  };
}

module.exports = { apiKeyAuth };
