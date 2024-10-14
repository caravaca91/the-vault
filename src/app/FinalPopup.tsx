import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import styles from './finalPopup.module.css';

interface FinalPopupProps {
  onClose: () => void;
  finalTime: string;
  currentDay: number;
  attempts: number;
  solutionsFound?: { [key: number]: number }; // Make it optional
  isPracticeMode?: boolean;
  currentStreak?: number; // Add this
  maxStreak?: number; // Add this
}

const FinalPopup: React.FC<FinalPopupProps> = ({
  onClose,
  finalTime,
  currentDay,
  attempts,
  solutionsFound,
  isPracticeMode = false,
}) => {
  const [showCopiedAlert, setShowCopiedAlert] = useState(false);
  const shareUrl = 'https://vault899.com';

  const renderVaultResults = () => {
    if (!solutionsFound) {
      return []; // Return an empty array or a default value when solutionsFound is undefined
    }
  
    const resultRows = [
      { range: '1-6', min: 1, max: 6 },
      { range: '7-12', min: 7, max: 12 },
      { range: '13-18', min: 13, max: 18 },
      { range: '19-24', min: 19, max: 24 },
      { range: '>25', min: 25, max: Infinity },
    ];
  
    let allSolutionsFound = false; // Track if all solutions are found
  
    return resultRows.map((row) => {
      if (allSolutionsFound) return null; // Skip further rows once all solutions are found
  
      const squares = Array(5).fill('⬛').map((_, i) => {
        const solutionAttempt = solutionsFound[i];
        const isFound = solutionAttempt && solutionAttempt <= row.max;
  
        if (isFound) {
          return '🟩'; // Solution found in this range
        }
        return '⬛';
      }).join('');
  
      // Check if all solutions are found in this row
      allSolutionsFound = squares === '🟩🟩🟩🟩🟩'; // If all five solutions are found in this row
  
      return `Attempts ${row.range}: ${squares}`;
    }).filter(Boolean); // Filter out any null values after all solutions are found
  };
  

  const vaultResults = renderVaultResults();
  const shareMessage = `I have solved the Vault ${currentDay}/899 in ${finalTime} with ${attempts} attempts!\n\n${vaultResults.join('\n')}\n\nCan you solve it too? Play now at ${shareUrl} #Vault899`;
  const whatsappShareMessage = `I have solved the Vault ${currentDay}/899 in ${finalTime} with ${attempts} attempts!\n\nCan you solve it too? Play now at ${shareUrl} #Vault899`;

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`;
    window.open(twitterUrl, '_blank');
  };

  const handleShareWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappShareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(shareMessage).then(() => {
      setShowCopiedAlert(true);
      setTimeout(() => setShowCopiedAlert(false), 2000);
    });
  };

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

        <div className={styles.vaultResults}>
          {vaultResults.map((result, index) => (
            <p key={index}>{result}</p>
          ))}
        </div>

        {!isPracticeMode && (
          <div className={styles.shareSection}>
            <div className={styles.shareButtons}>
              <button className={`${styles.shareButton} ${styles.twitterButton}`} onClick={handleShareTwitter}>
                Share on X
              </button>
              <button className={`${styles.shareButton} ${styles.whatsappButton}`} onClick={handleShareWhatsApp}>
                Share on WhatsApp
              </button>
            </div>
            <button className={`${styles.shareButton} ${styles.clipboardButton}`} onClick={handleCopyToClipboard}>
              <Copy size={16} /> Copy to Clipboard
            </button>
          </div>
        )}

        {showCopiedAlert && (
          <div className={styles.alert}>
            Copied to clipboard!
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