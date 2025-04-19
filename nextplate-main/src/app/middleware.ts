import { NextRequest,NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function middleware(r : NextRequest){
    const authHeader = r.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    
    if (!process.env.JWT_SECRETKEY) {
        throw new Error("JWT_SECRET is not defined in environment variables.");
    }

    try {
        jwt.verify(token, process.env.JWT_SECRETKEY);
        return NextResponse.next();
    } catch (error) {
        console.log(error)
        return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }
}

export const config = {
    matcher: "/api/protected/:path*",
};