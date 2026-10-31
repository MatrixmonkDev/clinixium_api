const COOKIE_NAME = 'refreshToken';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: MAX_AGE_MS,
  };
}

export function setRefreshCookie(res, token) {
  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    ...cookieOptions(),
    maxAge: 0,
  });
}

export function getRefreshTokenFromCookie(req) {
  return req.cookies?.[COOKIE_NAME] || null;
}
