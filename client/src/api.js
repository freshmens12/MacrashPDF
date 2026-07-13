const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Ping the server. Used by the footer status indicator — on free hosting
// (Render) the first request after idle also wakes the sleeping instance.
export async function checkHealth(timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}/api/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const REQUEST_TIMEOUT_MS = 180_000; // 3 minutes, then treat as a backend timeout

// options: { mode: 'preset', level: 'low'|'medium'|'high' }
//       or { mode: 'target', targetBytes: number }
export async function compressPdf(file, options) {
  const form = new FormData();
  form.append('file', file);
  form.append('mode', options.mode);
  if (options.mode === 'target') {
    form.append('targetBytes', String(options.targetBytes));
  } else {
    form.append('level', options.level);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}/api/compress`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      let message = 'Compression failed. Please try again.';
      try {
        const data = await res.json();
        if (data?.error) message = data.error;
      } catch {
        // non-JSON error body — keep the generic message
      }
      throw new Error(message);
    }

    const blob = await res.blob();
    return {
      blob,
      originalSize: Number(res.headers.get('X-Original-Size')) || file.size,
      compressedSize: Number(res.headers.get('X-Compressed-Size')) || blob.size,
      alreadyOptimized: res.headers.get('X-Already-Optimized') === 'true',
      targetMet: res.headers.get('X-Target-Met') !== 'false',
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('The server took too long to respond. Please try again.');
    }
    if (err instanceof TypeError) {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
