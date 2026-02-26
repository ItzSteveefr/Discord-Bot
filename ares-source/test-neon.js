import pg from 'pg';

const { Client } = pg;

const client = new Client({
	connectionString: ''
});

async function testConnection() {
	try {
		await client.connect();
		console.log('✅ Connected to Neon PostgreSQL!');
		
		const result = await client.query('SELECT NOW()');
		console.log('✅ Query successful:', result.rows[0]);
		
		await client.end();
	} catch (error) {
		console.error('❌ Connection failed:', error.message);
		process.exit(1);
	}
}

testConnection();
