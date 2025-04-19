import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";

dotenv.config();

export async function POST(req: Request) {
  try {
    const { name,password } = await req.json();

    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "test_db",
      port: Number(process.env.MYSQL_PORT) || 3306,
    });

    const [rows]: any = await connection.execute(
      "SELECT LOGIN, NOM, PRENOM FROM user WHERE LOGIN = ?;",
      [name]
    );

    await connection.end();
    
    if (!process.env.JWT_SECRETKEY) {
      throw new Error("JWT_SECRET is not defined in environment variables.");
    }
    if (rows.length > 0) {
      const t = jwt.sign({user : rows[0]},process.env.JWT_SECRETKEY,{expiresIn:'1h'})
      return NextResponse.json({ success: true, user: rows[0],token:t });
    } else {
      return NextResponse.json({ success: false, message: "Invalid credentials" }, { status: 401 });
    }
  } catch (error) {
        if(error instanceof Error){
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }else{
            return NextResponse.json({ success: false, error: "Unknown error" }, { status: 500 });
        }
  }
}
