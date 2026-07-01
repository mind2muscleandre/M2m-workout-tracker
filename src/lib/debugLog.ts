type DebugPayload = {
  runId: string;
  hypothesisId: string;
  location: string;
  message: string;
  data: Record<string, unknown>;
};

const INGEST_URL = process.env.EXPO_PUBLIC_DEBUG_INGEST_URL;

export function debugLog(payload: DebugPayload) {
  if (!__DEV__) return;

  const body = {
    timestamp: Date.now(),
    ...payload,
  };

  if (INGEST_URL) {
    fetch(INGEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {});
  }
}
