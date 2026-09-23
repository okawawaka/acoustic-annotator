'use client';

import { useState, useEffect } from 'react';
import { checkBackendHealth } from '@/lib/api';

/**
 * バックエンド API サーバーの死活監視・接続状態管理フック
 */
export function useBackendHealth() {
  const [backendStatus, setBackendStatus] = useState<'online' | 'standalone' | 'checking'>('checking');

  useEffect(() => {
    let mounted = true;
    const verifyHealth = async () => {
      const isOk = await checkBackendHealth();
      if (mounted) {
        setBackendStatus(isOk ? 'online' : 'standalone');
      }
    };
    verifyHealth();
    const interval = setInterval(verifyHealth, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { backendStatus };
}
