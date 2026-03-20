import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addQuestion = mutation({
    args: {
        teacherId: v.id("users"),
        subject: v.string(),
        questionText: v.string(),
        questionType: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.string(),
        marks: v.number(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("questions", {
            ...args,
            createdAt: Date.now(),
        });
    },
});

export const getQuestions = query({
    args: { teacherId: v.optional(v.id("users")), isAdmin: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        let questions;
        if (args.isAdmin) {
            questions = await ctx.db.query("questions").collect();
            // Join with user names for admin view
            const result = await Promise.all(
                questions.map(async (q) => {
                    const user = await ctx.db.get(q.teacherId);
                    return { ...q, teacherName: user?.name || "Unknown" };
                })
            );
            return result;
        } else if (args.teacherId) {
            questions = await ctx.db
                .query("questions")
                .filter((q) => q.eq(q.field("teacherId"), args.teacherId))
                .collect();
            return questions;
        }
        return [];
    },
});

export const deleteQuestion = mutation({
    args: { id: v.id("questions") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
