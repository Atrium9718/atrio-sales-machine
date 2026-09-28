import * as React from 'react';

let settingsPromise: Promise<Record<string, unknown>> | null = null;

function loadSettings(): Promise<Record<string, unknown>> {
  if (!settingsPromise) {
    settingsPromise = fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: any[]) => Object.fromEntries((Array.isArray(list) ? list : []).map((d) => [d.key, d.value])))
      .catch(() => {
        settingsPromise = null;
        return {};
      });
  }
  return settingsPromise;
}

/** Valor de un parámetro del catálogo de configuración (con su valor por defecto mientras carga). */
export function useSettingValue<T>(key: string, defaultValue: T): T {
  const [value, setValue] = React.useState<T>(defaultValue);
  React.useEffect(() => {
    let active = true;
    loadSettings().then((all) => {
      if (active && all[key] !== undefined && all[key] !== null) setValue(all[key] as T);
    });
    return () => {
      active = false;
    };
  }, [key]);
  return value;
}
