export async function serviceFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  service: string,
  timeoutMs: number,
) {
  const timeout = AbortSignal.timeout(timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    if (timeout.aborted) {
      throw new Error(`${service} took too long to respond. Please try again in a moment.`);
    }
    throw new Error(`${service} is currently unreachable. Please try again later.`, { cause: error });
  }
}
