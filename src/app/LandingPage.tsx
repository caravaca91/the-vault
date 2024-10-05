"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css'; // Import the landing page CSS

interface Stats {
  todayCount: number;
  averageTime: number; // Average time in seconds
  fastestTime: string; // Formatted as HH:MM:SS
  recordDay: string;
  recordCount: number;
}

const LandingPage: React.FC = () => {
  const router = useRouter();
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [stats, setStats] = useState<Stats | null>(null);

  const calculateDayDifference = (): number => {
    const startDate = new Date('2024-10-04');
    const today = new Date();
    return Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatAverageTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.round(timeInSeconds % 60); // Round the seconds to nearest whole number
    return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  useEffect(() => {
    const dayDifference = calculateDayDifference();

    // Ensure the day is within the range 1 to 899
    if (dayDifference >= 1 && dayDifference <= 899) {
      setCurrentDay(dayDifference);
    }

    // Fetch the stats from the API
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/vault-stats-summary');
        if (response.ok) {
          const data = await response.json();
          setStats({
            ...data,
            averageTime: formatAverageTime(data.averageTime),
            recordDay: formatDate(data.recordDay),
          });
        }
      } catch (error) {
        console.error('Failed to fetch game stats:', error);
      }
    };

    fetchStats();
  }, []);

  const handleStartGame = () => {
    router.push('/game'); // Navigate to the game page
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <h1 className={styles.title}>Vault 899</h1>

        {stats && (
          <div className={styles.statsBox}>
            <h2 className={styles.subtitle}>Stats:</h2>
            <p>
              Today, <strong>{stats.todayCount}</strong> people have opened the Vault.<br />
              The fastest, did it in <strong>{stats.fastestTime}</strong>.<br />
              The record number of Vault openings in a day was <strong>{stats.recordCount}</strong> on <strong>{stats.recordDay}</strong>.
            </p>
          </div>
        )}

        <button className={styles.startButton} onClick={handleStartGame}>
          Start Game
        </button>

        <div className={styles.instructionsBox}>
          <h2 className={styles.subtitle}>How to Play:</h2>
          <ul className={styles.instructionList}>
            <li>Find <strong>7 unique words</strong> between <strong>4 to 10</strong> letters using <strong>exactly</strong> all the letters from the grid.</li>
            <li>The game will run for <strong>899 days</strong>. Every day a new unique solution is computationally generated.</li>
            <li>This is <strong>Day {currentDay} of 899</strong>.</li>
            <li>Words can be:
              <ul>
                <li><strong>Valid Words</strong>: Existing words in English. Letters are colored for hints:
                  <ul>
                    <li><strong style={{ color: 'green' }}>Green</strong>: Correct letter and position.</li>
                    <li><strong style={{ color: 'yellow' }}>Yellow</strong>: Correct letter, wrong position.</li>
                    <li><strong style={{ color: 'red' }}>Red</strong>: Not part of the solution.</li>
                  </ul>
                </li>
                <li><strong>Solution Words</strong>: Unique words that complete the puzzle. Letters disappear from the grid when found.</li>
              </ul>
            </li>
            <li>Move words back to the grid by clicking the <strong>arrow</strong> next to them. Solution words stay in the vault.</li>
            <li>Input words using the keyboard and pressing <strong>Enter</strong>, or by selecting with the cursor and clicking <strong>Move word to the vault</strong>. In your phone, only the second option is available. </li>
            <li>{'The timer starts when you click "Start Game". Solve the puzzle in the '}<strong>least time possible</strong>.</li>
            </ul>
          <p className={styles.instructionsText}>Are you ready?</p>

          <p className={styles.adFreeNote}>
          Game by <a href="https://buymeacoffee.com/marticabanes" target="_blank" rel="noopener noreferrer" className={styles.link}>MCC</a>
        </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
