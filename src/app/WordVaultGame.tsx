"use client";

import React, { useState, useEffect, useCallback } from 'react';
import styles from './vault.module.css';
import FinalPopup from './FinalPopup'; // Import the FinalPopup component
import { useRouter } from 'next/navigation';


interface GridCell {
  char: string;
  selected: boolean;
  correct: boolean;
  unselectable: boolean;
}

interface VaultLetter {
  char: string;
  color: 'green' | 'yellow' | 'red' | 'black';
}

interface SelectedLetter {
  char: string;
  row: number;
  col: number;
}

const WordVaultGame: React.FC = () => {
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [selectedLetters, setSelectedLetters] = useState<SelectedLetter[]>([]);
  const [foundWords, setFoundWords] = useState<{ [key: number]: VaultLetter[][] }>({});
  const [validWords, setValidWords] = useState<Set<string>>(new Set());
  const [solutionChain, setSolutionChain] = useState<string[]>([]);
  const [time, setTime] = useState(0);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [showFinalPopup, setShowFinalPopup] = useState(false);
  const [finalTime, setFinalTime] = useState<string>('');
  const router = useRouter(); // Use Next.js router for navigation
  const [currentDay, setCurrentDay] = useState<number>(1);



  // Function to check if all words have been found
  const allWordsFound = () => {
    // Check if the length of foundWords matches the length of solutionChain
    for (const solutionWord of solutionChain) {
      const wordLength = solutionWord.length;

      // If a solution word of this length is not found, return false
      if (!foundWords[wordLength] || foundWords[wordLength].every(wordSet => wordSet.map(w => w.char).join('') !== solutionWord)) {
        return false;
      }
    }
    return true;
  };

  const [hasSubmittedCompletion, setHasSubmittedCompletion] = useState(false);

  useEffect(() => {
    // Trigger final pop-up when all solution words have been found
    if (solutionChain.length > 0 && allWordsFound() && !hasSubmittedCompletion) {
      setFinalTime(formatTime(time)); // Set the final time before showing the pop-up
      setShowFinalPopup(true); // Trigger the pop-up after setting final time
      
      // Submit the game completion data
      fetch('/api/vault-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          completionTime: formatTime(time),
          completionDate: new Date().toISOString().split('T')[0], // format as 'YYYY-MM-DD'
        }),
      })
      .then((response) => response.json())
      .then((data) => {
        console.log('Game completion saved:', data);
      })
      .catch((error) => {
        console.error('Error saving game completion:', error);
      });
  
      // Set submission flag to true
      setHasSubmittedCompletion(true);
    }
  }, [foundWords, solutionChain]);


// Load chain from CSV file
const loadChain = async (dayIndex: number): Promise<string[]> => {
  const response = await fetch('/word_chains410.csv');
  const text = await response.text();
  const lines = text.split('\n');
  const currentChain = lines[dayIndex]?.split(',').slice(1).map((word) => word.trim().toUpperCase());
  return currentChain || [];
};

// Load valid words from enable1.txt
const loadValidWords = async (): Promise<Set<string>> => {
  const response = await fetch('/enable1.txt');
  const text = await response.text();
  const words = text.split('\n').map((word) => word.trim().toUpperCase());
  return new Set(words);
};


useEffect(() => {
  const initializeGame = async () => {
    // Calculate the current day since the start date
    const startDate = new Date('2024-10-04'); // Set the start date of the game
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensure the current date is considered without any time component

    const dayDifference = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Use `dayDifference - 1` to load the correct CSV row (e.g., day 2 -> row index 1)
    const dayIndex = Math.min(Math.max(dayDifference, 0), 898);

    setCurrentDay(dayDifference); // Set the current day for display

    // Load the word chain and valid words
    const [loadedChain, loadedValidWords] = await Promise.all([loadChain(dayIndex), loadValidWords()]);
    setValidWords(loadedValidWords);
    setSolutionChain(loadedChain);

    if (loadedChain.length === 0) {
      console.error('Failed to load chain.');
      return;
    }

    // Extract letters from words of lengths 4 to 10
    let allLetters = '';
    for (let length = 4; length <= 10; length++) {
      const word = loadedChain.find((w) => w.length === length);
      if (word) {
        allLetters += word;
      }
    }

    if (allLetters.length < 49) {
      console.error('Not enough letters to fill the grid');
      return;
    }

    const shuffledLetters = allLetters.split('').sort(() => Math.random() - 0.5);
    const gridCells: GridCell[] = [];

    for (let i = 0; i < 49; i++) {
      gridCells.push({ char: shuffledLetters[i], selected: false, correct: false, unselectable: false });
    }

    const newGrid: GridCell[][] = [];
    for (let i = 0; i < 7; i++) {
      newGrid.push(gridCells.slice(i * 7, (i + 1) * 7)); // Create 7 rows with 7 cells each
    }

    setGrid(newGrid);
    setIsGameStarted(true);
  };

  initializeGame();
}, []);

  // Timer effect: Start/stop timer based on the game state
  useEffect(() => {
    if (isGameStarted && !showFinalPopup) {
      const timer = setInterval(() => setTime((prev) => prev + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isGameStarted, showFinalPopup]);

  const handleSelectLetter = (row: number, col: number) => {
    const cell = grid[row][col];
    if (cell.unselectable) return;

    const isSelected = selectedLetters.some((letter) => letter.row === row && letter.col === col);

    if (isSelected) {
      setSelectedLetters((prevSelected) =>
        prevSelected.filter((letter) => letter.row !== row || letter.col !== col)
      );
    } else {
      setSelectedLetters((prevSelected) => [...prevSelected, { char: cell.char, row, col }]);
    }

    setGrid((prevGrid) => {
      return prevGrid.map((r, rowIndex) =>
        r.map((cell, colIndex) => {
          if (rowIndex === row && colIndex === col) {
            return { ...cell, selected: !cell.selected };
          }
          return cell;
        })
      );
    });
  };

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (key === 'BACKSPACE' && selectedLetters.length > 0) {
        const lastSelected = selectedLetters[selectedLetters.length - 1]; // Get the last selected letter
  
        setSelectedLetters((prevSelected) => prevSelected.slice(0, -1)); // Remove the last selected letter
  
        setGrid((prevGrid) =>
          prevGrid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              if (
                rowIndex === lastSelected.row &&
                colIndex === lastSelected.col &&
                cell.selected &&
                !cell.correct
              ) {
                return { ...cell, selected: false }; // Deselect only the last selected cell
              }
              return cell;
            })
          )
        );
      } else if (/^[A-Z]$/.test(key)) {
        const foundCell = findGridCell(key);
        if (foundCell) {
          handleSelectLetter(foundCell.row, foundCell.col);
        }
      } else if (key === 'ENTER') {
        handleSubmitWord();
      }
    },
    [selectedLetters, grid]
  );
  

  const findGridCell = (char: string) => {
    for (let row = 0; row < grid.length; row++) {
      for (let col = 0; col < grid[row].length; col++) {
        const cell = grid[row][col];
        if (cell.char === char && !cell.unselectable && !cell.selected) {
          return { row, col };
        }
      }
    }
    return null;
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const handleSubmitWord = () => {
    const selectedWord = selectedLetters.map((l) => l.char).join('');
  
    if (selectedWord === '') {
      setGameMessage('No letters selected!');
      setTimeout(() => setGameMessage(null), 3000);
      setSelectedLetters([]);
      setGrid((prevGrid) =>
        prevGrid.map((row) =>
          row.map((cell) => ({ ...cell, selected: false }))
        )
      );
      return;
    }
  
    if (!validWords.has(selectedWord)) {
      setGameMessage(`The word "${selectedWord}" is not valid!`);
      setTimeout(() => setGameMessage(null), 3000);
  
      setSelectedLetters([]);
      setGrid((prevGrid) =>
        prevGrid.map((row) =>
          row.map((cell) => ({ ...cell, selected: false }))
        )
      );
      return;
    }
  
    const wordLength = selectedWord.length;
  
    // Check if a word of the same length is already in the vault
    if (foundWords[wordLength] && foundWords[wordLength].length > 0) {
      setGameMessage(`${wordLength} letter vault already full.`);
      setTimeout(() => setGameMessage(null), 3000);
      setSelectedLetters([]);
      setGrid((prevGrid) =>
        prevGrid.map((row) =>
          row.map((cell) => ({ ...cell, selected: false }))
        )
      );
      return;
    }
  
    const solutionWord = solutionChain.find((w) => w.length === wordLength);
  
    if (!solutionWord) {
      setGameMessage(`No solution word available for length ${wordLength}`);
      setTimeout(() => setGameMessage(null), 3000);
      setSelectedLetters([]);
      setGrid((prevGrid) =>
        prevGrid.map((row) =>
          row.map((cell) => ({ ...cell, selected: false }))
        )
      );
      return;
    }
  
    // Determine colors for each letter in the selected word
    const letterColors: VaultLetter[] = Array(wordLength).fill({ char: '', color: 'red' });
    const solutionCharCount: { [char: string]: number } = {};
  
    // Count occurrences of each character in the solution word
    solutionWord.split('').forEach((char) => {
      solutionCharCount[char] = (solutionCharCount[char] || 0) + 1;
    });
  
    // Mark green letters (correct position)
    selectedWord.split('').forEach((char, index) => {
      if (solutionWord[index] === char) {
        letterColors[index] = { char, color: 'green' };
        solutionCharCount[char] -= 1;
      }
    });
  
    // Mark yellow letters (correct letter, wrong position) and red letters (incorrect letter)
    selectedWord.split('').forEach((char, index) => {
      if (letterColors[index].color !== 'green') {
        if (solutionWord.includes(char) && solutionCharCount[char] > 0) {
          letterColors[index] = { char, color: 'yellow' };
          solutionCharCount[char] -= 1;
        } else {
          letterColors[index] = { char, color: 'red' };
        }
      }
    });
  
    // Update the found words to include the selected word in the vault
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
      if (!updatedFoundWords[wordLength]) {
        updatedFoundWords[wordLength] = [];
      }
      updatedFoundWords[wordLength].push(letterColors);
      return updatedFoundWords;
    });
  
    // Mark the letters in the grid as unselectable, and if it's a solution word, mark them as black
    setGrid((prevGrid) =>
      prevGrid.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          if (selectedLetters.some((letter) => letter.row === rowIndex && letter.col === colIndex)) {
            if (solutionWord === selectedWord) {
              // Mark letters for a solution word
              return {
                ...cell,
                unselectable: true, // Make the cell unselectable
                selected: false, // Deselect it
                char: '', // Remove the character visually to indicate it was used
                correct: true, // Ensure correct background color (black)
              };
            } else {
              // Mark letters for a valid word (not part of the solution)
              return {
                ...cell,
                unselectable: true, // Make the cell unselectable
                selected: false, // Deselect it
              };
            }
          }
          return cell;
        })
      )
    );
  
    // Determine if the word is part of the solution
    if (solutionWord === selectedWord) {
      setGameMessage('Solution word has been added to the vault.');
    } else {
      setGameMessage('Valid word but not part of the solution. Return.');
    }
  
    setSelectedLetters([]);
    setTimeout(() => setGameMessage(null), 3000);
  };
  
  
  
  

  const handleReturnLetter = (wordLength: number) => {
    const word = foundWords[wordLength];
    if (!word || word.length === 0) return;
  
    // Check if the word is part of the solution (color is black)
    if (word[0].every((letter) => letter.color === 'green')) {
      // Prevent returning a solution word
      setGameMessage('Solution words cannot be returned.');
      setTimeout(() => setGameMessage(null), 3000);
      return;
    }
  
    // Update the vault to remove the letters
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
      updatedFoundWords[wordLength] = [];
      return updatedFoundWords;
    });
  
    // Update the grid to make the letters selectable again and restore their state for valid words
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((cell) => {
          if (word[0]?.some((vaultLetter) => vaultLetter.char === cell.char)) {
            return {
              ...cell,
              unselectable: false, // Make it selectable again
              selected: false,
              char: cell.char,
            };
          }
          return cell;
        })
      )
    );
  
    setGameMessage('Letters have been returned.');
    setTimeout(() => setGameMessage(null), 3000);
  };
  

  const formatTime = (time: number) => {
    const hours = String(Math.floor(time / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((time % 3600) / 60)).padStart(2, '0');
    const seconds = String(time % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <div className={styles.gameMessage}>
          <div className={styles.gameMessageTitle}>System Log:</div>
          <div className={styles.gameMessageContent}>{gameMessage || ''}</div>
        </div>
  
        <div className={styles.selectedLetters}>
          <h3>
            Selected Letters: <br />
            <span className={styles.selectedLettersContent}>
              {selectedLetters.map((l) => l.char).join('')}
            </span>
            <span className={styles.blinkingCursor}>|</span>
          </h3>
        </div>
  
        <div
          className={styles.gridContainer}
          style={{ gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(7, 1fr)' }}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`${styles.gridCell} ${
                  cell.correct ? styles.correct : cell.unselectable ? styles.gray : ''
                } ${cell.selected ? styles.selected : ''}`}
                onClick={() => handleSelectLetter(rowIndex, colIndex)}
              >
                {cell.char}
              </div>
            ))
          )}
        </div>
  
        <div className={styles.buttonContainer}>
          <button className={styles.submitButton} onClick={handleSubmitWord}>
            Move word to the vault
          </button>
        </div>
      </div>
  
      <div className={styles.sidebar}>
      <div className={styles.vaultTitle}>{formatTime(time)}</div>
        <div className={styles.vaultTitle}>THE VAULT</div> {/* Vault Title */}
        {[...Array(7)].map((_, index) => {
          const word = foundWords[index + 4];
          const isSolutionWord =
            word && word.length > 0 && word[0].every((vaultLetter) => vaultLetter.color === 'green');
  
          return (
            <div key={index} className={styles.vaultSection}>
              <button
                className={`${styles.returnArrow} ${
                  word && word.length > 0 && !isSolutionWord ? styles.visible : ''
                }`}
                onClick={() => handleReturnLetter(index + 4)}
              >
                &larr;
              </button>
              <div
                className={styles.vaultGrid}
                style={{ gridTemplateColumns: `repeat(${index + 4}, 1fr)` }}
              >
                {Array(index + 4)
                  .fill('')
                  .map((_, letterIndex) => {
                    const letter = word && word[0] && word[0][letterIndex] ? word[0][letterIndex] : null;
                    return (
                      <div
                        key={letterIndex}
                        className={`${styles.vaultCell} ${letter ? styles[letter.color] : ''}`}
                      >
                        {letter?.char || ''}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
  
      {/* Show the final pop-up when all words are found */}
      {showFinalPopup && (
        <FinalPopup
          onClose={() => {
            setShowFinalPopup(false);
            router.push('/'); // Navigate back to the first page
          }}
          finalTime={finalTime}
          currentDay={currentDay} // Pass the current day to the FinalPopup
        />
      )}
    </div>
  );  
};

export default WordVaultGame;
