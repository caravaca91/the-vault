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
    const { alias, code } = req.query;

    if (!alias || typeof alias !== 'string' || !code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Alias and code are required and must be strings' });
    }

    try {
      const connection = await mysql.createConnection(connectionConfig);

      // Check if the alias and code match
      const [results] = await connection.execute<RowDataPacket[]>(
        'SELECT * FROM user_scores WHERE alias = ? AND unique_identifier = ?',
        [alias, code]
      );

      await connection.end();

      if (results.length > 0) {
        res.status(200).json({ exists: true, user: results[0] });
      } else {
        res.status(200).json({ exists: false });
      }
    } catch (error) {
      console.error('Error checking user:', error);
      res.status(500).json({ error: 'Unable to check user' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
