import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Text } from 'recharts';
import styles from './AttemptDistributionGraph.module.css';

// Custom tooltip component to display data when hovering
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className={styles.customTooltip}>
        <p className={styles.label}>{`Attempts: ${label}`}</p>
        <p className={styles.intro}>{`Count: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const AttemptDistributionGraph: React.FC = () => {
  const [data, setData] = useState<Array<{ range: string; count: number }>>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Fetch the data from the API when the component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/vault-stats-summary'); // Replace with your actual API route
        const result = await response.json();
        setData(result.attemptDistribution); // Assumes the API returns 'attemptDistribution'
        console.log(result.attemptDistribution); // Check the data being fetched
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
  
    fetchData();
  }, []);

  // Replace 'any' with more specific typing
  const handleMouseEnter = (event: React.MouseEvent, index: number) => {
    setActiveIndex(index);
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className={styles.graphContainer}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 25,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3a3c" />
          <XAxis 
            dataKey="range" 
            tick={{ fill: '#d7dadc' }} 
            axisLine={{ stroke: '#3a3a3c' }}
            tickMargin={5}
          >
            <Text x={300} y={290} textAnchor="middle" fill="#d7dadc">
              # Attempts
            </Text>
          </XAxis>
          <YAxis 
            tick={{ fill: '#d7dadc' }} 
            axisLine={{ stroke: '#3a3a3c' }}
            tickMargin={5}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Bar 
            dataKey="count" 
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === activeIndex ? '#6aaa64' : '#538d4e'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AttemptDistributionGraph;
