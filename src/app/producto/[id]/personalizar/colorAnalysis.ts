import { VIEW_ORDER, type ViewElements } from "./types";

// "No necesito un análisis perfecto" — a small downsampled canvas + a plain
// luminance average is enough. Transparent pixels are excluded so a logo PNG
// with a transparent background doesn't skew the average toward black.

const SAMPLE_SIZE = 32;
const ALPHA_THRESHOLD = 16;
export const LUMINANCE_THRESHOLD = 127.5;

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function hexLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return luminance(r, g, b);
}

function analyzeImageLuminance(src: string): Promise<number | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        let total = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < ALPHA_THRESHOLD) continue;
          total += luminance(data[i], data[i + 1], data[i + 2]);
          count++;
        }
        resolve(count > 0 ? total / count : null);
      } catch {
        // Cross-origin image without CORS headers taints the canvas — skip
        // this element rather than throwing; the rest can still be analyzed.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function analyzeDesignLuminance(elements: ViewElements): Promise<number | null> {
  const tasks: Promise<number | null>[] = [];
  VIEW_ORDER.forEach((view) => {
    elements[view].forEach((el) => {
      if (el.type === "text") {
        tasks.push(Promise.resolve(hexLuminance(el.color || "#1a1a1a")));
      } else if (el.type === "logo" && el.src) {
        tasks.push(analyzeImageLuminance(el.src));
      }
    });
  });

  const results = (await Promise.all(tasks)).filter((v): v is number => v !== null);
  if (results.length === 0) return null;
  return results.reduce((a, b) => a + b, 0) / results.length;
}