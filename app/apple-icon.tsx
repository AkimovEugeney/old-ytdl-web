import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(#a855f7,#5b21b6)" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path d="M32 14v22M21 27l11 11 11-11" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M17 47h30" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
