import { useState, useEffect, useCallback } from 'react';
import { EVENTO_DADOS_REMOTOS, notificarDadosContaAlterados } from '../services/supabase';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      localStorage.setItem(key, JSON.stringify(valueToStore));
      notificarDadosContaAlterados();
      return valueToStore;
    });
  }, [key]);

  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      const eventoStorage = e as StorageEvent;
      if (e.type === 'storage' && eventoStorage.key === key && eventoStorage.newValue) {
        setStoredValue(JSON.parse(eventoStorage.newValue));
      } else if (e.type === EVENTO_DADOS_REMOTOS) {
        try {
          const item = localStorage.getItem(key);
          setStoredValue(item ? JSON.parse(item) : initialValue);
        } catch { setStoredValue(initialValue); }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(EVENTO_DADOS_REMOTOS, handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(EVENTO_DADOS_REMOTOS, handleStorageChange);
    };
  }, [initialValue, key]);

  return [storedValue, setValue];
}
