const mysql = require('mysql2/promise');
const { Client } = require('pg');

async function main() {
    console.log("Starting DB check...");
    try {
        const mysqlConn = await mysql.createConnection("mysql://app:app@127.0.0.1:3306/cfr_platform");
        const [mysqlRows] = await mysqlConn.execute("SELECT year, COUNT(*) as count FROM cfr_titles GROUP BY year ORDER BY year DESC;");
        console.log("MYSQL_YEARS:");
        console.table(mysqlRows);
        await mysqlConn.end();

        console.log("\nChecking Postgres coverage...");
        try {
            const pgClient = new Client({ connectionString: "postgresql://airflow:airflow@127.0.0.1:5432/airflow" });
            await pgClient.connect();
            const pgRes = await pgClient.query("SELECT (metadata->>'year')::int as year, COUNT(*) as count FROM cfr_chunks GROUP BY year ORDER BY year DESC;");
            console.log("PG_YEARS:");
            console.table(pgRes.rows);
            await pgClient.end();
        } catch (e) {
            console.log("PG connect failed (Port 5432 might not be exposed to host). Error: " + e.message);
        }
    } catch (e) {
        console.log("MySQL connect failed:", e.message);
    }
}
main();
