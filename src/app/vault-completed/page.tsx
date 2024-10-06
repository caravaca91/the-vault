"use client";

import React, { useEffect, useState } from 'react';
import styles from './VaultCompleted.module.css';

const VaultCompleted: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    // Calculate time left until the next vault opens (UTC midnight)
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextMidnightUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const timeDifference = nextMidnightUTC.getTime() - now.getTime();
      setTimeLeft(timeDifference);
    };

    calculateTimeLeft(); // Initial calculation
    const timer = setInterval(calculateTimeLeft, 1000); // Update every second

    return () => clearInterval(timer);
  }, []);

  // Format time left in hours, minutes, and seconds
  const formatTimeLeft = (milliseconds: number) => {
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60);
    const seconds = Math.floor((milliseconds / 1000) % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <p className={styles.countdown}>
          The next vault will open in: {formatTimeLeft(timeLeft)}
        </p>
      </div>
    </div>
  );
};

export default VaultCompleted;
