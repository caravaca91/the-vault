"use client";

import { useState, useEffect, useCallback } from 'react';
import { message as AntdMessage } from 'antd';  // Import Ant Design message only
import styles from './game.module.css';

interface Letter {
  char: string;
  x: number;
  y: number;
}

interface SelectedLetter {
  char: string;
  row: number;
  col: number;
}

export default function WordTetris() {
  const [fallingLetter, setFallingLetter] = useState<Letter | null>(null);
  const [ground, setGround] = useState<string[][]>(Array(15).fill([]).map(() => Array(10).fill("")));
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [selectedLetters, setSelectedLetters] = useState<SelectedLetter[]>([]);
  const [validWords, setValidWords] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [fallingSpeed, setFallingSpeed] = useState<number>(100); // Default speed (faster)
  const [gameStarted, setGameStarted] = useState<boolean>(false); // Whether the game has started
  const [score, setScore] = useState<number>(0); // Track the current score
  const [maxScore, setMaxScore] = useState<number>(0); // Initialize max score as 0
  const [longestWord, setLongestWord] = useState<string | null>(null); // New state to track longest word
  
  // Ensure localStorage is accessed only on the client side (after mount)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMaxScore = Number(localStorage.getItem('maxScore')) || 0;
      setMaxScore(savedMaxScore);
  
      const savedLongestWord = localStorage.getItem('longestWord') || "";
      setLongestWord(savedLongestWord);
    }
  }, []);

  // Load the DISC2-LP.txt file and store valid words
  useEffect(() => {
    const loadWords = async () => {
      const response = await fetch('/DISC2-LP.txt');
      const text = await response.text();
      const words = new Set(text.split('\n').map(word => word.trim().toUpperCase()));
      setValidWords(words);
    };
    loadWords();
  }, []);

  // Generate a random letter based on the given frequencies
  const randomLetter = () => {
    const letters = [
      { char: 'A', weight: 11.92 },
      { char: 'B', weight: 1.56 },
      { char: 'C', weight: 3.37 },
      { char: 'D', weight: 2.83 },
      { char: 'E', weight: 14.15 },
      { char: 'F', weight: 1.23 },
      { char: 'G', weight: 2.02 },
      { char: 'H', weight: 0.15 },
      { char: 'I', weight: 8.37 },
      { char: 'J', weight: 0.73 },
      { char: 'L', weight: 4.38 },
      { char: 'M', weight: 3.72 },
      { char: 'N', weight: 6.30 },
      { char: 'O', weight: 4.73 },
      { char: 'P', weight: 2.11 },
      { char: 'Q', weight: 0.59 },
      { char: 'R', weight: 8.17 },
      { char: 'S', weight: 11.73 },
      { char: 'T', weight: 4.81 },
      { char: 'U', weight: 4.05 },
      { char: 'V', weight: 1.47 },
      { char: 'X', weight: 0.75 },
      { char: 'Y', weight: 0.22 },
      { char: 'Z', weight: 0.40 },
      { char: 'Ç', weight: 0.10 }
    ];

    const weightedLetters = letters.flatMap(letter => Array(Math.floor(letter.weight * 100)).fill(letter.char));
    return weightedLetters[Math.floor(Math.random() * weightedLetters.length)];
  };

  // Update the ground array with the landed letter
  const updateGroundWithLetter = (letter: Letter) => {
    const newGround = [...ground];
    newGround[letter.y][letter.x] = letter.char;
    setGround(newGround);
    setFallingLetter(null);

    if (newGround[0].some(cell => cell !== "")) {
      setGameOver(true);
    }
  };

  // Handle submitting the selected word
  const handleSubmitWord = () => {
    const selectedWord = selectedLetters.map(l => l.char).join('').toUpperCase();

    if (validWords.has(selectedWord) && !foundWords.includes(selectedWord)) {
      const newGround = [...ground];

      selectedLetters.forEach(({ row, col }) => {
        newGround[row][col] = "";
        makeLettersFall(newGround, col, row);
      });

      setGround(newGround);
      setFoundWords([...foundWords, selectedWord]);
      setSelectedLetters([]);
      const wordScore = selectedWord.length + 1; // 1 point per word + N points for letters

      AntdMessage.success(`Paraula "${selectedWord}" trobada! +${wordScore} punts!`);
      
      // Update score
      setScore(prevScore => prevScore + wordScore);

      // Check if the current word is the longest word found
      if (!longestWord || selectedWord.length > longestWord.length) {
        setLongestWord(selectedWord);
        localStorage.setItem('longestWord', selectedWord);  // Save longest word to localStorage
      }

      // Update max score if necessary
      const newMaxScore = Math.max(maxScore, score + wordScore);
      setMaxScore(newMaxScore);

      // Save max score in localStorage if in browser
      if (typeof window !== 'undefined') {
        localStorage.setItem('maxScore', String(newMaxScore));
      }
    } else if (foundWords.includes(selectedWord)) {
      AntdMessage.error('Paraula ja trobada');
      setSelectedLetters([]);  // Deselect all letters
    } else {
      AntdMessage.error(`La paraula "${selectedWord}" no s'ha trobat.`);
      setSelectedLetters([]);  // Deselect all letters
    }
  };

  // Function to deselect all selected letters
  const handleDeselectAll = () => {
    setSelectedLetters([]);  // Clear the selected letters array
  };

  // Spawn a random letter at the top
  const spawnLetter = useCallback(() => {
    if (gameOver) return;

    const newLetter: Letter = {
      char: randomLetter(),
      x: Math.floor(Math.random() * 10),
      y: 0,
    };
    setFallingLetter(newLetter);
  }, [gameOver]);

  // Move the falling letter down one row if possible
  const moveLetterDown = useCallback(() => {
    if (!fallingLetter) return;

    if (fallingLetter.y < 14 && !ground[fallingLetter.y + 1][fallingLetter.x]) {
      setFallingLetter({ ...fallingLetter, y: fallingLetter.y + 1 });
    } else {
      updateGroundWithLetter(fallingLetter);
    }
  }, [fallingLetter, ground]);

  // Handle falling letter movement
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const interval = setInterval(() => {
      if (!fallingLetter) {
        spawnLetter();
      } else {
        moveLetterDown();
      }
    }, fallingSpeed);

    return () => clearInterval(interval);
  }, [fallingLetter, gameOver, gameStarted, fallingSpeed, spawnLetter, moveLetterDown]);

  // Handle key presses to submit word with Enter key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameOver) return;

      // Handle typing letters
      if (event.key.length === 1 && event.key.match(/[a-zA-Z]/)) {
        const typedLetter = event.key.toUpperCase();
        const foundLetterPositions: SelectedLetter[] = [];
        let letterSelected = false;

        ground.forEach((row, rowIndex) => {
          row.forEach((letter, colIndex) => {
            if (!letterSelected && letter === typedLetter && !selectedLetters.some(l => l.row === rowIndex && l.col === colIndex)) {
              foundLetterPositions.push({ char: typedLetter, row: rowIndex, col: colIndex });
              letterSelected = true;
            }
          });
        });

        if (foundLetterPositions.length > 0) {
          setSelectedLetters(prevSelectedLetters => [
            ...prevSelectedLetters,
            ...foundLetterPositions.filter(
              ({ row, col }) => !prevSelectedLetters.some(l => l.row === row && l.col === col)
            )
          ]);
        }
        return;
      }

      // Handle Backspace to deselect the last selected letter
      if (event.key === "Backspace" && selectedLetters.length > 0) {
        setSelectedLetters(prevSelectedLetters => prevSelectedLetters.slice(0, -1));
      }

      // If the Enter key is pressed, submit the word
      if (event.key === "Enter" && selectedLetters.length > 0) {
        handleSubmitWord();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ground, selectedLetters, gameOver, handleSubmitWord]);

  // Handle selecting and de-selecting letters
  const handleSelectLetter = (row: number, col: number) => {
    const isSelected = selectedLetters.some(l => l.row === row && l.col === col);

    if (isSelected) {
      setSelectedLetters(selectedLetters.filter(l => l.row !== row || l.col !== col));
    } else {
      const newSelectedLetter: SelectedLetter = { char: ground[row][col], row, col };
      setSelectedLetters([...selectedLetters, newSelectedLetter]);
    }
  };

  // Make letters fall down if there are gaps below them
  const makeLettersFall = (grid: string[][], col: number, startRow: number) => {
    for (let row = startRow; row > 0; row--) {
      if (grid[row][col] === "") {
        grid[row][col] = grid[row - 1][col];
        grid[row - 1][col] = "";
      }
    }
  };

  // Handle difficulty change and start the game
  const handleDifficultyChange = (selectedDifficulty: string, speed: number) => {
    setFallingSpeed(speed);
    setScore(0); // Reset score for the new game
    setGameStarted(true);  // Start the game
    setGameOver(false);    // Reset game over state
  };

  // Reset game to difficulty selection
  const handleRestart = () => {
    setGameStarted(false);  // Go back to difficulty selection
    setGround(Array(15).fill([]).map(() => Array(10).fill("")));
    setFallingLetter(null);
    setFoundWords([]);
    setSelectedLetters([]);
  };

  // Show difficulty selection screen if the game hasn't started
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [isModalOpen, setModalOpen] = useState(false);  // State for modal visibility

  const handleHoverInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  if (!gameStarted) {
    return (
      <div className={styles.difficultyContainer}>
        <div className={styles.difficultyBox}>
          <h2 className={styles.difficultyHeader}>Dificultat</h2>
          <div className={styles.difficultyButtons}>
            <button className={`${styles.difficultyButton} ${styles.difficultyButtonFacil}`} onClick={() => handleDifficultyChange('Fàcil', 300)}>
              Fàcil
            </button>
            <button className={`${styles.difficultyButton} ${styles.difficultyButtonMitjana}`} onClick={() => handleDifficultyChange('Mitjana', 100)}>
              Mitjana
            </button>
            <button className={`${styles.difficultyButton} ${styles.difficultyButtonDificil}`} onClick={() => handleDifficultyChange('Difícil', 50)}>
              Difícil
            </button>
          </div>

          {/* New Instructions Button */}
          <button className={styles.instructionsButton} onMouseEnter={handleHoverInstructions} onMouseLeave={handleHoverInstructions}>
            Com s&apos;hi juga
          </button>

          {/* Instructions Modal Pop-up */}
          <div className={`${styles.instructionsModal} ${showInstructions ? '' : styles.instructionsModalHidden}`}>
            <h3>Com s&apos;hi juga</h3>
            <ul>
              <li>1. Selecciona les lletres clicant-hi o teclejant-les.</li>
              <li>2. Envia la paraula trobada clicant &apos;Enter&apos; o amb el botó &apos;Enviar Paraula&apos;.</li>
              <li>3. Les paraules trobades t&apos;atorgaran punts segons la seva llargada.</li>
              <li>4. No deixis que les lletres t&apos;omplin el taulell!</li>
            </ul>
          </div>

          <div className={styles.coffeeButtonContainer}>
            <a href="https://www.buymeacoffee.com/marticabanes" target="_blank" rel="noopener noreferrer">
              <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style={{ height: '60px', width: '217px' }} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.gridContainer}>
        <div className={styles.gameBoard}>
          {ground.map((row, rowIndex) =>
            row.map((letter, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`${styles.letter} ${selectedLetters.some(l => l.row === rowIndex && l.col === colIndex) ? styles.selected : ""}`}
                onClick={() => letter && handleSelectLetter(rowIndex, colIndex)}
              >
                {letter || (fallingLetter && fallingLetter.x === colIndex && fallingLetter.y === rowIndex ? fallingLetter.char : "")}
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.sidebar}>
        <div className={styles.selectedLetters}>
          <h3>Lletres Seleccionades: {selectedLetters.map(l => l.char).join('')}</h3>
        </div>

        <div className={styles.buttonContainer}>
          <button className={styles.submitButton} onClick={handleSubmitWord}>Enviar Paraula</button>
          <button className={styles.deselectButton} onClick={handleDeselectAll}>Elimina selecció</button>
        </div>

        <div className={styles.scoreboard}>
          <div className={styles.scoreboardItem}>
            <span>Paraules trobades:</span>
            <span>{foundWords.length}</span>
          </div>
          <div className={styles.scoreboardItem}>
            <span>Puntuació:</span>
            <span>{score}</span>
          </div>
          <div className={styles.scoreboardItem}>
            <span>Paraula + llarga:</span>
            <span>{longestWord || 'N/A'}</span>
          </div>
          <div className={styles.scoreboardItem}>
            <span>Puntuació màxima:</span>
            <span>{maxScore}</span>
          </div>
        </div>

        {/* Show Paraules trobades button only when game is over */}
        {gameOver && (
          <div>
            <button className={styles.wordsFoundButton} onClick={openModal}>
              Paraules trobades
            </button>
          </div>
        )}

        {/* Modal for displaying found words */}
        {isModalOpen && (
          <div className={styles.modalOverlay}>
            <div className={styles.modal}>
              <button className={styles.closeButton} onClick={closeModal}>X</button>
              <ul>
                {foundWords.map((word, index) => {
                  // Capitalize the first letter and make the rest lowercase
                  const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                  return (
                    <li key={index}>
                      <a href={`https://dlc.iec.cat/Results?DecEntradaText=${capitalizedWord}`} target="_blank" rel="noopener noreferrer">
                        {capitalizedWord}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {gameOver && (
          <div className={styles.gameOverContainer}>
            <div className={styles.gameOverRow}>
              <h2 className={styles.gameOver}>Has perdut!</h2>
              <button className={styles.restartButton} onClick={handleRestart}>Juga de nou</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
