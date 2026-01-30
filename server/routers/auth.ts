/**
 * Authentication Router
 * Handles login, logout, and audit logging
 */

import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { logAuditEvent } from "../_core/auditLog";

export const authRouter = router({
  /**
   * Log successful login
   */
  logLogin: publicProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await logAuditEvent({
        action: "user.login",
        resource: "user",
        resourceId: input.username,
        ipAddress: ctx.req?.ip || ctx.req?.socket?.remoteAddress,
        userAgent: ctx.req?.headers?.["user-agent"],
        success: true,
      });
      return { success: true };
    }),

  /**
   * Log failed login attempt
   */
  logLoginFailed: publicProcedure
    .input(z.object({ username: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await logAuditEvent({
        action: "security.violation",
        resource: "user",
        resourceId: input.username,
        ipAddress: ctx.req?.ip || ctx.req?.socket?.remoteAddress,
        userAgent: ctx.req?.headers?.["user-agent"],
        metadata: { reason: "invalid_credentials" },
        success: false,
        errorMessage: "Invalid username or password",
      });
      return { success: true };
    }),

  /**
   * Log logout
   */
  logLogout: publicProcedure.mutation(async ({ ctx }) => {
    await logAuditEvent({
      action: "user.logout",
      resource: "user",
      ipAddress: ctx.req?.ip || ctx.req?.socket?.remoteAddress,
      userAgent: ctx.req?.headers?.["user-agent"],
      success: true,
    });
    return { success: true };
  }),
});
