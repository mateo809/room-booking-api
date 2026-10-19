import { execFileSync } from "node:child_process";
import pg from "pg";
import { testDatabaseUrl } from "./test-database.js";

export default async function setup() {
  const databaseName = new URL(testDatabaseUrl).pathname.slice(1);
  const maintenanceUrl = new URL(testDatabaseUrl);
  maintenanceUrl.pathname = "/postgres";

  const client = new pg.Client({ connectionString: maintenanceUrl.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${databaseName}"`);
  await client.end();

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "ignore",
  });
}
