import { NextApiRequest, NextApiResponse } from 'next';
import mysql, { RowDataPacket } from 'mysql2/promise';
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
    const { alias } = req.query;

    if (!alias || typeof alias !== 'string') {
      return res.status(400).json({ error: 'Alias is required and must be a string' });
    }

    try {
      // Connect to the database
      const connection = await mysql.createConnection(connectionConfig);

      // Check if the alias already exists
      const [results] = await connection.execute<RowDataPacket[]>(
        'SELECT 1 FROM user_scores WHERE alias = ? LIMIT 1',
        [alias]
      );

      await connection.end();

      if (results.length > 0) {
        res.status(200).json({ exists: true });
      } else {
        res.status(200).json({ exists: false });
      }
    } catch (error) {
      console.error('Error checking alias:', error);
      res.status(500).json({ error: 'Unable to check alias' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
