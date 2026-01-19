import { z, type ZodSchema } from "zod";
import { ValidationError } from "../types";

/**
 * Validate data against a Zod schema
 */
export async function validate<T>(schema: ZodSchema<T>, data: unknown): Promise<T> {
  try {
    return await schema.parseAsync(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError("Validation failed", error.errors);
    }
    throw error;
  }
}

/**
 * Validate request body
 */
export async function validateBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json();
    return await validate(schema, body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ValidationError("Invalid JSON in request body");
    }
    throw error;
  }
}

/**
 * Validate query parameters
 */
export function validateQuery<T>(searchParams: URLSearchParams, schema: ZodSchema<T>): T {
  const params = Object.fromEntries(searchParams.entries());
  return schema.parse(params);
}

// ==================== COMMON VALIDATION SCHEMAS ====================

export const emailSchema = z.string().email("Invalid email address");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const uuidSchema = z.string().uuid("Invalid UUID");

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
