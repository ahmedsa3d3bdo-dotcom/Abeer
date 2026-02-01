import { NextRequest } from "next/server";
import { discountExpirationService } from "@/server/services/discount-expiration.service";
import { handleRouteError, successResponse } from "@/server/utils/response";
import { requirePermission } from "@/server/utils/rbac";

/**
 * POST /api/v1/discounts/expire
 * Manually trigger discount expiration check
 */
export async function POST(request: NextRequest) {
  try {
    await requirePermission(request, "discounts.manage");
    
    const result = await discountExpirationService.manualExpire();
    
    if (!result.success) {
      return Response.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return successResponse({
      message: "Discount expiration check completed",
      expiredCount: result.expiredCount,
      expiredDiscounts: result.expiredDiscounts,
    });
  } catch (e) {
    return handleRouteError(e, request);
  }
}
