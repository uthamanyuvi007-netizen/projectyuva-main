import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createExam = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        subject: v.string(),
        duration: v.number(),
        totalMarks: v.number(),
        passingMarks: v.number(),
        scheduledDate: v.string(),
        endDate: v.optional(v.string()),
        createdBy: v.id("users"),
        questionIds: v.array(v.id("questions")),
    },
    handler: async (ctx, args) => {
        const { questionIds, ...examData } = args;
        const examId = await ctx.db.insert("exams", {
            ...examData,
            status: "active",
            createdAt: Date.now(),
        });

        for (const qid of questionIds) {
            await ctx.db.insert("examQuestions", {
                examId,
                questionId: qid,
            });
        }

        return examId;
    },
});

export const getExams = query({
    args: { createdBy: v.optional(v.id("users")), isAdmin: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        let exams;
        if (args.isAdmin) {
            exams = await ctx.db.query("exams").collect();
            return await Promise.all(
                exams.map(async (e) => {
                    const user = await ctx.db.get(e.createdBy);
                    return { ...e, creatorName: user?.name || "Unknown" };
                })
            );
        } else if (args.createdBy) {
            exams = await ctx.db
                .query("exams")
                .filter((q) => q.eq(q.field("createdBy"), args.createdBy))
                .collect();
            return exams;
        } else {
            // For student view, only show active exams
            exams = await ctx.db
                .query("exams")
                .filter((q) => q.eq(q.field("status"), "active"))
                .collect();
            
            // Filter by endDate locally if provided
            const now = Date.now();
            exams = exams.filter(e => {
                if (!e.endDate || e.endDate.trim() === "") return true;
                const end = new Date(e.endDate).getTime();
                return isNaN(end) || now <= end;
            });
            return exams;
        }
    },
});

export const getExamDetails = query({
    args: { id: v.id("exams") },
    handler: async (ctx, args) => {
        const exam = await ctx.db.get(args.id);
        if (!exam) return null;

        const examQuestions = await ctx.db
            .query("examQuestions")
            .withIndex("by_exam", (q) => q.eq("examId", args.id))
            .collect();

        const questions = await Promise.all(
            examQuestions.map(async (eq) => {
                return await ctx.db.get(eq.questionId);
            })
        );

        return {
            ...exam,
            questions: questions.filter(Boolean),
        };
    },
});

export const getStats = query({
    handler: async (ctx) => {
        const students = await ctx.db.query("users").filter(q => q.eq(q.field("role"), "student")).collect();
        const teachers = await ctx.db.query("users").filter(q => q.eq(q.field("role"), "teacher")).collect();
        const exams = await ctx.db.query("exams").collect();
        const submissions = await ctx.db.query("submissions").collect();

        return {
            students: students.length,
            teachers: teachers.length,
            exams: exams.length,
            submissions: submissions.length,
        };
    }
});

export const deleteExam = mutation({
    args: { id: v.id("exams") },
    handler: async (ctx, args) => {
        const examQuestions = await ctx.db
            .query("examQuestions")
            .withIndex("by_exam", (q) => q.eq("examId", args.id))
            .collect();
            
        for (const eq of examQuestions) {
            await ctx.db.delete(eq._id);
        }
        
        await ctx.db.delete(args.id);
        return true;
    }
});
