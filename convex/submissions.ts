import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submitExam = mutation({
    args: {
        examId: v.id("exams"),
        studentId: v.id("users"),
        answers: v.any(),
    },
    handler: async (ctx, args) => {
        // Check if student already submitted this exam
        const existing = await ctx.db
            .query("submissions")
            .withIndex("by_student_exam", (q) => q.eq("studentId", args.studentId).eq("examId", args.examId))
            .unique();
        if (existing && existing.status === "submitted") {
            throw new Error("You have already submitted this exam");
        }

        // Get exam questions to calculate marks
        const examQuestions = await ctx.db
            .query("examQuestions")
            .withIndex("by_exam", (q) => q.eq("examId", args.examId))
            .collect();

        let totalMarks = 0;
        let obtainedMarks = 0;

        for (const eq of examQuestions) {
            const q = await ctx.db.get(eq.questionId);
            if (q) {
                totalMarks += q.marks || 0;
                const studentAnswer = args.answers[q._id];
                
                if (studentAnswer) {
                    const normalizedStudent = studentAnswer.toString().trim().toLowerCase();
                    const normalizedCorrect = q.correctAnswer.toString().trim().toLowerCase();
                    
                    let isCorrect = false;
                    
                    if (normalizedStudent === normalizedCorrect) {
                        isCorrect = true;
                    } else if (q.options && q.options.length > 0) {
                        // studentAnswer might be 'a', 'b', 'c', 'd'
                        if (normalizedStudent.length === 1 && normalizedStudent >= 'a' && normalizedStudent <= 'z') {
                            const optionIndex = normalizedStudent.charCodeAt(0) - 97; // 'a' is 97
                            if (optionIndex >= 0 && optionIndex < q.options.length) {
                                const optionText = q.options[optionIndex].toString().trim().toLowerCase();
                                if (optionText === normalizedCorrect) {
                                    isCorrect = true;
                                }
                            }
                        }
                    }
                    
                    if (isCorrect) {
                        obtainedMarks += q.marks || 0;
                    }
                }
            }
        }

        const submissionId = await ctx.db.insert("submissions", {
            examId: args.examId,
            studentId: args.studentId,
            answers: args.answers,
            marksObtained: obtainedMarks,
            status: "submitted",
            submittedAt: Date.now(),
        });

        return { submissionId, marks: obtainedMarks, totalMarks };
    },
});

export const getResults = query({
    args: { studentId: v.optional(v.id("users")), isAdmin: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        let submissions;
        if (args.isAdmin) {
            submissions = await ctx.db.query("submissions").collect();
            return await Promise.all(
                submissions.map(async (s) => {
                    const student = await ctx.db.get(s.studentId);
                    const exam = await ctx.db.get(s.examId);
                    
                    const examQuestions = await ctx.db.query("examQuestions").withIndex("by_exam", (q) => q.eq("examId", s.examId)).collect();
                    let actualTotalMarks = 0;
                    for (const eq of examQuestions) {
                        const q = await ctx.db.get(eq.questionId);
                        if (q) actualTotalMarks += q.marks || 0;
                    }
                    
                    const ratio = (exam?.passingMarks || 0) / (exam?.totalMarks || 1);
                    const requiredMarks = actualTotalMarks * ratio;

                    return {
                        ...s,
                        studentName: student?.name || "Unknown",
                        studentEmail: student?.email || "Unknown",
                        examTitle: exam?.title || "Unknown Exam",
                        subject: exam?.subject || "Unknown Subject",
                        totalMarks: actualTotalMarks,
                        passingMarks: requiredMarks,
                        marks: s.marksObtained || 0,
                        passed: (s.marksObtained || 0) >= requiredMarks
                    };
                })
            );
        } else if (args.studentId) {
            submissions = await ctx.db
                .query("submissions")
                .filter((q) => q.eq(q.field("studentId"), args.studentId))
                .collect();
            return await Promise.all(
                submissions.map(async (s) => {
                    const exam = await ctx.db.get(s.examId);
                    
                    const examQuestions = await ctx.db.query("examQuestions").withIndex("by_exam", (q) => q.eq("examId", s.examId)).collect();
                    let actualTotalMarks = 0;
                    for (const eq of examQuestions) {
                        const q = await ctx.db.get(eq.questionId);
                        if (q) actualTotalMarks += q.marks || 0;
                    }
                    
                    const ratio = (exam?.passingMarks || 0) / (exam?.totalMarks || 1);
                    const requiredMarks = actualTotalMarks * ratio;

                    return {
                        ...s,
                        examTitle: exam?.title || "Unknown Exam",
                        subject: exam?.subject || "Unknown Subject",
                        totalMarks: actualTotalMarks,
                        passingMarks: requiredMarks,
                        marks: s.marksObtained || 0,
                        passed: (s.marksObtained || 0) >= requiredMarks
                    };
                })
            );
        }
        return [];
    },
});

export const getSubmissionsByExam = query({
    args: { examId: v.id("exams") },
    handler: async (ctx, args) => {
        const exam = await ctx.db.get(args.examId);
        
        const examQuestions = await ctx.db.query("examQuestions").withIndex("by_exam", (q) => q.eq("examId", args.examId)).collect();
        let actualTotalMarks = 0;
        for (const eq of examQuestions) {
            const q = await ctx.db.get(eq.questionId);
            if (q) actualTotalMarks += q.marks || 0;
        }
        
        const ratio = (exam?.passingMarks || 0) / (exam?.totalMarks || 1);
        const requiredMarks = actualTotalMarks * ratio;

        const submissions = await ctx.db
            .query("submissions")
            .filter((q) => q.eq(q.field("examId"), args.examId))
            .collect();
            
        return await Promise.all(
            submissions.map(async (s) => {
                const student = await ctx.db.get(s.studentId);
                return {
                    ...s,
                    student_name: student?.name,
                    student_email: student?.email,
                    totalMarks: actualTotalMarks,
                    passingMarks: requiredMarks,
                    marks: s.marksObtained || 0,
                    passed: (s.marksObtained || 0) >= requiredMarks
                };
            })
        );
    },
});
