import { useState, useEffect } from 'react';
import { WifiHigh } from '@phosphor-icons/react';

export function NetworkInfo() {
  const [networkUrl, setNetworkUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/network')
      .then((r) => r.json())
      .then((data) => {
        if (data.ip && data.port) {
          setNetworkUrl(`${data.protocol}://${data.ip}:${data.port}`);
        }
      })
      .catch(() => {});
  }, []);

  if (!networkUrl) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <div className="flex items-center gap-2 justify-center text-gray-500">
        <WifiHigh size={14} weight="duotone" />
        <span className="text-[11px]">Conéctate desde tu celular:</span>
      </div>
      <code className="block text-center text-xs font-mono text-green-600 bg-green-50 rounded-md px-2 py-1 mt-1">
        {networkUrl}
      </code>
    </div>
  );
}
