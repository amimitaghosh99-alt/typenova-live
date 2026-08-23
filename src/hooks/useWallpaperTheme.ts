import { useState, useEffect, useCallback, useRef } from 'react';
import type { Theme } from '@/data/constants';
import { extractThemeFromImage, resizeAndOptimizeImage } from '@/lib/colorExtractor';
import { saveWallpaperToDB, loadWallpaperFromDB, clearWallpaperFromDB } from '@/lib/wallpaperStorage';

export interface CuratedWallpaper {
  id: string;
  name: string;
  url: string;
  thumbnail: string;
  defaultAccent: string;
}

export const CURATED_WALLPAPERS: CuratedWallpaper[] = [
  {
    id: 'cyber-monolith',
    name: 'Cyber Monolith',
    url: '/wallpapers/cyber-monolith.jpg',
    thumbnail: '/wallpapers/cyber-monolith.jpg',
    defaultAccent: 'orange',
  },
  {
    id: 'crimson-angel',
    name: 'Crimson Seraph',
    url: '/wallpapers/crimson-angel.jpg',
    thumbnail: '/wallpapers/crimson-angel.jpg',
    defaultAccent: 'rose',
  },
  {
    id: 'sunset-rebel',
    name: 'Sunset Rebel',
    url: '/wallpapers/sunset-rebel.jpg',
    thumbnail: '/wallpapers/sunset-rebel.jpg',
    defaultAccent: 'amber',
  },
  {
    id: 'orbital-dawn',
    name: 'Orbital Dawn',
    url: '/wallpapers/orbital-dawn.jpg',
    thumbnail: '/wallpapers/orbital-dawn.jpg',
    defaultAccent: 'sky',
  },
];

export function useWallpaperTheme() {
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [wallpaperTheme, setWallpaperTheme] = useState<Theme | null>(null);
  const [brightness, setBrightnessState] = useState<number>(0.7);
  const [blur, setBlurState] = useState<number>(0);
  const [customAccent, setCustomAccentState] = useState<string>('auto');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const activeUrlRef = useRef<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const config = await loadWallpaperFromDB('active');
        if (config && isMounted) {
          activeUrlRef.current = config.dataUrl;
          setWallpaperUrl(config.dataUrl);
          setBrightnessState(config.brightness ?? 0.7);
          setBlurState(config.blur ?? 0);
          setCustomAccentState(config.customAccent ?? 'auto');

          if (config.customAccent === 'auto' || !config.extractedThemeJson) {
            const th = await extractThemeFromImage(config.dataUrl, 'auto');
            if (isMounted) setWallpaperTheme(th);
          } else {
            try {
              setWallpaperTheme(JSON.parse(config.extractedThemeJson));
            } catch {
              const th = await extractThemeFromImage(config.dataUrl, config.customAccent);
              if (isMounted) setWallpaperTheme(th);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load wallpaper from IndexedDB:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();
    return () => { 
      isMounted = false; 
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      // Downscale and compress to lightweight GPU texture (1080p WebP/JPEG ~300KB)
      const optimizedDataUrl = await resizeAndOptimizeImage(file, 1920, 0.85);

      const theme = await extractThemeFromImage(optimizedDataUrl, customAccent);
      activeUrlRef.current = optimizedDataUrl;
      setWallpaperUrl(optimizedDataUrl);
      setWallpaperTheme(theme);

      await saveWallpaperToDB({
        id: 'active',
        dataUrl: optimizedDataUrl,
        brightness,
        blur,
        customAccent,
        extractedThemeJson: JSON.stringify(theme),
        timestamp: Date.now(),
      });

      window.dispatchEvent(new Event('wallpaper_updated'));
    } catch (err) {
      console.error('Failed to process wallpaper file:', err);
    }
  }, [brightness, blur, customAccent]);

  const selectCuratedWallpaper = useCallback(async (preset: CuratedWallpaper) => {
    try {
      const accentToUse = customAccent === 'auto' ? 'auto' : customAccent;
      const theme = await extractThemeFromImage(preset.url, accentToUse);
      
      activeUrlRef.current = preset.url;
      setWallpaperUrl(preset.url);
      setWallpaperTheme(theme);

      await saveWallpaperToDB({
        id: 'active',
        dataUrl: preset.url,
        brightness,
        blur,
        customAccent,
        extractedThemeJson: JSON.stringify(theme),
        timestamp: Date.now(),
      });

      window.dispatchEvent(new Event('wallpaper_updated'));
    } catch (err) {
      console.error('Failed to select curated wallpaper:', err);
    }
  }, [brightness, blur, customAccent]);

  const setBrightness = useCallback((val: number) => {
    setBrightnessState(val);
    if (activeUrlRef.current) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (activeUrlRef.current) {
          saveWallpaperToDB({
            id: 'active',
            dataUrl: activeUrlRef.current,
            brightness: val,
            blur,
            customAccent,
            timestamp: Date.now(),
          });
        }
      }, 200);
    }
  }, [blur, customAccent]);

  const setBlur = useCallback((val: number) => {
    setBlurState(val);
    if (activeUrlRef.current) {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        if (activeUrlRef.current) {
          saveWallpaperToDB({
            id: 'active',
            dataUrl: activeUrlRef.current,
            brightness,
            blur: val,
            customAccent,
            timestamp: Date.now(),
          });
        }
      }, 200);
    }
  }, [brightness, customAccent]);

  const setCustomAccent = useCallback(async (accent: string) => {
    setCustomAccentState(accent);
    if (activeUrlRef.current) {
      const theme = await extractThemeFromImage(activeUrlRef.current, accent);
      setWallpaperTheme(theme);
      saveWallpaperToDB({
        id: 'active',
        dataUrl: activeUrlRef.current,
        brightness,
        blur,
        customAccent: accent,
        extractedThemeJson: JSON.stringify(theme),
        timestamp: Date.now(),
      });
    }
  }, [brightness, blur]);

  const clearWallpaper = useCallback(async () => {
    activeUrlRef.current = null;
    setWallpaperUrl(null);
    setWallpaperTheme(null);
    await clearWallpaperFromDB('active');
    window.dispatchEvent(new Event('wallpaper_updated'));
  }, []);

  return {
    wallpaperUrl,
    wallpaperTheme,
    brightness,
    blur,
    customAccent,
    isLoading,
    handleFileUpload,
    selectCuratedWallpaper,
    setBrightness,
    setBlur,
    setCustomAccent,
    clearWallpaper,
  };
}
