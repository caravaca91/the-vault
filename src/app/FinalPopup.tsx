import styles from './finalPopup.module.css';
import React, { useEffect } from 'react';

interface FinalPopupProps {
  onClose: () => void;
  finalTime: string;
  currentDay: number;
  attempts: number;
  currentStreak: number;
  maxStreak: number;
  isPracticeMode?: boolean;
}

const FinalPopup: React.FC<FinalPopupProps> = ({
  onClose,
  finalTime,
  currentDay,
  attempts,
  isPracticeMode = false
}) => {
  const shareUrl = 'https://vault899.com';
  const shareMessage = `I have solved the Vault ${currentDay}/899 in ${finalTime} with ${attempts} attempts! Can you solve it too? Play now at ${shareUrl} #Vault899`;

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Function to get today's local date in YYYY-MM-DD format
  const getLocalDate = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set time to midnight in local time
    return now.toISOString().split('T')[0]; // Return YYYY-MM-DD
  };

  // Update localStorage when the popup is shown
  useEffect(() => {
    if (!isPracticeMode) {
      const today = getLocalDate();
      localStorage.setItem('lastSolvedDate', today); // Save today's date in localStorage
    }
  }, [isPracticeMode]);

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <h1 className={styles.title}>
          {isPracticeMode ? "Great Practice, Vault Master!" : "Congratulations, Vault Master!"}
        </h1>
        <p className={styles.message}>
          {isPracticeMode ? "You've mastered this practice round." : "You've unlocked today's secrets."}<br />
          <strong>{isPracticeMode ? "Keep honing your skills!" : "The world is now a better place."}</strong>
        </p>
        <p className={styles.finalTime}>Time taken: {finalTime}</p>
        <p className={styles.finalTime}>Attempts: <strong>{attempts}</strong></p>

        {!isPracticeMode && (
          <div className={styles.shareButtons}>
            <button className={`${styles.shareButton} ${styles.twitterButton}`} onClick={handleShareTwitter}>
              Share on X
            </button>
            <button className={`${styles.shareButton} ${styles.whatsappButton}`} onClick={handleShareWhatsApp}>
              Share on WhatsApp
            </button>
          </div>
        )}

        <button className={styles.closeButton} onClick={onClose}>
          {isPracticeMode ? "Play Again" : "Close"}
        </button>
      </div>
    </div>
  );
};

export default FinalPopup;