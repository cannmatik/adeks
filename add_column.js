const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  try {
    await client.query('ALTER TABLE reservations ADD COLUMN IF NOT EXISTS admin_notes text;');
    console.log('Column admin_notes added successfully');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}

main();
