/** Bound service outages without changing callers' cancellation behavior. */
export const boundedSupabaseFetch: typeof fetch = async (input, init) => {
  const deadline = AbortSignal.timeout(10000);
  const caller = init?.signal ?? (input instanceof Request ? input.signal : null);
  try {
    return await fetch(input, { ...init, signal: caller ? AbortSignal.any([caller, deadline]) : deadline });
  } catch (error) {
    // PostgREST recognizes AbortError as cancellation and does not retry it.
    if (deadline.aborted) throw new DOMException("Account service request timed out.", "AbortError");
    throw error;
  }
};
