import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logEvent = mutation({
    args: {
        studentId: v.id("users"),
        examId: v.id("exams"),
        eventType: v.string(),
        eventData: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("proctoringLogs", {
            ...args,
            timestamp: Date.now(),
        });
    },
});

export const getLogsByExam = query({
    args: { examId: v.id("exams"), limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("proctoringLogs")
            .withIndex("by_exam", (q) => q.eq("examId", args.examId))
            .order("desc")
            .take(args.limit || 100);

        return await Promise.all(
            logs.map(async (p) => {
                const user = await ctx.db.get(p.studentId);
                return { ...p, student_name: user?.name || "Unknown" };
            })
        );
    },
});
