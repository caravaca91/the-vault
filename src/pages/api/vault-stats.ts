
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import type { NextApiRequest, NextApiResponse } from 'next';

// Load environment variables from .env file
dotenv.config();

// Create a connection pool to improve performance and manage multiple connections
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Log each time this endpoint is hit
    console.log('Received POST request at /api/vault-stats'); 

    const { completionTime, completionDate } = req.body;

    if (!completionTime || !completionDate) {
      return res.status(400).json({ error: 'Completion time and date are required.' });
    }

    try {
      // Insert the completion date and time into the database
      const query = 'INSERT INTO completions (completion_time, completion_date) VALUES (?, ?)';
      const [results] = await pool.query(query, [completionTime, completionDate]);

      return res.status(200).json({ message: 'Game completion saved successfully.', results });
    } catch (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error', details: err });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
