export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME ?? "",
  description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? "",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  adminSubdomain: process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN ?? "admin",
  routes: {
    home: "/",
    shop: "/shop",
    search: "/search",
    cart: "/cart",
    checkout: "/checkout",
    wishlist: "/wishlist",
    account: "/account",
    dashboard: "/dashboard",
    login: "/login-v2",
  },
} as const;

export type SiteConfig = typeof siteConfig;
