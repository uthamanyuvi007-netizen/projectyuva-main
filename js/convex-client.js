import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL || "https://neat-bison-449.convex.cloud";

export const convex = new ConvexClient(CONVEX_URL);
export { api };
