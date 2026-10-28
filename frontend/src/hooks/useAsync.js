import { useCallback, useEffect, useRef, useState } from 'react';

// Runs an async loader on mount (and when deps change) and tracks loading/error.
// `reload` reruns it in the background without blanking the current data.
export default function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    run();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: updater(s.data) })), []);
  return { ...state, reload: run, setData };
}
