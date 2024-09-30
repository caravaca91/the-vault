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
    const { alias, identifier } = req.query;

    // Validate the input parameters
    if (!alias || !identifier) {
      return res.status(400).json({ error: 'Alias and identifier are required' });
    }

    try {
      // Connect to the database
      const connection = await mysql.createConnection(connectionConfig);
      
      // Query to find a matching alias and unique identifier
      const [rows] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM user_scores WHERE alias = ? AND unique_identifier = ?',
        [alias, identifier]
      );

      await connection.end();

      // Check if a matching record was found
      if (rows.length > 0) {
        res.status(200).json({ exists: true });
      } else {
        res.status(200).json({ exists: false });
      }
    } catch (error) {
      console.error('Error verifying alias:', error);
      res.status(500).json({ error: 'Unable to verify alias' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
