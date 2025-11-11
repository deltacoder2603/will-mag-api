import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import env from "../src/env";

/**
 * Parse MySQL connection URL and extract connection details
 * Format: mysql://user:password@host:port/database
 */
function parseDatabaseUrl(url: string): {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
} {
  try {
    const urlObj = new URL(url);
    return {
      user: urlObj.username || "root",
      password: urlObj.password || "",
      host: urlObj.hostname || "localhost",
      port: parseInt(urlObj.port || "3306", 10),
      database: urlObj.pathname.replace("/", "") || "",
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL: ${error}`);
  }
}

async function generateDataSql() {
  console.log("📊 Generating SQL data dump...\n");

  try {
    const dbConfig = parseDatabaseUrl(env.DATABASE_URL);
    
    console.log(`📥 Connecting to database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`);
    console.log(`👤 User: ${dbConfig.user}\n`);

    // Build mysqldump command
    // --no-create-info: Don't include CREATE TABLE statements (data only)
    // --skip-triggers: Skip triggers
    // --skip-add-drop-table: Don't add DROP TABLE statements
    // --complete-insert: Use complete INSERT statements with column names
    // --skip-extended-insert: Use one INSERT per row (easier to read/edit)
    // --skip-lock-tables: Don't lock tables (useful for development)
    // --single-transaction: Ensures consistent snapshot for InnoDB tables
    
    const mysqldumpArgs = [
      `--user=${dbConfig.user}`,
      dbConfig.password ? `--password=${dbConfig.password}` : "",
      `--host=${dbConfig.host}`,
      `--port=${dbConfig.port}`,
      "--no-create-info", // Data only, no schema
      "--skip-triggers",
      "--skip-add-drop-table",
      "--complete-insert", // Include column names in INSERT statements
      "--skip-extended-insert", // One INSERT per row
      "--skip-lock-tables",
      "--single-transaction",
      "--routines=false", // Skip stored procedures
      "--events=false", // Skip events
      "--set-gtid-purged=OFF", // Skip GTID info
      dbConfig.database,
    ].filter(Boolean); // Remove empty strings

    console.log("🔄 Running mysqldump...");
    const output = execSync(`mysqldump ${mysqldumpArgs.join(" ")}`, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024 * 100, // 100MB buffer
    });

    // Add header comment
    const header = `-- SQL Data Dump
-- Generated: ${new Date().toISOString()}
-- Database: ${dbConfig.database}
-- Host: ${dbConfig.host}:${dbConfig.port}
-- 
-- This file contains INSERT statements for all data in the database.
-- To restore this data, ensure the database schema exists first.
-- 
-- Usage:
--   mysql -u ${dbConfig.user} -p ${dbConfig.database} < data.sql
--

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT=0;
START TRANSACTION;

`;

    const footer = `
COMMIT;
SET FOREIGN_KEY_CHECKS=1;
SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';
`;

    const sqlContent = header + output + footer;

    // Write to data.sql
    const filepath = path.join(process.cwd(), "data.sql");
    fs.writeFileSync(filepath, sqlContent, "utf-8");

    const fileSize = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
    
    console.log("\n✅ SQL data dump completed!");
    console.log(`📁 File saved: data.sql`);
    console.log(`📊 File size: ${fileSize} MB`);
    console.log(`\n💡 To restore this data:`);
    console.log(`   mysql -u ${dbConfig.user} -p ${dbConfig.database} < data.sql`);

  } catch (error: any) {
    console.error("\n❌ Error generating SQL dump:", error.message);
    if (error.stderr) {
      console.error("Error details:", error.stderr.toString());
    }
    throw error;
  }
}

generateDataSql()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

