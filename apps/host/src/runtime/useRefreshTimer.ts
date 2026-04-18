import { useEffect } from 'react';

export function useRefreshTimer(intervalSeconds: number, onRefresh: () => void): void {
  useEffect(() => {
    const id = setInterval(onRefresh, intervalSeconds * 1000);
    return () => clearInterval(id);
  }, [intervalSeconds, onRefresh]);
}
