// src/lib/fonts.ts
import localFont from "next/font/local";

export const lucidaGrant = localFont({
  src: [
    {
      path: "../../public/fonts/LucidaGrande.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-lucida-grant",
});