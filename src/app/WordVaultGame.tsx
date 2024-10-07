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
  const [foundWords, setFoundWords] = useState<{ [rowIndex: number]: VaultLetter[] | null }>({});
  const [validWords, setValidWords] = useState<Set<string>>(new Set());
  const [solutionChain, setSolutionChain] = useState<string[]>([]);
  const [time, setTime] = useState(0);
  const [attempts, setAttempts] = useState<number>(0); // New state for tracking attempts
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [showFinalPopup, setShowFinalPopup] = useState(false);
  const [finalTime, setFinalTime] = useState<string>('');
  const router = useRouter(); // Use Next.js router for navigation
  const [currentDay, setCurrentDay] = useState<number>(1);
  

  const hasValidWordsInVault = () => {
    return Object.values(foundWords).some(
      (word) => word && word.some((letter) => letter.color !== 'green')
    );
  };


  // Function to check if all words have been found
  const allWordsFound = useCallback(() => {
    return Object.keys(foundWords).length === 5 &&
      Object.values(foundWords).every(
        (word) => word && word.every((letter) => letter.color === 'green')
      );
  }, [foundWords]);


  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'
    const vaultCompleted = localStorage.getItem('vaultCompleted');
  
    // Trigger final pop-up and submit data only if the vault hasn't been completed today
    if (allWordsFound() && !showFinalPopup && vaultCompleted !== today) {
      setFinalTime(formatTime(time)); // Set the final time before showing the pop-up
      setShowFinalPopup(true); // Trigger the final popup
  
      // Store the completion status in local storage
      localStorage.setItem('vaultCompleted', today);
  
      // Check if the completion time is valid before posting to the database
      if (time > 0) {
        // Submit the game completion data
        fetch('/api/vault-stats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            completionTime: formatTime(time),
            completionDate: today,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            console.log('Game completion saved:', data);
          })
          .catch((error) => {
            console.error('Error saving game completion:', error);
          });
      }
    }
  }, [allWordsFound, showFinalPopup, time]);
  
  
  


// Load chain from CSV file
const loadChain = async (dayIndex: number): Promise<string[]> => {
  const response = await fetch('/word_chains_5x5.csv');
  const text = await response.text();
  const lines = text.split('\n').slice(1); // Skip the header row
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
    const startDate = new Date('2024-10-07'); // Set the start date of the game
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Ensure the current date is considered without any time component

    const dayDifference = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Use `dayDifference - 1` to load the correct CSV row (e.g., day 2 -> row index 1)
    const dayIndex = Math.min(Math.max(dayDifference, 0), 901);

    setCurrentDay(dayDifference); // Set the current day for display

    // Load the word chain and valid words
    const [loadedChain, loadedValidWords] = await Promise.all([loadChain(dayIndex), loadValidWords()]);
    setValidWords(loadedValidWords);
    setSolutionChain(loadedChain.slice(0, 5)); // Set the first 5 words for the solution chain

    if (loadedChain.length < 5) {
      console.error('Not enough words in the chain.');
      return;
    }

    // Initialize found words to null for each vault row (0-4)
    setFoundWords({
      0: null,
      1: null,
      2: null,
      3: null,
      4: null,
    });

    // Extract letters from the 5 solution words
    const allLetters = loadedChain.slice(0, 5).join('');

    if (allLetters.length < 25) {
      console.error('Not enough letters to fill the grid');
      return;
    }

    // Shuffle the letters to create the grid
    const shuffledLetters = allLetters.split('').sort(() => Math.random() - 0.5);
    const gridCells: GridCell[] = [];

    for (let i = 0; i < 25; i++) {
      gridCells.push({ char: shuffledLetters[i], selected: false, correct: false, unselectable: false });
    }

    // Create a 5x5 grid from the shuffled letters
    const newGrid: GridCell[][] = [];
    for (let i = 0; i < 5; i++) {
      newGrid.push(gridCells.slice(i * 5, (i + 1) * 5)); // Create 5 rows with 5 cells each
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
    setAttempts((prevAttempts) => prevAttempts + 1); // Increment attempt count
    const selectedWord = selectedLetters.map((l) => l.char).join('');

    // Check if the word length is exactly 5 letters
    if (selectedWord.length !== 5) {
      setGameMessage('Only 5-letter words are allowed!');
      resetSelection();
      return;
    }
  
    
    if (selectedWord === '') {
      setGameMessage('No letters selected!');
      resetSelection();
      return;
    }
  
    if (!validWords.has(selectedWord)) {
      setGameMessage(`The word "${selectedWord}" is not valid!`);
      resetSelection();
      return;
    }
  
    // Check if the word matches one of the solution words
    const wordIndex = solutionChain.indexOf(selectedWord);
    if (wordIndex !== -1 && foundWords[wordIndex]?.every((letter) => letter.color === 'green')) {
      setGameMessage('Word already found!');
      resetSelection();
      return;
    }
  
    // Prepare the word to be added to all vault rows, regardless of whether it's a solution or not
    const vaultEntries: { [key: number]: VaultLetter[] } = {};
  
    solutionChain.forEach((solutionWord, index) => {
      // Skip updating this row if it already contains a solution word
      if (foundWords[index] && foundWords[index].every((letter) => letter.color === 'green')) {
        vaultEntries[index] = foundWords[index]; // Keep the existing solution word
        return;
      }
  
      const letterColors: VaultLetter[] = Array(5).fill({ char: '', color: 'red' });
      const solutionCharCount: { [char: string]: number } = {};
  
      // Count occurrences of each character in the solution word
      solutionWord.split('').forEach((char) => {
        solutionCharCount[char] = (solutionCharCount[char] || 0) + 1;
      });
  
      // Mark green letters (correct position)
      selectedWord.split('').forEach((char, i) => {
        if (solutionWord[i] === char) {
          letterColors[i] = { char, color: 'green' };
          solutionCharCount[char] -= 1; // Reduce count for correctly placed letter
        }
      });
  
      // Mark yellow letters (correct letter, wrong position) and red letters (incorrect letter)
      selectedWord.split('').forEach((char, i) => {
        if (letterColors[i].color !== 'green') {
          // Only mark as yellow if there are still occurrences left in the solution
          if (solutionWord.includes(char) && solutionCharCount[char] > 0) {
            letterColors[i] = { char, color: 'yellow' };
            solutionCharCount[char] -= 1; // Reduce count for correctly guessed but misplaced letter
          } else {
            letterColors[i] = { char, color: 'red' };
          }
        }
      });
  
      vaultEntries[index] = letterColors;
    });
  
    // Update foundWords for each row with the colored valid word, without overriding solutions
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
  
      Object.keys(vaultEntries).forEach((rowIndex) => {
        const rowIdx = parseInt(rowIndex);
        if (!updatedFoundWords[rowIdx] || updatedFoundWords[rowIdx].some((letter) => letter.color !== 'green')) {
          updatedFoundWords[rowIdx] = vaultEntries[rowIdx]; // Add or replace the entry only if it's not a solution word
        }
      });
  
      return updatedFoundWords;
    });
  
    // Update the grid to mark the letters as unselectable if they were part of a solution word
    if (wordIndex !== -1) {
      setGrid((prevGrid) =>
        prevGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            if (selectedLetters.some((letter) => letter.row === rowIndex && letter.col === colIndex)) {
              return {
                ...cell,
                unselectable: true,
                selected: false,
                char: '', // Clear the character to visually indicate it's used
                correct: true, // Mark as correct (black out the cell)
              };
            }
            return cell;
          })
        )
      );
  
      setGameMessage('Solution word has been added to the vault.');
    } else {
      setGameMessage('Valid word added to the vault and colored.');
    }
  
    resetSelection();
  
    // Use a callback to ensure state update before checking if all words are found
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
  
      Object.keys(vaultEntries).forEach((rowIndex) => {
        const rowIdx = parseInt(rowIndex);
        if (!updatedFoundWords[rowIdx] || updatedFoundWords[rowIdx].some((letter) => letter.color !== 'green')) {
          updatedFoundWords[rowIdx] = vaultEntries[rowIdx]; // Add or replace the entry only if it's not a solution word
        }
      });
  
      if (
        Object.keys(updatedFoundWords).length === 5 &&
        Object.values(updatedFoundWords).every((word) => word && word.every((letter) => letter.color === 'green'))
      ) {
        setFinalTime(formatTime(time)); // Set the final time before showing the pop-up
        setShowFinalPopup(true); // Trigger the final popup
      }
  
      return updatedFoundWords;
    });
  };
  
  
  // Helper function to reset the selection state and grid
  const resetSelection = () => {
    setSelectedLetters([]);
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((cell) => ({ ...cell, selected: false }))
      )
    );
    setTimeout(() => setGameMessage(null), 3000);
  };
  
  
  const handleReturnValidWords = () => {
    // Update the foundWords state to remove all valid words but keep solution words
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
  
      Object.keys(updatedFoundWords).forEach((rowIndex) => {
        const word = updatedFoundWords[parseInt(rowIndex)];
        if (word && word.some((letter) => letter.color !== 'green')) {
          updatedFoundWords[parseInt(rowIndex)] = null; // Remove the valid word
        }
      });
  
      return updatedFoundWords;
    });
  
    // Update the grid to make the letters selectable again for the removed words
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((cell) => {
          if (cell.unselectable && !cell.correct) {
            // Make the cell selectable again if it was part of a removed valid word
            return {
              ...cell,
              unselectable: false,
              selected: false,
            };
          }
          return cell;
        })
      )
    );
  
    setGameMessage('All valid words have been returned.');
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
        {/* Alignment Container for System Log, Selected Letters, and Grid/Button */}
        <div className={styles.alignmentContainer}>
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
  
          <div className={styles.gridAndButtonContainer}>
            <div
              className={styles.gridContainer}
              style={{
                gridTemplateColumns: 'repeat(5, 1fr)',
                gridTemplateRows: 'repeat(5, 1fr)',
              }}
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
  
            <button className={styles.submitButton} onClick={handleSubmitWord}>
              Submit Word
            </button>
          </div>
        </div>
      </div>

      <div className={styles.sidebar}>
      <div className={styles.attemptsCount}>Attempts: {attempts}</div> {/* Display attempts count */}
  <div className={styles.vaultTitle}>{formatTime(time)}</div>
  <div className={styles.vaultTitle}>THE VAULT</div> {/* Added the vault title */}
  {[...Array(5)].map((_, rowIndex) => {
    const word = foundWords[rowIndex]; // Get the word for the current vault row

    return (
      <div key={rowIndex} className={styles.vaultSection}>
        <div className={styles.vaultGrid} style={{ gridTemplateColumns: `repeat(5, 1fr)` }}>
          {Array(5)
            .fill('')
            .map((_, letterIndex) => {
              const letter = word ? word[letterIndex] : null;
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
    <div className={styles.buttonContainer}>
    <button
      className={styles.returnButton}
      onClick={handleReturnValidWords}
      disabled={!hasValidWordsInVault()}
    >
      Return Word
    </button>
  </div>
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
          attempts={attempts} // Pass the attempts to FinalPopup
        />
      )}
    </div>
  );  
};

export default WordVaultGame;
