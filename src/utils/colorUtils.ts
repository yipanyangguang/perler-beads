import colorData from "../color";

// Create a reverse map for O(1) lookup
const hexToIdMap: Record<string, string> = {};
const idToHexMap: Record<string, string> = {};

Object.entries(colorData).forEach(([, colors]) => {
  Object.entries(colors).forEach(([id, hex]) => {
    // Normalize hex to uppercase for consistent lookup
    hexToIdMap[hex.toUpperCase()] = id;
    idToHexMap[id] = hex;
  });
});

export const getColorId = (hex: string | null): string | undefined => {
  if (!hex) return undefined;
  return hexToIdMap[hex.toUpperCase()];
};

export const getHexFromId = (id: string | null): string | undefined => {
  if (!id) return undefined;
  return idToHexMap[id];
};

export const getContrastColor = (hexColor: string): string => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return black or white based on luminance
  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};
