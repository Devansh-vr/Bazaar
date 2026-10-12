// Holds the current access token in memory (NOT localStorage) so it
// isn't exposed to XSS via storage APIs. Persistence across page
// reloads comes from silently calling /user/refresh on app load,
// which relies on the HttpOnly refresh-token cookie instead.
//
// This lives outside React so the Axios interceptors (which run
// outside the component tree) and AuthContext can share one source
// of truth without prop drilling or import cycles.

let accessToken = null;
let onAuthFailure = null; // callback AuthContext registers to handle a failed refresh

export const getAccessToken = () => accessToken;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const clearAccessToken = () => {
  accessToken = null;
};

export const setOnAuthFailure = (callback) => {
  onAuthFailure = callback;
};

export const notifyAuthFailure = () => {
  if (onAuthFailure) onAuthFailure();
};
