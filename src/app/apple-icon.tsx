import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.APP_URL || "http://localhost:3000";
  const baseUrl = String(configured).replace(/\/+$/, "");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          background: "#ffffff",
        }}
      >
        <img
          src={`${baseUrl}/logo.png`}
          width={140}
          height={140}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
