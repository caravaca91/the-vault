import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import 'dotenv/config';


// Generate a 6-character unique identifier
function generateUniqueIdentifier() {
  return crypto.randomBytes(3).toString('hex');
}

const connectionConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  port: Number(process.env.MYSQL_PORT),
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { alias, max_score = 0, longest_word = '' } = req.body;

    if (!alias || typeof alias !== 'string') {
      return res.status(400).json({ error: 'Alias is required and must be a string' });
    }

    try {
      // Connect to the database
      const connection = await mysql.createConnection(connectionConfig);

      // Check if alias already exists
      const [existingAlias] = await connection.execute(
        'SELECT alias FROM user_scores WHERE alias = ?',
        [alias]
      );

      if (Array.isArray(existingAlias) && existingAlias.length > 0) {
        // Alias is already taken
        await connection.end();
        return res.status(400).json({ error: 'Alias is already taken' });
      }

      // Generate a unique identifier for the user
      const uniqueIdentifier = generateUniqueIdentifier();

      // Insert alias, identifier, max_score, and longest_word into the database
      const query = `
        INSERT INTO user_scores (alias, unique_identifier, max_score, longest_word)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          max_score = VALUES(max_score),
          longest_word = VALUES(longest_word);
      `;
      const values = [alias, uniqueIdentifier, max_score, longest_word];

      await connection.execute(query, values);
      await connection.end();

      // Respond with the unique identifier
      res.status(200).json({ uniqueIdentifier });
    } catch (error) {
      console.error('Error saving alias:', error);
      res.status(500).json({ error: 'Unable to save alias' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
