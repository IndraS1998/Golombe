import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export async function GET() {
    const connection = await mysql.createConnection({
          host: process.env.MYSQL_HOST || "127.0.0.1",
          user: process.env.MYSQL_USER || "root",
          password: process.env.MYSQL_PASSWORD || "",
          database: process.env.MYSQL_DATABASE ,
          port: Number(process.env.MYSQL_PORT) || 3306,
        });
    try{
        const [rows]: any = await connection.execute(
            "SELECT ID_CLIENT,NOM FROM `client`;"
          );
        await connection.end();
        return NextResponse.json({ success:true,status: 200,rows });
    }catch (err){
        if(err instanceof Error){
            return NextResponse.json({ success: false, error: err.message }, { status: 500 });
        }else{
            return NextResponse.json({ success: false, error: "Unknown error" }, { status: 500 });
        }
    }
}
