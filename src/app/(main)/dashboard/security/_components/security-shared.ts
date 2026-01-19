export type SecuritySettings = {
  rateLimit: {
    enabled: boolean;
    contact: { limit: number; windowSec: number };
    newsletter: { limit: number; windowSec: number };
    login: { limit: number; windowSec: number };
    register: { limit: number; windowSec: number };
    reviewsPost: { limit: number; windowSec: number };
    helpfulVote: { limit: number; windowSec: number };
    reportReview: { limit: number; windowSec: number };
  };
  originCheck: {
    enabled: boolean;
    allowedOrigins: string[];
    enforceOnPublicForms: boolean;
    enforceOnAuth: boolean;
    enforceOnReviews: boolean;
  };
  monitoring: {
    alerts: {
      rateLimitSpikes: { enabled: boolean; threshold5m: number };
      repeatedLoginFailures: { enabled: boolean; threshold5m: number };
      originBlocks: { enabled: boolean; threshold5m: number };
    };
    notifications: {
      inAppAdmins: boolean;
      emails: string[];
    };
  };
};

export const DEFAULTS: SecuritySettings = {
  rateLimit: {
    enabled: true,
    contact: { limit: 10, windowSec: 60 },
    newsletter: { limit: 10, windowSec: 60 },
    login: { limit: 10, windowSec: 60 },
    register: { limit: 5, windowSec: 60 },
    reviewsPost: { limit: 10, windowSec: 60 },
    helpfulVote: { limit: 30, windowSec: 60 },
    reportReview: { limit: 10, windowSec: 60 },
  },
  originCheck: {
    enabled: true,
    allowedOrigins: [],
    enforceOnPublicForms: true,
    enforceOnAuth: true,
    enforceOnReviews: true,
  },
  monitoring: {
    alerts: {
      rateLimitSpikes: { enabled: true, threshold5m: 50 },
      repeatedLoginFailures: { enabled: true, threshold5m: 20 },
      originBlocks: { enabled: true, threshold5m: 20 },
    },
    notifications: {
      inAppAdmins: true,
      emails: [],
    },
  },
};

export function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

export function rateLimitTargetLabel(key: string) {
  if (key === "contact") return "Contact";
  if (key === "newsletter") return "Newsletter";
  if (key === "login") return "Login";
  if (key === "register") return "Register";
  if (key === "reviewsPost") return "Post review";
  if (key === "helpfulVote") return "Helpful vote";
  if (key === "reportReview") return "Report review";
  return key;
}
