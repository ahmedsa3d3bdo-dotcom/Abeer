import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_ADMIN_NAME ?? "",
  version: packageJson.version,
  copyright: `© ${currentYear}${process.env.NEXT_PUBLIC_ADMIN_NAME ? `, ${process.env.NEXT_PUBLIC_ADMIN_NAME}.` : ""}`,
  meta: {
    title: process.env.NEXT_PUBLIC_ADMIN_META_TITLE ?? "",
    description: process.env.NEXT_PUBLIC_ADMIN_META_DESCRIPTION ?? "",
  },
};
