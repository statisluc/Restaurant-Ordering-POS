import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path"; 

//absolute path to SqLite databse file (.db) built from server folder where Node is run from 
const DB_PATH = path.join(process.cwd(), "server", "data", "restaurant.db");
//absolute path to sql scheme script that starts database upon server startup 
const SCHEMA_PATH = path.join(process.cwd(), "server", "db", "schema.sql"); 

export async function initDb(){ 

    //open .db file
    const db = await open ({ filename: DB_PATH, driver: sqlite3.Database }); 

    //enable foreign keys every time
    await db.exec("PRAGMA foreign_keys = ON;"); 

    //create tables if they dont exist 
    const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
    await db.exec(schema);

    return db;
    } 

//process.cwd() = current working directory (project root when server is run)
//path.join(...) = builds OS-safe path (works on Windows, macOS, Linux)