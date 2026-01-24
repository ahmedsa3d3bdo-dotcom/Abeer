import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 8,
          background: "#ffffff",
        }}
      >
        <img
          src={`${baseUrl}/Storefront/images/Logo.png`}
          width={28}
          height={28}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    {
      ...size,
    },
  );
}
