import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// --- Mutations ---

export const createUser = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        role: v.string(),
        status: v.string(),
        createdAt: v.number(),
    },
    handler: async (ctx, args) => {
        // Check if email already exists
        const existing = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
        if (existing) {
            throw new Error("Email already exists");
        }

        // Special check for only one admin
        if (args.role === "admin") {
            const existingAdmin = await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("role"), "admin"))
                .first();
            if (existingAdmin) {
                throw new Error("Admin account already exists. Only one admin is allowed.");
            }
        }

        const userId = await ctx.db.insert("users", {
            name: args.name,
            email: args.email,
            password: args.password,
            role: args.role,
            status: args.status,
            createdAt: args.createdAt,
        });
        return userId;
    },
});

export const updateStatus = mutation({
    args: { id: v.id("users"), status: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { status: args.status });
    },
});

export const deleteUser = mutation({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const updateProfile = mutation({
    args: { id: v.id("users"), name: v.string(), email: v.string() },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { name: args.name, email: args.email });
    },
});

// --- Queries ---

export const getByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();
    },
});

export const getPendingTeachers = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("users")
            .filter((q) => q.and(q.eq(q.field("role"), "teacher"), q.eq(q.field("status"), "pending")))
            .collect();
    },
});

export const getAllUsers = query({
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});

export const getUserById = query({
    args: { id: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
