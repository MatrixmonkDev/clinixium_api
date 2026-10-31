export function getRequestInfo(req) {
  // Extract IP address - check multiple headers for proxy scenarios
  const ip = req.ip ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    'unknown';

  // Extract browser/user agent
  const browser = req.headers['user-agent'] || 'Unknown';

  return {
    ip,
    browser,
  };
}
