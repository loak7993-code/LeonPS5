import { useEffect, useRef, useState } from "react";

export function sampleIconColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const image = new Image();
    let settled = false;
    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    image.onload = () => {
      const size = 24;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context === null) {
        finish(null);
        return;
      }
      context.drawImage(image, 0, 0, size, size);
      const pixels = context.getImageData(0, 0, size, size).data;
      let red = 0;
      let green = 0;
      let blue = 0;
      let weight = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3];
        if (alpha < 32) continue;
        const r = pixels[index];
        const g = pixels[index + 1];
        const b = pixels[index + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const weightPixel = saturation * (alpha / 255) * (1 - Math.abs(luminance - 0.5));
        red += r * weightPixel;
        green += g * weightPixel;
        blue += b * weightPixel;
        weight += weightPixel;
      }
      if (weight <= 0) {
        finish(null);
        return;
      }
      const clamp = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
      red = clamp(red / weight);
      green = clamp(green / weight);
      blue = clamp(blue / weight);
      const lift = 0.35;
      red = clamp(red + (255 - red) * lift * (1 - Math.max(red, green, blue) / 255));
      green = clamp(green + (255 - green) * lift * (1 - Math.max(red, green, blue) / 255));
      blue = clamp(blue + (255 - blue) * lift * (1 - Math.max(red, green, blue) / 255));
      finish(`#${((1 << 24) | (red << 16) | (green << 8) | blue).toString(16).slice(1)}`);
    };
    image.onerror = () => finish(null);
    image.src = url;
  });
}

export function useGameTint(): [string | null, (url: string | null) => void] {
  const [tint, setTint] = useState<string | null>(null);
  const token = useRef(0);
  const apply = (url: string | null): void => {
    token.current += 1;
    const current = token.current;
    if (url === null) {
      setTint(null);
      return;
    }
    sampleIconColor(url).then((color) => {
      if (token.current === current) setTint(color);
    });
  };
  useEffect(() => () => { token.current += 1; }, []);
  return [tint, apply];
}
