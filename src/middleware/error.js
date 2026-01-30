function notFound(req, res) {
  return res.status(404).json({
    success: false,
    error: 'not_found',
    message: 'Route not found',
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Normalize AWS SDK v3 errors (they often carry httpStatusCode in $metadata)
  const awsStatus = err && err.$metadata && Number.isFinite(err.$metadata.httpStatusCode)
    ? err.$metadata.httpStatusCode
    : undefined;

  let status = err.statusCode && Number.isFinite(err.statusCode) ? err.statusCode : 500;
  if (awsStatus && awsStatus >= 400 && awsStatus < 600) {
    status = awsStatus;
  }

  // Provide actionable but non-sensitive messages
  let message = status === 500 ? 'Internal server error' : (err.message || 'Error');

  // Common credentials errors (avoid leaking details)
  const name = err && (err.name || err.code);
  if (
    status === 500 &&
    (name === 'CredentialsProviderError' || name === 'UnrecognizedClientException')
  ) {
    message = 'AWS credentials not configured/invalid on server';
  }

  // Avoid leaking secrets/stack traces to clients in prod
  const payload = {
    success: false,
    error: name || 'error',
    message,
  };

  // Always log server-side for diagnostics
  // eslint-disable-next-line no-console
  console.error('[error]', {
    method: req.method,
    path: req.originalUrl,
    status,
    name,
    message: err && err.message,
  });
  // eslint-disable-next-line no-console
  if (err && err.stack) console.error(err.stack);

  if (process.env.NODE_ENV !== 'production') {
    payload.details = err.message;
    payload.stack = err.stack;
    if (awsStatus) payload.awsStatus = awsStatus;
  }

  return res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
