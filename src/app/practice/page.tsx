"use client";

import React, { useState, useEffect, useCallback } from 'react';
import styles from '../vault.module.css';  // Adjust this path as necessary
import FinalPopup from '../FinalPopup';
import TimeCapsule from '../TimeCapsule';
import seedrandom from 'seedrandom';


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

interface GuessedWord {
  word: string;
  hints: VaultLetter[][];
}

const PracticeMode: React.FC = () => {
  const [grid, setGrid] = useState<GridCell[][]>([]);
  const [selectedLetters, setSelectedLetters] = useState<SelectedLetter[]>([]);
  const [foundWords, setFoundWords] = useState<{ [rowIndex: number]: VaultLetter[] | null }>({});
  const [validWords, setValidWords] = useState<Set<string>>(new Set());
  const [solutionChain, setSolutionChain] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<number>(0);
  const [gameMessage, setGameMessage] = useState<string | null>(null);
  const [showFinalPopup, setShowFinalPopup] = useState(false);
  const [guessedWords, setGuessedWords] = useState<GuessedWord[]>([]);
  const [currentGuessIndex, setCurrentGuessIndex] = useState<number | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);

  const loadValidWords = async (): Promise<Set<string>> => {
    const response = await fetch('/enable1.txt');
    const text = await response.text();
    const words = text.split('\n').map((word) => word.trim().toUpperCase());
    return new Set(words);
  };

  const loadChain = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch('/valid_words.txt');
      const text = await response.text();
      const words = text.trim().split('\n').map(word => word.trim().toUpperCase());
  
      // Use current timestamp to seed the random number generator
      const rng = seedrandom(Date.now().toString());
  
      // Shuffle the words array using Fisher-Yates algorithm
      for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
      }
  
      // Log the selected words for debugging purposes
      const selectedWords = words.slice(0, 5); // Select 5 random words
  
      return selectedWords;
    } catch (error) {
      console.error('Error loading words:', error);
      return [];
    }
  }, []);
  

  const initializeGame = useCallback(async () => {
    const [loadedChain, loadedValidWords] = await Promise.all([loadChain(), loadValidWords()]);
    setValidWords(loadedValidWords);
    setSolutionChain(loadedChain);
    setGameCompleted(false);
    setGuessedWords([]);
    setCurrentGuessIndex(null);

    setFoundWords({
      0: null,
      1: null,
      2: null,
      3: null,
      4: null,
    });

    const allLetters = loadedChain.join('');
    const shuffledLetters = allLetters.split('').sort(() => Math.random() - 0.5);
    const gridCells: GridCell[] = shuffledLetters.map(char => ({ 
      char, 
      selected: false, 
      correct: false, 
      unselectable: false 
    }));

    const newGrid: GridCell[][] = [];
    for (let i = 0; i < 5; i++) {
      newGrid.push(gridCells.slice(i * 5, (i + 1) * 5));
    }

    setGrid(newGrid);
    setAttempts(0);
    setShowFinalPopup(false);
  }, [loadChain]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

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
        const lastSelected = selectedLetters[selectedLetters.length - 1];
  
        setSelectedLetters((prevSelected) => prevSelected.slice(0, -1));
  
        setGrid((prevGrid) =>
          prevGrid.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              if (
                rowIndex === lastSelected.row &&
                colIndex === lastSelected.col &&
                cell.selected &&
                !cell.correct
              ) {
                return { ...cell, selected: false };
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
    setAttempts((prevAttempts) => prevAttempts + 1);
    const selectedWord = selectedLetters.map((l) => l.char).join('');
  
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
  
    const vaultEntries: { [key: number]: VaultLetter[] } = {};
  
    solutionChain.forEach((solutionWord, index) => {
      if (foundWords[index] && foundWords[index].every((letter) => letter.color === 'green')) {
        vaultEntries[index] = foundWords[index];
        return;
      }
  
      const letterColors: VaultLetter[] = Array(5).fill({ char: '', color: 'red' });
      const solutionCharCount: { [char: string]: number } = {};
  
      solutionWord.split('').forEach((char) => {
        solutionCharCount[char] = (solutionCharCount[char] || 0) + 1;
      });
  
      selectedWord.split('').forEach((char, i) => {
        if (solutionWord[i] === char) {
          letterColors[i] = { char, color: 'green' };
          solutionCharCount[char] -= 1;
        }
      });
  
      selectedWord.split('').forEach((char, i) => {
        if (letterColors[i].color !== 'green') {
          if (solutionWord.includes(char) && solutionCharCount[char] > 0) {
            letterColors[i] = { char, color: 'yellow' };
            solutionCharCount[char] -= 1;
          } else {
            letterColors[i] = { char, color: 'red' };
          }
        }
      });
  
      vaultEntries[index] = letterColors;
    });
  
    const newGuessedWord: GuessedWord = {
      word: selectedWord,
      hints: Object.values(vaultEntries)
    };
    setGuessedWords(prev => [...prev, newGuessedWord]);
    setCurrentGuessIndex(guessedWords.length);
  
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
  
      Object.keys(vaultEntries).forEach((rowIndex) => {
        const rowIdx = parseInt(rowIndex);
        if (!updatedFoundWords[rowIdx] || updatedFoundWords[rowIdx].some((letter) => letter.color !== 'green')) {
          updatedFoundWords[rowIdx] = vaultEntries[rowIdx];
        }
      });
  
      return updatedFoundWords;
    });
  
    const wordIndex = solutionChain.indexOf(selectedWord);
    if (wordIndex !== -1) {
      setGrid((prevGrid) =>
        prevGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            if (selectedLetters.some((letter) => letter.row === rowIndex && letter.col === colIndex)) {
              return {
                ...cell,
                unselectable: true,
                selected: false,
                char: '',
                correct: true,
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
  
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
  
      Object.keys(vaultEntries).forEach((rowIndex) => {
        const rowIdx = parseInt(rowIndex);
        if (!updatedFoundWords[rowIdx] || updatedFoundWords[rowIdx].some((letter) => letter.color !== 'green')) {
          updatedFoundWords[rowIdx] = vaultEntries[rowIdx];
        }
      });
  
      if (
        Object.keys(updatedFoundWords).length === 5 &&
        Object.values(updatedFoundWords).every((word) => word && word.every((letter) => letter.color === 'green'))
      ) {
        setGameCompleted(true);
      }
  
      return updatedFoundWords;
    });
  };

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
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
  
      Object.keys(updatedFoundWords).forEach((rowIndex) => {
        const word = updatedFoundWords[parseInt(rowIndex)];
        if (word && word.some((letter) => letter.color !== 'green')) {
          updatedFoundWords[parseInt(rowIndex)] = null;
        }
      });
  
      return updatedFoundWords;
    });
  
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((cell) => {
          if (cell.unselectable && !cell.correct) {
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

  const handlePlayAgain = () => {
    initializeGame();
  };

  const hasValidWordsInVault = () => {
    return Object.values(foundWords).some(
      (word) => word && word.some((letter) => letter.color !== 'green')
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.timeCapsuleContainer}>
      <TimeCapsule 
  guessedWords={guessedWords}
  currentIndex={currentGuessIndex}
  onSelectGuess={(index) => {
    setCurrentGuessIndex(index);
    const selectedGuess = guessedWords[index];
    setFoundWords((prevFoundWords) => {
      const updatedFoundWords = { ...prevFoundWords };
      
      selectedGuess.hints.forEach((hint, i) => {
        // Ensure the solution (green word) is not overwritten
        if (!updatedFoundWords[i] || !updatedFoundWords[i].every(letter => letter.color === 'green')) {
          updatedFoundWords[i] = hint;
        }
      });
      
      return updatedFoundWords;
    });
  }}
  onReturnToCurrent={() => {
    setCurrentGuessIndex(null);
    if (guessedWords.length > 0) {
      const latestGuess = guessedWords[guessedWords.length - 1];
      setFoundWords((prevFoundWords) => {
        const updatedFoundWords = { ...prevFoundWords };
        
        latestGuess.hints.forEach((hint, i) => {
          // Ensure the solution (green word) is not overwritten
          if (!updatedFoundWords[i] || !updatedFoundWords[i].every(letter => letter.color === 'green')) {
            updatedFoundWords[i] = hint;
          }
        });
        
        return updatedFoundWords;
      });
    }
  }}
/>

      </div>
      <div className={styles.mainContent}>
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
        <div className={styles.attemptsCount}>Attempts: {attempts}</div>
        <div className={styles.vaultTitle}>THE VAULT</div>
        {[...Array(5)].map((_, rowIndex) => {
          const word = foundWords[rowIndex];

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
  
      {showFinalPopup && (
        <FinalPopup
          onClose={() => {
            setShowFinalPopup(false);
            handlePlayAgain();
          }}
          finalTime="" // Pass an empty string for time in practice mode
          currentDay={0} // Use 0 for practice mode
          attempts={attempts}
          currentStreak={0} // Streaks don't apply in practice mode
          maxStreak={0}
          isPracticeMode={true}
        />
      )}

{gameCompleted && (
        <FinalPopup
        onClose={handlePlayAgain}
          finalTime="" // Pass an empty string for time in practice mode
          currentDay={0}
          attempts={attempts}
          currentStreak={0}
          maxStreak={0}
          isPracticeMode={true}
        />
      )}

      {gameCompleted && (
        <button className={styles.playAgainButton} onClick={handlePlayAgain}>
          Play Again
        </button>
      )}
    </div>
  );
};

export default PracticeMode;
