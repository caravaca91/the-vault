"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './landing.module.css'; // Import the landing page CSS
import AttemptDistributionGraph from './AttemptDistributionGraph';


interface Stats {
  todayCount: number;
  averageTime: number; // Average time in seconds
  fastestTime: string; // Formatted as HH:MM:SS
  leastAttempts: number; // Add this to the type
  recordDay: string;
  recordCount: number;
}

const LandingPage: React.FC = () => {
  const router = useRouter();
  const [currentDay, setCurrentDay] = useState<number>(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>(''); // State to store time remaining until next vault


  const [hasSolvedToday, setHasSolvedToday] = useState<boolean>(false);

  const calculateDayDifference = (): number => {
    const startDate = new Date('2024-10-07');
    startDate.setHours(0, 0, 0, 0);  // Set to start of day in local time
    const today = new Date();
    today.setHours(0, 0, 0, 0);  // Set to start of day in local time
    return Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const formatAverageTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.round(timeInSeconds % 60); // Round the seconds to nearest whole number
    return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  const handlePracticeMode = () => {
    router.push('/practice');
  };

  const calculateTimeRemaining = () => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeDiff = nextMidnight.getTime() - now.getTime();
  
    const hours = String(Math.floor((timeDiff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
    const minutes = String(Math.floor((timeDiff / (1000 * 60)) % 60)).padStart(2, '0');
    const seconds = String(Math.floor((timeDiff / 1000) % 60)).padStart(2, '0');
  
    return `${hours}:${minutes}:${seconds}`;
  };

  const getLocalDate = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);  // Set the time to midnight in the local time zone
    return now.toISOString().split('T')[0];  // Convert to ISO string and extract the date part
  };

  const formatDateToLocal = (dateString: string) => {
    const date = new Date(dateString);  // Interpret the UTC date as local time
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  useEffect(() => {
    const checkSolveStatus = () => {
      const lastSolvedDate = localStorage.getItem('lastSolvedDate');
      const today = getLocalDate();  // Get the local date
      setHasSolvedToday(lastSolvedDate === today);
    };
  
    checkSolveStatus();
  }, []);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkSolveStatus = () => {
        const lastSolvedDate = localStorage.getItem('lastSolvedDate');
        const today = getLocalDate();
        setHasSolvedToday(lastSolvedDate === today);
      };
      checkSolveStatus();
    }
  }, []);

  useEffect(() => {
    const dayDifference = calculateDayDifference();

    // Ensure the day is within the range 1 to 899
    if (dayDifference >= 1 && dayDifference <= 899) {
      setCurrentDay(dayDifference);
    }

    // Fetch the stats from the API with a fake delay
    const fetchStats = async () => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const response = await fetch('/api/vault-stats-summary');
        if (response.ok) {
          const data = await response.json();
          setStats({
            ...data,
            averageTime: formatAverageTime(data.averageTime),
            recordDay: formatDateToLocal(data.recordDay),  // Use local date formatting
          });
        }
      } catch (error) {
        console.error('Failed to fetch game stats:', error);
      }
    };
    
    fetchStats();

    // Update the timer every second
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    // Clear interval on component unmount
    return () => clearInterval(timer);
  }, []);

const handleStartGame = () => {
  if (!hasSolvedToday) {
    router.push('/game');
  } else {
    // Optionally, you can show an alert or some other notification
    alert("You've already opened today's Vault. Come back tomorrow for a new one!");
  }
};

return (
  <div className={styles.container}>
    <div className={styles.mainContent}>
      <h1 className={styles.title}>Vault 899</h1>

      <div className={styles.statsBox}>
        {stats ? (
          <>
          <p>
          Today, <strong>{stats.todayCount}</strong> {stats.todayCount === 1 ? 'person has' : 'people have'} opened the Vault.<br />
          {stats.todayCount > 0 && (
            <>
              The fastest did it in <strong>{stats.fastestTime}</strong>.<br />
              The least number of attempts was <strong>{stats.leastAttempts}</strong>.<br /> {/* Display least attempts */}
            </>
          )}
          The record number of Vault openings in a day was <strong>{stats.recordCount}</strong> on <strong>{stats.recordDay}</strong>.
        </p>

            <div className={styles.graphContainer}>
              <h3 className={styles.graphTitle}>Attempt Distribution</h3>
              <AttemptDistributionGraph />
            </div>
          </>
        ) : (
          <p>Loading stats...</p>
        )}
      </div>

      <button
        className={styles.startButton}
        onClick={handleStartGame}
        disabled={hasSolvedToday}
      >
        {hasSolvedToday ? "Vault already opened today!" : "Start Game"}
      </button>
      
      <button
        className={`${styles.startButton} ${styles.practiceButton}`}
        onClick={handlePracticeMode}
      >
        Practice Mode
      </button>

      <div className={styles.instructionsBox}>
        <h2 className={styles.subtitle}>How to Play:</h2>
        <ul className={styles.instructionList}>
          <li>Find <strong>5 unique words</strong> <strong>of 5 letters</strong> using <strong>exactly</strong> all the letters from the grid and moving them into <strong>the Vault. </strong>
           The game will run for <strong>899 days</strong>. Every day a new unique solution is computationally generated.</li>
          <li>This is <strong>Day {currentDay} of 899</strong>.</li>
          <li>The next vault opens in: <strong>{timeRemaining}</strong>.</li>
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
          <li>Input words using the keyboard and pressing <strong>Enter</strong>, or by selecting with the cursor and clicking <strong>Submit Word</strong>. In your phone, only the second option is available. </li>
          <li>Move words back to the grid by clicking on <strong>Return Word</strong> below them. Solution words <strong>automatically stay</strong> in the vault. The <strong>time capsule</strong> allows you to check the hints of previous valid words.</li>
          <li>{'The timer starts when you click "Start Game". You have unlimited attempts, but we count them. Solve the puzzle in the '}<strong>fewest attempts and shortest time possible</strong>.</li>
        </ul>
        <p className={styles.instructionsText}>Are you ready?</p>
      </div>
    </div>
  </div>
);
};

export default LandingPage;

