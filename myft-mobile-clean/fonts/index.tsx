import { useFonts } from "expo-font";

export const FONT_FAMILIES = {
  archivoBlack: "ArchivoBlack",
  archivoNarrow: "ArchivoNarrow",
  erbaumBlack: "ErbaumBlack",
  fallback: "System", // fallback system font
};

// Hook to load all fonts at once
export function useAppFonts() {
  const [loaded] = useFonts({
    [FONT_FAMILIES.archivoBlack]: require("./ArchivoBlack-Regular.ttf"),
    [FONT_FAMILIES.archivoNarrow]: require("./ArchivoNarrow-VariableFont_wght.ttf"),
  });

  return loaded;
}
