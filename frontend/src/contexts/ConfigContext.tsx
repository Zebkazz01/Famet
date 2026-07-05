import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import client from '../api/client';
import { applyAccent, DEFAULT_ACCENT_ID } from '../utils/accentPresets';

interface AppConfig {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessLogo: string;
  accentColor: string;
  logoVersion: number;
  configVersion: number;
}

interface ConfigContextType {
  config: AppConfig;
  loading: boolean;
  reload: () => Promise<void>;
}

const defaults: AppConfig = {
  businessName: 'POS',
  businessAddress: '',
  businessPhone: '',
  businessLogo: '',
  accentColor: DEFAULT_ACCENT_ID,
  logoVersion: 0,
  configVersion: 0,
};

const ConfigContext = createContext<ConfigContextType>({
  config: defaults,
  loading: true,
  reload: async () => {},
});

function updateManifestLink(version: number) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'manifest';
    document.head.appendChild(link);
  }
  const base = '/api/manifest.json';
  link.href = version > 0 ? `${base}?v=${version}` : base;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaults);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const hasToken = !!localStorage.getItem('token');
      const { data } = await (hasToken ? client.get('/config') : client.get('/config/public'));
      localStorage.setItem('fameat-config-cache', JSON.stringify(data));
      const logo = data.business_logo || defaults.businessLogo;
      const logoVersion = Number(data.logo_version) || 0;
      const configVersion = Number(data.config_version) || 0;
      const accentColor = data.accent_color || defaults.accentColor;
      setConfig({
        businessName: data.business_name || defaults.businessName,
        businessAddress: data.business_address || defaults.businessAddress,
        businessPhone: data.business_phone || defaults.businessPhone,
        businessLogo: logo,
        accentColor,
        logoVersion,
        configVersion,
      });
      // Aplicar color de acento desde el backend (puede ser diferente al cache local)
      applyAccent(accentColor);
      // Actualizar favicon, apple-touch-icon con cache-bust
      if (logo) {
        const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (favicon) favicon.href = logoVersion > 0 ? `${logo}?v=${logoVersion}` : logo;
        document.querySelectorAll<HTMLLinkElement>('link[rel="apple-touch-icon"]').forEach((el) => {
          el.href = logoVersion > 0 ? `${logo}?v=${logoVersion}` : logo;
        });
      }
      // Title dinámico con businessName
      const bizName = data.business_name || defaults.businessName;
      document.title = `${bizName} - ByteGest POS`;
      const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
      if (appleTitle) appleTitle.content = bizName;
      // Manifest dinámico con nombre del negocio + logo
      updateManifestLink(configVersion);
    } catch {
      // Sin backend, usar defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <ConfigContext.Provider value={{ config, loading, reload }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
