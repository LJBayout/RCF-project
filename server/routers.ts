import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { cfrRouter } from "./routers/cfr";
import { logAuditEvent } from "./_core/auditLog";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  cfr: cfrRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    // SOC 2 Audit Logging
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
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
