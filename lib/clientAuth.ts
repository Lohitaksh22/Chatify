let refreshPromise: Promise<void> | null = null

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Refresh failed')
      }
    })();
  }

  try {
    await refreshPromise
  } finally {
    refreshPromise = null
  }
}

export async function clientFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const options: RequestInit = {
    ...init,
    credentials: 'include',
  };


  const response = await fetch(input, options)

  if (response.status !== 401) {
    return response
  }

  try {
    await refreshSession()
  } catch {
    return response
  }

  return fetch(input, options)
}
