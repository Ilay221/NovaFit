
export function hexToHsl(hex: string): { h: number, s: number, l: number } {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Handle 3-digit hex
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  let r = parseInt(hex.slice(0, 2), 16) / 255;
  let g = parseInt(hex.slice(2, 4), 16) / 255;
  let b = parseInt(hex.slice(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { 
    h: Math.round(h * 360), 
    s: Math.round(s * 100), 
    l: Math.round(l * 100) 
  };
}

export function getContrastColor(hex: string): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  // Perceptive luminance formula
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // If brightness > 155, suggest black text, otherwise white
  return brightness > 155 ? '0 0% 0%' : '0 0% 100%';
}

export function applyThemeColor(hex: string | null | undefined) {
  if (!hex) {
    // Reset to default if no hex
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--primary-foreground');
    document.documentElement.style.removeProperty('--ring');
    document.documentElement.style.removeProperty('--nova-glow');
    document.documentElement.style.removeProperty('--nova-calories');
    document.documentElement.style.removeProperty('--nova-success');
    document.documentElement.style.removeProperty('--orb-primary');
    return;
  }

  const { h, s, l } = hexToHsl(hex);
  const contrast = getContrastColor(hex);
  
  const hslStr = `${h} ${s}% ${l}%`;
  
  document.documentElement.style.setProperty('--primary', hslStr);
  document.documentElement.style.setProperty('--ring', hslStr);
  document.documentElement.style.setProperty('--nova-glow', hslStr);
  document.documentElement.style.setProperty('--nova-calories', hslStr);
  document.documentElement.style.setProperty('--nova-success', hslStr);
  document.documentElement.style.setProperty('--primary-foreground', contrast);
  
  // Dynamic Background Orb
  document.documentElement.style.setProperty('--orb-primary', `hsla(${h}, ${s}%, ${l}%, 0.45)`);
}
