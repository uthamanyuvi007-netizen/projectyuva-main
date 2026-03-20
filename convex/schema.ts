import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.string(), // "admin", "teacher", "student"
    status: v.string(), // "pending", "active"
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  questions: defineTable({
    teacherId: v.id("users"),
    subject: v.string(),
    questionText: v.string(),
    questionType: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.string(),
    marks: v.number(),
    createdAt: v.number(),
  }),

  exams: defineTable({
    title: v.string(),
    description: v.string(),
    subject: v.string(),
    duration: v.number(),
    totalMarks: v.number(),
    passingMarks: v.number(),
    scheduledDate: v.string(),
    endDate: v.optional(v.string()),
    createdBy: v.id("users"),
    status: v.string(), // "active", "inactive"
    createdAt: v.number(),
  }),

  examQuestions: defineTable({
    examId: v.id("exams"),
    questionId: v.id("questions"),
  }).index("by_exam", ["examId"]),

  submissions: defineTable({
    examId: v.id("exams"),
    studentId: v.id("users"),
    answers: v.any(), // Map of questionId to answer
    marksObtained: v.number(),
    status: v.string(), // "pending", "submitted"
    submittedAt: v.number(),
  }).index("by_student_exam", ["studentId", "examId"]),

  proctoringLogs: defineTable({
    studentId: v.id("users"),
    examId: v.id("exams"),
    eventType: v.string(),
    eventData: v.string(),
    timestamp: v.number(),
  }).index("by_exam", ["examId"]),
});
