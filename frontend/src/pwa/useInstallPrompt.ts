import { useState, useEffect, useRef, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Capturar evento global ANTES de que React monte
let savedPrompt: BeforeInstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  savedPrompt = e as BeforeInstallPromptEvent;
});

export function useInstallPrompt() {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(savedPrompt);
  const [ready, setReady] = useState(!!savedPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
    setIsAndroid(/Android/i.test(ua));

    if (savedPrompt) {
      promptRef.current = savedPrompt;
      setReady(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      savedPrompt = e as BeforeInstallPromptEvent;
      promptRef.current = savedPrompt;
      setReady(true);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      promptRef.current = null;
      savedPrompt = null;
      setReady(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async () => {
    const p = promptRef.current;
    if (!p) return;
    try {
      await p.prompt();
      const { outcome } = await p.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
    } catch {}
    promptRef.current = null;
    savedPrompt = null;
    setReady(false);
  }, []);

  const canInstall = !isInstalled && (ready || isIOS || isAndroid);
  const hasNativePrompt = ready && !!promptRef.current;

  return { canInstall, isIOS, isAndroid, isInstalled, install, hasNativePrompt };
}
