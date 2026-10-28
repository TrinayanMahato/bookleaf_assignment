// Reads the payload without verifying it. Only used to restore the session and check expiry;
// the backend verifies the signature on every request.
export const decodeToken = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const isTokenExpired = (payload) => !payload?.exp || payload.exp * 1000 <= Date.now();
