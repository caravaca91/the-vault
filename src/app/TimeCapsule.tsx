// TimeCapsule.tsx
import React, { useState } from 'react';
import styles from './timeCapsule.module.css';

interface GuessedWord {
    word: string;
    // Add any other properties if necessary
  }
interface TimeCapsuleProps {
  guessedWords: GuessedWord[];
  currentIndex: number | null;
  onSelectGuess: (index: number) => void;
  onReturnToCurrent: () => void;
}

const TimeCapsule: React.FC<TimeCapsuleProps> = ({ 
    guessedWords, 
    currentIndex, 
    onSelectGuess
  }) => {
    const [offset, setOffset] = useState(0);
  
    const handlePrevious = () => {
      setOffset(prev => Math.min(prev + 1, guessedWords.length - 5));
    };
  
    const handleNext = () => {
      setOffset(prev => Math.max(prev - 1, 0));
    };
  
    const visibleWords = guessedWords.slice(-5 - offset, guessedWords.length - offset).reverse();
  
    return (
      <div className={styles.timeCapsule}>
        <h3 className={styles.title}>Time Capsule</h3>
        <div className={styles.scrollContainer}>
          {[...Array(5)].map((_, index) => {
            const guess = visibleWords[index];
            const guessIndex = guessedWords.length - 1 - index - offset;
            return (
              <div 
                key={guessIndex}
                className={`${styles.guessEntry} ${guessIndex === currentIndex ? styles.selected : ''}`}
                onClick={() => guess && onSelectGuess(guessIndex)}
              >
                {guess ? guess.word : '\u00A0'}
              </div>
            );
          })}
        </div>
        <div className={styles.navigation}>
          <button 
            className={styles.navButton} 
            onClick={handlePrevious} 
            disabled={offset >= guessedWords.length - 5}
          >
            &#8592; Previous
          </button>
          <button 
            className={styles.navButton} 
            onClick={handleNext} 
            disabled={offset === 0}
          >
            Next &#8594;
          </button>
        </div>
      </div>
    );
  };

export default TimeCapsule;