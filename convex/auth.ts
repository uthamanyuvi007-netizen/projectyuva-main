"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = 'online-exam-proctoring-secret-key-2024';

export const register = action({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        role: v.string(),
    },
    handler: async (ctx, args): Promise<any> => {
        const hashedPassword = bcrypt.hashSync(args.password, 10);
        const status = args.role === 'teacher' ? 'pending' : 'active';

        try {
            const userId: Id<"users"> = await ctx.runMutation((api as any).users.createUser, {
                name: args.name,
                email: args.email,
                password: hashedPassword,
                role: args.role,
                status: status,
                createdAt: Date.now(),
            });
            return { success: true, userId, status };
        } catch (error: any) {
            return { success: false, message: (error as Error).message };
        }
    },
});

export const login = action({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args): Promise<any> => {
        const user: Doc<"users"> | null = await ctx.runQuery((api as any).users.getByEmail, { email: args.email });

        if (!user) {
            return { success: false, message: "Invalid credentials" };
        }

        if (user.status === 'pending') {
            return { success: false, message: 'Account pending admin approval' };
        }

        const isMatch = await bcrypt.compare(args.password, user.password);
        if (!isMatch) {
            return { success: false, message: "Invalid credentials" };
        }

        const token: string = jwt.sign(
            { id: user._id, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return {
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        };
    },
});
