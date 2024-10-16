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
  least_attempts: number;
  completion_date?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get the current date in UTC
      const nowUTC = new Date();
      const todayUTC = nowUTC.toISOString().split('T')[0]; // Get UTC date in YYYY-MM-DD

      // Query for today's statistics (completion count, average time, fastest time, and least attempts)
      const [todayResults] = await pool.query<RowDataPacket[]>(
        'SELECT COUNT(*) as count, AVG(completion_time) as average_time, MIN(completion_time) as fastest_time, MIN(attempts) as least_attempts FROM completions WHERE completion_date = ?',
        [todayUTC]
      );
      const [recordResults] = await pool.query<RowDataPacket[]>(
        'SELECT completion_date, COUNT(*) as count FROM completions GROUP BY completion_date ORDER BY count DESC LIMIT 1'
      );

      // Query to get the attempt counts for the day
      const [attemptResults] = await pool.query<RowDataPacket[]>(
        'SELECT attempts FROM completions WHERE completion_date = ?',
        [todayUTC]
      );

      // Group attempts into specified ranges
      const attemptRanges = {
        '1-6': 0,
        '7-12': 0,
        '13-18': 0,
        '19-24': 0,
        '>25': 0,
      };

      attemptResults.forEach((row) => {
        const attempts = row.attempts;
        if (attempts >= 1 && attempts <= 6) {
          attemptRanges['1-6']++;
        } else if (attempts >= 7 && attempts <= 12) {
          attemptRanges['7-12']++;
        } else if (attempts >= 13 && attempts <= 18) {
          attemptRanges['13-18']++;
        } else if (attempts >= 19 && attempts <= 24) {
          attemptRanges['19-24']++;
        } else if (attempts > 24) {
          attemptRanges['>25']++;
        }
      });

      const todayStats = todayResults[0] as CompletionStats;
      const recordStats = recordResults[0] as CompletionStats;

      res.status(200).json({
        todayCount: todayStats.count,
        averageTime: todayStats.average_time,
        fastestTime: todayStats.fastest_time,
        leastAttempts: todayStats.least_attempts, // Add least attempts to response
        recordDay: recordStats.completion_date,
        recordCount: recordStats.count,
        attemptDistribution: [
          { range: '1-6', count: attemptRanges['1-6'] },
          { range: '7-12', count: attemptRanges['7-12'] },
          { range: '13-18', count: attemptRanges['13-18'] },
          { range: '19-24', count: attemptRanges['19-24'] },
          { range: '>25', count: attemptRanges['>25'] },
        ],
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
