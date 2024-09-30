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
  if (req.method === 'POST') {
    const { alias, max_score, longest_word } = req.body;

    if (!alias || typeof alias !== 'string') {
      return res.status(400).json({ error: 'Alias is required and must be a string' });
    }

    try {
      // Generate current timestamp in UTC
      const timestamp = new Date().toISOString();

      // Connect to the database
      const connection = await mysql.createConnection(connectionConfig);

      // Update the user scores table with the new score, longest word, and created_at timestamp
      const query = `
        INSERT INTO user_scores (alias, max_score, longest_word, created_at)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          max_score = GREATEST(max_score, VALUES(max_score)),
          longest_word = CASE
            WHEN LENGTH(VALUES(longest_word)) > LENGTH(longest_word) THEN VALUES(longest_word)
            ELSE longest_word
          END,
          created_at = VALUES(created_at);
      `;
      const values = [alias, max_score, longest_word, timestamp];

      await connection.execute(query, values);
      await connection.end();

      // Respond with success
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving score:', error);
      res.status(500).json({ error: 'Unable to save score' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
