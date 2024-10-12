import mysql, { RowDataPacket } from 'mysql2/promise';
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

interface CompletionStats {
  count: number;
  average_time: number;
  fastest_time: string;
  completion_date?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get the current date in UTC
      const nowUTC = new Date();
      const todayUTC = nowUTC.toISOString().split('T')[0]; // Get UTC date in YYYY-MM-DD

      const [todayResults] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count, AVG(completion_time) as average_time, MIN(completion_time) as fastest_time FROM completions WHERE completion_date = ?',
        [todayUTC]
      );
      const [recordResults] = await pool.query<RowDataPacket[]>(
        'SELECT completion_date, COUNT(*) as count FROM completions GROUP BY completion_date ORDER BY count DESC LIMIT 1'
      );

      const todayStats = todayResults[0] as CompletionStats;
      const recordStats = recordResults[0] as CompletionStats;

      res.status(200).json({
        todayCount: todayStats.count,
        averageTime: todayStats.average_time,
        fastestTime: todayStats.fastest_time,
        recordDay: recordStats.completion_date,
        recordCount: recordStats.count,
      });
    } catch (err) {
      console.error('Database error:', err);
      res.status(500).json({ error: 'Database error', details: err });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}