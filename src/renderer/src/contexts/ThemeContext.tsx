import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider } from 'tdesign-react';
import type { ThemeConfig } from '../../../preload/types';

interface ThemeContextType {
  currentTheme: ThemeConfig | null;
  setTheme: (id: string) => Promise<void>;
  themes: ThemeConfig[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig | null>(null);
  const [themes, setThemes] = useState<ThemeConfig[]>([]);

  const applyThemeConfig = (theme: ThemeConfig) => {
    const { tdesign, custom } = theme.config;
    const root = document.documentElement;

    // 1. 设置 TDesign 亮/暗模式
    root.setAttribute('theme-mode', theme.mode);

    // 2. 设置 TDesign 品牌色
    if (tdesign.brandColor) root.style.setProperty('--td-brand-color', tdesign.brandColor);
    if (tdesign.warningColor) root.style.setProperty('--td-warning-color', tdesign.warningColor);
    if (tdesign.errorColor) root.style.setProperty('--td-error-color', tdesign.errorColor);
    if (tdesign.successColor) root.style.setProperty('--td-success-color', tdesign.successColor);

    // 3. 应用自定义 CSS 变量 (用于业务 UI)
    Object.entries(custom).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  };

  const loadThemes = async () => {
    const res = await (window as any).api.getThemes();
    if (res.success && res.data) {
      setThemes(res.data);
    }
  };

  const loadCurrentTheme = async () => {
    const res = await (window as any).api.getCurrentTheme();
    if (res.success && res.data) {
      setCurrentTheme(res.data);
      applyThemeConfig(res.data);
    }
  };

  useEffect(() => {
    loadThemes();
    loadCurrentTheme();

    const unsubscribe = (window as any).api.onThemeChanged((theme) => {
      setCurrentTheme(theme);
      applyThemeConfig(theme);
      loadThemes(); // Refresh list in case of new files
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  const setTheme = async (id: string) => {
    const res = await (window as any).api.setTheme(id);
    if (res.success) {
      await loadCurrentTheme();
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
