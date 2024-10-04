import React from 'react';
import styles from './finalPopup.module.css'; // Import the CSS for styling the pop-up

interface FinalPopupProps {
  onClose: () => void;
  finalTime: string;
  currentDay: number; // Add current day as a prop to include in the share message
}

const FinalPopup: React.FC<FinalPopupProps> = ({ onClose, finalTime, currentDay }) => {
  const shareUrl = 'https://vault899.com'; // URL to share
  const shareMessage = `I have solved the Vault ${currentDay}/899 in ${finalTime}! Can you solve it too? Play now at ${shareUrl} #Vault899`;

  const handleShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <h1 className={styles.title}>Congratulations, Vault Master!</h1>
        <p className={styles.message}>
          {"You've unlocked today's secrets."}<br />
          <strong>The world is now a better place.</strong>
        </p>
        <p className={styles.finalTime}>Time taken: {finalTime}</p>
        <p className={styles.adFreeNote}>
          Game by <a href="https://buymeacoffee.com/marticabanes" target="_blank" rel="noopener noreferrer" className={styles.link}>MCC</a>.
        </p>

        {/* Share Button */}
        <button className={styles.closeButton} onClick={handleShare}>
          Share on X
        </button>

        <button className={styles.closeButton} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default FinalPopup;
