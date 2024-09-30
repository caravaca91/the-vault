import { NextApiRequest, NextApiResponse } from 'next';
import mysql from 'mysql2/promise';
import 'dotenv/config';

const connectionConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: Number(process.env.MYSQL_PORT),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Get the current date in UTC
      const utcDate = new Date().toISOString().split('T')[0];

      const connection = await mysql.createConnection(connectionConfig);

      // Fetch Top 3 Longest Words Ever Found
      const [longestWordEver] = await connection.execute(`
        SELECT alias, longest_word
        FROM user_scores
        WHERE longest_word IS NOT NULL
        ORDER BY LENGTH(longest_word) DESC, created_at ASC
        LIMIT 3;
      `);

      // Fetch Top 3 Longest Words of the Day (UTC)
      const [longestWordToday] = await connection.execute(`
        SELECT alias, longest_word
        FROM user_scores
        WHERE DATE(created_at) = ?
        AND longest_word IS NOT NULL
        ORDER BY LENGTH(longest_word) DESC, created_at ASC
        LIMIT 3;
      `, [utcDate]);

      // Fetch Top 3 Highest Scores Ever
      const [highestScoreEver] = await connection.execute(`
        SELECT alias, max_score
        FROM user_scores
        ORDER BY max_score DESC, created_at ASC
        LIMIT 3;
      `);

      // Fetch Top 3 Highest Scores of the Day (UTC)
      const [highestScoreToday] = await connection.execute(`
        SELECT alias, max_score
        FROM user_scores
        WHERE DATE(created_at) = ?
        ORDER BY max_score DESC, created_at ASC
        LIMIT 3;
      `, [utcDate]);

      await connection.end();

      // Return the combined leaderboards
      res.status(200).json({
        longestWordEver,
        longestWordToday,
        highestScoreEver,
        highestScoreToday,
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Unable to fetch leaderboard' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
