import { ImageResponse } from "next/og";
import { OgImageContent } from "./components/OgImage";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "OpoAlerta — Convocatorias de empleo público en España";

export default function Image() {
  return new ImageResponse(<OgImageContent />, { ...size });
}
