export const config = {
  apiBaseUrl: window.LEAP_API_BASE_URL || "http://127.0.0.1:8000",
  endpoints: {
    analyzeSample: "/analyze/sample",
    analyze: "/analyze",
    feedback: "/feedback",
    metrics: "/metrics",
  },
  requestTimeoutMs: 9000,
};

export function resolveUrl(path, params = {}) {
  let resolved = path;
  Object.entries(params).forEach(([key, value]) => {
    resolved = resolved.replace(`{${key}}`, encodeURIComponent(String(value)));
  });
  return `${config.apiBaseUrl}${resolved}`;
}
