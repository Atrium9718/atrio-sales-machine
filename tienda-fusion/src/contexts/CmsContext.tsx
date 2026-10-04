import React, { createContext, useContext, useEffect, useState } from 'react';
import { CmsGlobalConfig, DEFAULT_CMS_GLOBAL_CONFIG } from '../types/cms';


interface CmsContextType {
  config: CmsGlobalConfig;
  isLoading: boolean;
  reloadConfig: () => Promise<void>;
  updateConfig: (newConfig: Partial<CmsGlobalConfig>) => Promise<boolean>;
}

const CmsContext = createContext<CmsContextType>({
  config: DEFAULT_CMS_GLOBAL_CONFIG,
  isLoading: false,
  reloadConfig: async () => {},
  updateConfig: async () => false,
});

export const CmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<CmsGlobalConfig>(() => {
    try {
      const cached = localStorage.getItem('fusion_cms_config');
      if (cached) {
        return {
          ...DEFAULT_CMS_GLOBAL_CONFIG,
          ...JSON.parse(cached),
          branding: { ...DEFAULT_CMS_GLOBAL_CONFIG.branding, ...(JSON.parse(cached).branding || {}) },
          topBar: { ...DEFAULT_CMS_GLOBAL_CONFIG.topBar, ...(JSON.parse(cached).topBar || {}) },
        };
      }
    } catch (e) {}
    return DEFAULT_CMS_GLOBAL_CONFIG;
  });

  const [isLoading, setIsLoading] = useState(false);

  const reloadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/cms/settings');
      if (res.ok) {
        const data = await res.json();
        const merged: CmsGlobalConfig = {
          ...DEFAULT_CMS_GLOBAL_CONFIG,
          ...data,
          branding: { ...DEFAULT_CMS_GLOBAL_CONFIG.branding, ...(data.branding || {}) },
          topBar: { ...DEFAULT_CMS_GLOBAL_CONFIG.topBar, ...(data.topBar || {}) },
          headerNav: data.headerNav && data.headerNav.length > 0 ? data.headerNav : DEFAULT_CMS_GLOBAL_CONFIG.headerNav,
          footerColumns: data.footerColumns && data.footerColumns.length > 0 ? data.footerColumns : DEFAULT_CMS_GLOBAL_CONFIG.footerColumns,
        };
        setConfig(merged);
        try {
          localStorage.setItem('fusion_cms_config', JSON.stringify(merged));
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Error fetching CMS config from server:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<CmsGlobalConfig>): Promise<boolean> => {
    try {
      const merged: CmsGlobalConfig = {
        ...config,
        ...newConfig,
        branding: { ...config.branding, ...(newConfig.branding || {}) },
        topBar: { ...config.topBar, ...(newConfig.topBar || {}) },
        headerNav: newConfig.headerNav || config.headerNav,
        footerColumns: newConfig.footerColumns || config.footerColumns,
      };
      
      setConfig(merged);
      try {
        localStorage.setItem('fusion_cms_config', JSON.stringify(merged));
      } catch (e) {}

      const res = await fetch('/api/cms/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (res.ok) {
        const saved = await res.json();
        setConfig(saved);
        try {
          localStorage.setItem('fusion_cms_config', JSON.stringify(saved));
        } catch (e) {}
        return true;
      }
      return true; // Saved locally at least
    } catch (e) {
      console.error('Error updating CMS config:', e);
      return false;
    }
  };

  useEffect(() => {
    reloadConfig();
  }, []);

  return (
    <CmsContext.Provider value={{ config, isLoading, reloadConfig, updateConfig }}>
      {children}
    </CmsContext.Provider>
  );
};

export const useCms = () => useContext(CmsContext);
