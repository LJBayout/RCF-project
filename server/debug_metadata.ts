
import { Client } from "pg";

const client = new Client({
    connectionString: process.env.DATABASE_URL_PG || "postgresql://airflow:airflow@postgres:5432/airflow",
});

async function inspectMetadata() {
    try {
        await client.connect();
        const res = await client.query("SELECT metadata FROM cfr_chunks LIMIT 5");
        console.log("Raw Metadata 2:", JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

inspectMetadata();
