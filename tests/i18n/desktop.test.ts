import { describe, expect, it } from "vitest";
import { DICTIONARIES } from "@/i18n";

describe("desktop wallpaper texts (spec 007, annex A)", () => {
  it("match annex A in Spanish", () => {
    const { wallpaperPause, wallpaperResume } = DICTIONARIES.es.desktop;
    expect({ wallpaperPause, wallpaperResume }).toEqual({
      wallpaperPause: "Pausar fondo",
      wallpaperResume: "Reanudar fondo",
    });
  });

  it("match annex A in English", () => {
    const { wallpaperPause, wallpaperResume } = DICTIONARIES.en.desktop;
    expect({ wallpaperPause, wallpaperResume }).toEqual({
      wallpaperPause: "Pause wallpaper",
      wallpaperResume: "Resume wallpaper",
    });
  });
});
