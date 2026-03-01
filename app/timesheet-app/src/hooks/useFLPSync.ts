import { useCallback } from 'react';

interface FLPState {
  [key: string]: unknown;
}

/**
 * Syncs state with SAP Fiori Launchpad inner app state
 */
export function useFLPSyncDirect() {
  const syncToFLP = useCallback((state: FLPState) => {
    try {
      // FLP integration - update URL hash with state
      const hashParams = new URLSearchParams();
      Object.entries(state).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          hashParams.set(key, String(value));
        }
      });
      const newHash = hashParams.toString();
      if (window.location.hash.slice(1) !== newHash) {
        window.history.replaceState(null, '', `#${newHash}`);
      }
    } catch (error) {
      console.warn('FLP sync failed:', error);
    }
  }, []);

  const readFromFLP = useCallback((): FLPState => {
    try {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const state: FLPState = {};
      params.forEach((value, key) => {
        state[key] = value;
      });
      return state;
    } catch {
      return {};
    }
  }, []);

  return { syncToFLP, readFromFLP };
}