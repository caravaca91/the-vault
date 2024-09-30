"use client";

import { useState, useEffect, useCallback } from 'react';
import { message as AntdMessage } from 'antd';
import styles from './game.module.css';
import { useRouter } from 'next/navigation'; 



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
  const [ground, setGround] = useState<string[][]>(
    Array(15).fill([]).map(() => Array(10).fill(""))
  );
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [selectedLetters, setSelectedLetters] = useState<SelectedLetter[]>([]);
  const [validWords, setValidWords] = useState<Set<string>>(new Set());
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [fallingSpeed, setFallingSpeed] = useState<number>(100);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [longestWord, setLongestWord] = useState<string | null>(null);
  const [showValidWordsModal, setShowValidWordsModal] = useState(false);
  const [suggestedWords, setSuggestedWords] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<string | null>(null);
  const [difficultySelected, setDifficultySelected] = useState<boolean>(false);

  const [longestWordEver, setLongestWordEver] = useState<LeaderboardEntry[]>([]);
  const [longestWordToday, setLongestWordToday] = useState<LeaderboardEntry[]>([]);
  const [highestScoreEver, setHighestScoreEver] = useState<LeaderboardEntry[]>([]);
  const [highestScoreToday, setHighestScoreToday] = useState<LeaderboardEntry[]>([]);

  const [userAlias, setUserAlias] = useState<string>("");
  const [inputIdentifier, setInputIdentifier] = useState<string>("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState<string | null>(null);
  const [showAliasScreen, setShowAliasScreen] = useState<boolean>(false);
  const [useExistingIdentifier, setUseExistingIdentifier] = useState<boolean>(false);
  const [showGameStartButton, setShowGameStartButton] = useState<boolean>(false);

  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const router = useRouter();


  const handleAliasSelection = async () => {
    if (userAlias.trim() !== "") {
      try {
        // Check if alias already exists
        const checkResponse = await fetch(`/api/check-alias?alias=${userAlias}`);
        if (!checkResponse.ok) {
          throw new Error('Failed to check alias');
        }
  
        const checkData = await checkResponse.json();
        if (checkData.exists) {
          AntdMessage.error('Usuari ja en ús. Tria&apos;n un altre!');
          return;
        }
  
        // If alias is available, save it and generate unique identifier
        const response = await fetch('/api/save-alias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ alias: userAlias }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to save alias');
        }
  
        const data = await response.json();
        const generatedCode = data.uniqueIdentifier;
  
        setUniqueIdentifier(generatedCode);
        setShowGameStartButton(true);
  
        // Store user details in localStorage
        localStorage.setItem('currentUserAlias', userAlias);
        localStorage.setItem('currentUserIdentifier', generatedCode);
      } catch (error) {
        AntdMessage.error('Error creant l&apos;usuari, torna a intentar-ho!');
        console.error(error);
      }
    } else {
      AntdMessage.error('Si us plau, introdueix un usuari vàlid!');
    }
  };
  
  
  const handleExistingIdentifier = async () => {
    if (userAlias.trim() !== "" && inputIdentifier.trim() !== "") {
      try {
        const response = await fetch(`/api/verify-alias?alias=${userAlias}&identifier=${inputIdentifier}`);
        if (!response.ok) {
          throw new Error('Failed to verify alias');
        }
  
        const data = await response.json();
        if (data.exists) {
          // Valid credentials, set up the game
          setUniqueIdentifier(inputIdentifier);
          
          // Store user details in localStorage
          localStorage.setItem('currentUserAlias', userAlias);
          localStorage.setItem('currentUserIdentifier', inputIdentifier);
  
          // Set up the game mode and start the game
          setGameMode("Competir");
          setGameStarted(true);
          setShowAliasScreen(false); // Hide alias selection screen
          setGround(Array(15).fill([]).map(() => Array(10).fill("")));
          setFallingLetter(null);
          setFoundWords([]);
          setSelectedLetters([]);
          setScore(0);
          setGameOver(false);
        } else {
          AntdMessage.error('Usuari o codi únic incorrecte');
        }
      } catch (error) {
        AntdMessage.error('Error verificant l&apos;usuari, torna a intentar-ho!');
        console.error(error);
      }
    } else {
      AntdMessage.error('Si us plau, introdueix tant l&apos;usuari com el codi!');
    }
  };
  

  

  interface LeaderboardEntry {
    alias: string;
    longest_word?: string;
    max_score?: number;
  }

  const toggleValidWordsModal = () => {
    setShowValidWordsModal(!showValidWordsModal);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleRestart = () => {
    setGameStarted(false);
    setDifficultySelected(false);
    setGameMode(null);
    setGround(Array(15).fill([]).map(() => Array(10).fill("")));
    setFallingLetter(null);
    setFoundWords([]);
    setSelectedLetters([]);
    setScore(0);
    setLongestWord(null);
    setSuggestedWords([]);
    setGameOver(false);
  };


  const handleReturnToFirstPage = () => {
    // Resetting necessary states before returning
    setGameStarted(false);
    setDifficultySelected(false);
    setGameMode(null);
    setSelectedLetters([]);
    setScore(0);
    setFoundWords([]);
    setGameOver(false);
    setSuggestedWords([]);
    setShowAliasScreen(false); // Ensure alias screen is not shown
    setUniqueIdentifier(null);
    setUseExistingIdentifier(false);
    setShowGameStartButton(false);
    setUserAlias(""); 
    setInputIdentifier("");
  
    // Navigate back to the first page
    router.push('/');
  };

  const findValidWords = useCallback(() => {
    const gridLettersArray = ground.flat().filter(letter => letter !== "");
    const foundWordsList: Set<string> = new Set();
    const usedLetters = new Set();

    validWords.forEach((word) => {
      if (!foundWords.includes(word) && !suggestedWords.includes(word)) {
        const wordLetters = word.split("");
        const tempGridLetters = [...gridLettersArray];

        let canFormWord = true;
        const currentUsedLetters = new Set();

        wordLetters.forEach((char) => {
          const index = tempGridLetters.indexOf(char);
          if (index !== -1 && !usedLetters.has(char)) {
            tempGridLetters.splice(index, 1);
            currentUsedLetters.add(char);
          } else {
            canFormWord = false;
          }
        });

        if (canFormWord && word.length >= 3 && word.length <= 10) {
          foundWordsList.add(word);
          currentUsedLetters.forEach((letter) => usedLetters.add(letter));
        }
      }
    });

    return Array.from(foundWordsList).slice(0, 10);
  }, [ground, validWords, foundWords, suggestedWords]);

  const handleSuggestWords = (event: React.MouseEvent<HTMLButtonElement>) => {
    const words = findValidWords();

    if (words.length > 0) {
      setSuggestedWords(words);
    } else {
      setSuggestedWords([]);
    }

    event.currentTarget.blur();
  };
  const handleGameEnd = async () => {
    setGameOver(true);
  
    // Only save the score in "compete" mode and if there is a new max score or longest word
    if (gameMode === 'Competir' && (score > maxScore || longestWord)) {
      try {
        const response = await fetch('/api/save-score', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            alias: userAlias,
            max_score: score > maxScore ? score : maxScore,
            longest_word: longestWord,
          }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to save score');
        }
  
        console.log('Score saved successfully');
      } catch (error) {
        console.error('Error saving score:', error);
      }
    }
  
    // Fetch leaderboard data at the end of the game
    try {
      const response = await fetch('/api/get-leaderboard');
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard data');
      }
      const data = await response.json();
  
      // Update the state with data from the API
      setLongestWordEver(data.longestWordEver);
      setLongestWordToday(data.longestWordToday);
      setHighestScoreEver(data.highestScoreEver);
      setHighestScoreToday(data.highestScoreToday);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      AntdMessage.error('No es pot obtenir la informació de la classificació');
    }
  };
  

  useEffect(() => {
    const savedAlias = localStorage.getItem('currentUserAlias');
    const savedIdentifier = localStorage.getItem('currentUserIdentifier');
  
    if (savedAlias && savedIdentifier) {
      const verifyUser = async () => {
        try {
          const response = await fetch(`/api/verify-alias?alias=${savedAlias}&identifier=${savedIdentifier}`);
          if (!response.ok) {
            throw new Error('Failed to verify alias');
          }
  
          const data = await response.json();
          if (data.exists) {
            // Valid credentials, proceed
            setUserAlias(savedAlias);
            setUniqueIdentifier(savedIdentifier);
            setShowGameStartButton(true);
          } else {
            // Clear invalid user details from localStorage
            localStorage.removeItem('currentUserAlias');
            localStorage.removeItem('currentUserIdentifier');
          }
        } catch (error) {
          console.error('Error verifying user from localStorage', error);
        }
      };
  
      verifyUser();
    }
  }, []);
  

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMaxScore = Number(localStorage.getItem('maxScore')) || 0;
      setMaxScore(savedMaxScore);

      const savedLongestWord = localStorage.getItem('longestWord') || "";
      setLongestWord(savedLongestWord);
    }
  }, []);

  useEffect(() => {
    const loadWords = async () => {
      const response = await fetch('/DISC2-LP.txt');
      const text = await response.text();
      const words = new Set(
        text.split('\n').map(word => word.trim().toUpperCase())
      );
      setValidWords(words);
    };
    loadWords();
  }, []);

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

    const weightedLetters = letters.flatMap(letter =>
      Array(Math.floor(letter.weight * 100)).fill(letter.char)
    );
    return weightedLetters[Math.floor(Math.random() * weightedLetters.length)];
  };

  const updateGroundWithLetter = (letter: Letter) => {
    const newGround = [...ground];
    newGround[letter.y][letter.x] = letter.char;
    setGround(newGround);
    setFallingLetter(null);

    if (newGround[0].some(cell => cell !== "")) {
      setGameOver(true);
      handleGameEnd();
    }
  };

  const handleSubmitWord = () => {
    const selectedWord = selectedLetters
      .map(l => l.char)
      .join('')
      .toUpperCase();

    if (selectedWord === '') {
      AntdMessage.error('Cap lletra seleccionada!');
      return;
    }

    if (validWords.has(selectedWord) && !foundWords.includes(selectedWord)) {
      const newGround = [...ground];
      selectedLetters.forEach(({ row, col }) => {
        newGround[row][col] = "";
        makeLettersFall(newGround, col, row);
      });

      setGround(newGround);
      setFoundWords([...foundWords, selectedWord]);
      setSelectedLetters([]);

      const wordScore = selectedWord.length + 1; 
      AntdMessage.success(`Paraula "${selectedWord}" trobada! +${wordScore} punts!`);
      setScore(prevScore => prevScore + wordScore);

      if (!longestWord || selectedWord.length > longestWord.length) {
        setLongestWord(selectedWord);
        localStorage.setItem('longestWord', selectedWord);
      }

      const newMaxScore = Math.max(maxScore, score + wordScore);
      setMaxScore(newMaxScore);
      localStorage.setItem('maxScore', String(newMaxScore));
      
    } else if (foundWords.includes(selectedWord)) {
      AntdMessage.error('Paraula ja trobada');
      setSelectedLetters([]);
    } else {
      AntdMessage.error(`La paraula "${selectedWord}" no s'ha trobat.`);
      setSelectedLetters([]);
    }
  };

  const handleDeselectAll = () => {
    setSelectedLetters([]);
  };

  const spawnLetter = useCallback(() => {
    if (gameOver) return;
  
    const newLetter: Letter = {
      char: randomLetter(),
      x: Math.floor(Math.random() * 10),
      y: 0,
    };
    setFallingLetter(newLetter);
  }, [gameOver]);
  

  const moveLetterDown = useCallback(() => {
    if (!fallingLetter) return;
  
    if (fallingLetter.y < 14 && !ground[fallingLetter.y + 1][fallingLetter.x]) {
      setFallingLetter({ ...fallingLetter, y: fallingLetter.y + 1 });
    } else {
      updateGroundWithLetter(fallingLetter);
    }
  }, [fallingLetter, ground]);


  useEffect(() => {
    if (!gameStarted || gameOver) return;
  
    // Reduce the interval speed for testing
    const interval = setInterval(() => {
      if (!fallingLetter) {
        spawnLetter();
      } else {
        moveLetterDown();
      }
    }, fallingSpeed);
  
    return () => clearInterval(interval);
  }, [fallingLetter, gameOver, gameStarted, fallingSpeed, spawnLetter, moveLetterDown]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (gameOver) return;

      if (event.key.length === 1 && event.key.match(/[a-zA-ZçÇ]/)) {
        const typedLetter = event.key.toUpperCase();
        const foundLetterPositions: SelectedLetter[] = [];
        let letterSelected = false;

        ground.forEach((row, rowIndex) => {
          row.forEach((letter, colIndex) => {
            if (
              !letterSelected &&
              letter === typedLetter &&
              !selectedLetters.some(l => l.row === rowIndex && l.col === colIndex)
            ) {
              foundLetterPositions.push({ char: typedLetter, row: rowIndex, col: colIndex });
              letterSelected = true;
            }
          });
        });

        if (foundLetterPositions.length > 0) {
          setSelectedLetters(prevSelectedLetters => [
            ...prevSelectedLetters,
            ...foundLetterPositions.filter(
              ({ row, col }) =>
                !prevSelectedLetters.some(l => l.row === row && l.col === col)
            ),
          ]);
        }
        return;
      }

      if (event.key === "Backspace" && selectedLetters.length > 0) {
        setSelectedLetters(prevSelectedLetters => prevSelectedLetters.slice(0, -1));
      }

      if (event.key === "Enter" && selectedLetters.length > 0) {
        handleSubmitWord();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [ground, selectedLetters, gameOver, handleSubmitWord]);

  const handleSelectLetter = (row: number, col: number) => {
    const isSelected = selectedLetters.some(l => l.row === row && l.col === col);

    if (isSelected) {
      setSelectedLetters(selectedLetters.filter(l => l.row !== row || l.col !== col));
    } else {
      const newSelectedLetter: SelectedLetter = { char: ground[row][col], row, col };
      setSelectedLetters([...selectedLetters, newSelectedLetter]);
    }
  };

  const makeLettersFall = (grid: string[][], col: number, startRow: number) => {
    for (let row = startRow; row > 0; row--) {
      if (grid[row][col] === "") {
        grid[row][col] = grid[row - 1][col];
        grid[row - 1][col] = "";
      }
    }
  };

  const handleDifficultyChange = (selectedDifficulty: string, speed: number) => {
    setFallingSpeed(speed);
    setDifficultySelected(true);
  };

  const handleModeSelection = (selectedMode: string) => {
    if (selectedMode === 'Competir') {
      setFallingSpeed(50); // Set to 'Difícil' speed explicitly
      setShowAliasScreen(true);
    } else {
      setGameMode(selectedMode);
      setScore(0);
      setGameStarted(true);
      setGameOver(false);
      setGround(Array(15).fill([]).map(() => Array(10).fill("")));
      setFallingLetter(null);
      setFoundWords([]);
      setSelectedLetters([]);
    }
  };

  const handleWordSelection = (selectedWord: string) => {
    const lettersToSelect = [];
    const tempGround = [...ground];

    for (let i = 0; i < selectedWord.length; i++) {
      const char = selectedWord[i];
      for (let row = 0; row < tempGround.length; row++) {
        const col = tempGround[row].indexOf(char);
        if (col !== -1) {
          lettersToSelect.push({ char, row, col });
          tempGround[row][col] = "";
          break;
        }
      }
    }

    setSelectedLetters(lettersToSelect);
    handleSubmitWord();

    setSuggestedWords(prevWords => prevWords.filter(word => word !== selectedWord));
  };

  if (showAliasScreen) {
    return (
      <div className={styles.difficultyContainer}>
        <div className={styles.difficultyBox}>
          {!uniqueIdentifier && !useExistingIdentifier && (
            <h2 className={styles.difficultyHeader}>Tria un usuari</h2>
          )}
  
          {useExistingIdentifier && !uniqueIdentifier && (
            <h2 className={styles.difficultyHeader}>Bentornat!</h2>
          )}
  
          {!uniqueIdentifier && !useExistingIdentifier && (
            <>
              <input
                type="text"
                value={userAlias}
                onChange={(e) => setUserAlias(e.target.value)}
                className={styles.aliasInput}
                placeholder="Introdueix el teu nom d'usuari"
              />
              <button
                className={`${styles.difficultyButton} ${styles.difficultyButtonFacil}`}
                onClick={handleAliasSelection}
                disabled={!!uniqueIdentifier}
              >
                Tria usuari
              </button>
  
              <button
                className={`${styles.difficultyButton} ${styles.difficultyButtonDificil}`}
                onClick={() => setUseExistingIdentifier(true)}
              >
                Tinc un codi únic
              </button>
            </>
          )}
  
          {useExistingIdentifier && !uniqueIdentifier && (
            <>
              <input
                type="text"
                value={userAlias}
                onChange={(e) => setUserAlias(e.target.value)}
                className={styles.aliasInput}
                placeholder="Introdueix el teu nom d'usuari"
              />
              <input
                type="text"
                value={inputIdentifier}
                onChange={(e) => setInputIdentifier(e.target.value)}
                className={styles.aliasInput}
                placeholder="Introdueix el codi únic"
              />
              <button
                className={`${styles.difficultyButton} ${styles.difficultyButtonFacil}`}
                onClick={handleExistingIdentifier}
              >
                Comença el joc
              </button>
            </>
          )}
  
          {uniqueIdentifier && !useExistingIdentifier && (
            <div className={styles.uniqueCodeContainer}>
              <p>
                El teu codi únic: <strong>{uniqueIdentifier}</strong>
              </p>
              <p className={styles.uniqueCodeInfo}>
                Guarda aquest codi únic per jugar un altre dia o des d&apos;un altre ordinador amb el mateix usuari.
              </p>
              {showGameStartButton && (
                <button
                  className={`${styles.difficultyButton} ${styles.difficultyButtonFacil}`}
                  onClick={() => {
                    setGameMode("Competir");
                    setGameStarted(true);
                    setShowAliasScreen(false);
                    setGround(Array(15).fill([]).map(() => Array(10).fill("")));
                    setFallingLetter(null);
                    setFoundWords([]);
                    setSelectedLetters([]);
                    setScore(0);
                    setGameOver(false);
                  }}
                >
                  Comença el joc
                </button>
              )}
            </div>
          )}
  
          <button
            className={`${styles.instructionsButton} ${styles.returnButton}`}
            style={{ marginTop: '20px' }}
            onClick={handleReturnToFirstPage}
          >
            Torna enrere
          </button>
        </div>
      </div>
    );
  }
  
  
  

  if (!gameMode) {
    return (
      <div className={styles.difficultyContainer}>
        <div className={styles.difficultyBox}>
        <div className={styles.titleContainer} style={{ marginTop: '20px' }}>
        <button className={`${styles.letterButton} ${styles.letterL1}`}>L</button>
        <button className={`${styles.letterButton} ${styles.letterL2}`}>L</button>
        <button className={`${styles.letterButton} ${styles.letterE}`}>E</button>
        <button className={`${styles.letterButton} ${styles.letterT}`}>T</button>
        <button className={`${styles.letterButton} ${styles.letterR}`}>R</button>
        <button className={`${styles.letterButton} ${styles.letterI}`}>I</button>
        <button className={`${styles.letterButton} ${styles.letterS}`}>S</button>
      </div>
      <div className={styles.difficultyButtons} style={{ marginTop: '70px' }}>
      <div>
    <button
      className={`${styles.difficultyButton} ${styles.difficultyButtonFacil}`}
      onClick={() => handleModeSelection('Aprendre')}
    >
      Aprendre
    </button>
  </div>
  <div>
    <button
      className={`${styles.difficultyButton} ${styles.difficultyButtonDificil}`}
      onClick={() => handleModeSelection('Competir')}
    >
      Competir
    </button>
  </div>
  <div>
    <button
      className={styles.instructionsButton}
      onClick={() => setShowInstructionsModal((prev) => !prev)}
    >
      Com s&apos;hi juga
    </button>
  </div>
</div>


          {/* Instructions Button */}
        {showInstructionsModal && (
        <div className={styles.validWordsModal}>
          <button className={styles.closeButton} onClick={() => setShowInstructionsModal(false)}>
            X
          </button>
          <div className={styles.instructionsModalContent}>
            <p>
              <strong>Com s&apos;hi juga:</strong>
            </p>
            <ul>
              <li>1. Selecciona les lletres clicant-hi o teclejant-les.</li>
              <li>2. Envia la paraula trobada clicant &apos;Enter&apos; o amb el botó &apos;Enviar Paraula&apos;.</li>
              <li>3. Les paraules trobades t&apos;atorgaran punts segons la seva llargada.</li>
              <li>4. No deixis que les lletres t&apos;omplin el taulell!</li>
            </ul>
          </div>
        </div>
      )}


{/* Valid Words Button */}
<div>
  <button
    className={`${styles.wordsFoundButton} ${styles.buttonHoverEffect}`}
    onClick={toggleValidWordsModal}
    style={{
      backgroundColor: 'rgb(245, 130, 130)', // Pink color
      marginTop: '20px', // Additional space above the button
      marginBottom: '20px' // Additional space below the button
    }}
  >
    Paraules vàlides
  </button>
</div>

{showValidWordsModal && (
  <div className={styles.validWordsModal}>
    <button className={styles.closeButton} onClick={toggleValidWordsModal} aria-label="Close">
      X
    </button>
    <p>
      Lletris funciona amb el Diccionari de l’Scrabble (DISC). Si vols saber què és el DISC, fes clic{' '}
      <a
        href="https://diccionari.totescrable.cat/que-es/"
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link} // Add this class to style the link consistently
      >
        aquí
      </a>.
    </p>
  </div>
)}


          {/* Buy Me a Coffee Button */}
<div className={styles.coffeeButtonContainer}>
<button
    className={`${styles.difficultyButton} ${styles.coffeeButton} ${styles.buttonHoverEffect}`}
    onClick={() => window.open('https://www.buymeacoffee.com/marticabanes', '_blank')}
    style={{ backgroundColor: 'rgb(199, 139, 235)' }} // Purple color
  >
    Ajuda&apos;ns a créixer
  </button>
</div>
        </div>
      </div>
    );
  }

  if (gameMode === 'Aprendre' && !difficultySelected) {
    return (
      <div className={styles.difficultyContainer}>
        <div className={styles.difficultyBox}>
          <h2 className={styles.difficultyHeader}>Dificultat</h2>
          <div className={styles.difficultyButtons}>
            <button
              className={`${styles.difficultyButton} ${styles.difficultyButtonFacil}`}
              onClick={() => handleDifficultyChange('Fàcil', 300)}
            >
              Fàcil
            </button>
            <button
              className={`${styles.difficultyButton} ${styles.difficultyButtonMitjana}`}
              onClick={() => handleDifficultyChange('Mitjana', 100)}
            >
              Mitjana
            </button>
            <button
              className={`${styles.difficultyButton} ${styles.difficultyButtonDificil}`}
              onClick={() => handleDifficultyChange('Difícil', 50)}
            >
              Difícil
            </button>
          </div>
          {/* Return to First Page Button */}
          <button
            className={`${styles.difficultyButton} ${styles.returnButton}`}
            style={{ marginTop: '30px' }} // Add margin on top for better spacing
            onClick={handleReturnToFirstPage}
          >
            Torna enrere
          </button>
        </div>
      </div>
    );
  }


  // Once mode and difficulty are both selected, start the game
  return (
    <div className={styles.container}>
      {/* Title Letters (LLETRIS) centered above the grid */}
      <div className={styles.titleContainer}>
        <button className={`${styles.letterButton} ${styles.letterL1}`}>L</button>
        <button className={`${styles.letterButton} ${styles.letterL2}`}>L</button>
        <button className={`${styles.letterButton} ${styles.letterE}`}>E</button>
        <button className={`${styles.letterButton} ${styles.letterT}`}>T</button>
        <button className={`${styles.letterButton} ${styles.letterR}`}>R</button>
        <button className={`${styles.letterButton} ${styles.letterI}`}>I</button>
        <button className={`${styles.letterButton} ${styles.letterS}`}>S</button>
      </div>

      {/* Help box for "Aprendre" mode */}
      {gameMode === 'Aprendre' && !difficultySelected && (
  <div className={styles.difficultyContainer}>
    <div className={styles.difficultyBox}>
      <h2 className={styles.difficultyHeader}>Dificultat</h2>
      <div className={styles.difficultyButtons}>
        <button
          className={`${styles.difficultyButton} ${styles.difficultyButtonFacil}`}
          onClick={() => handleDifficultyChange('Fàcil', 300)}
        >
          Fàcil
        </button>
        <button
          className={`${styles.difficultyButton} ${styles.difficultyButtonMitjana}`}
          onClick={() => handleDifficultyChange('Mitjana', 100)}
        >
          Mitjana
        </button>
        <button
          className={`${styles.difficultyButton} ${styles.difficultyButtonDificil}`}
          onClick={() => handleDifficultyChange('Difícil', 50)}
        >
          Difícil
        </button>
      </div>
      {/* Button positioned at the bottom right inside the box */}
      <button
      className={`${styles.instructionsButton} ${styles.returnButton}`}
      onClick={handleReturnToFirstPage}
    >
      Torna a l&apos;inici
    </button>
    </div>
  </div>
)}

{gameMode === 'Aprendre' && (
  <div className={styles.leftSidebar}>
    <div className={styles.helpBox}>
      <h3>Paraules Suggerides</h3>
      <button
        className={`${styles.difficultyButton} ${styles.difficultyButtonFacil}`}
        onClick={handleSuggestWords}
      >
        Suggereix-me paraules
      </button>
      <ul>
        {suggestedWords.length > 0 ? (
          suggestedWords.map((word, index) => (
            <li key={index} onClick={() => handleWordSelection(word)}>
              {word}
            </li>
          ))
        ) : (
          <li>Res, de moment!</li>
        )}
      </ul>
    </div>
  </div>
)}

      {/* Leaderboard for "Competir" mode */}
{gameMode === 'Competir' && (
  <div className={styles.leftSidebar}>
    <div className={styles.leaderboardBox}>
      {/* Longest Word Ever Found */}
      <div className={styles.leaderboardSection}>
        <h4 className={styles.leaderboardSubTitle}>Paraula + llarga mai trobada</h4>
        <ul>
          {longestWordEver.length > 0 ? (
            longestWordEver.map((entry, index) => (
              <li key={index}>
                {entry.alias}: {entry.longest_word}
              </li>
            ))
          ) : (
            <li>Acaba una partida per veure els resultats!</li>
          )}
        </ul>
      </div>

      {/* Longest Word of the Day */}
      <div className={styles.leaderboardSection}>
        <h4 className={styles.leaderboardSubTitle}>Paraula + llarga del dia</h4>
        <ul>
          {longestWordToday.length > 0 ? (
            longestWordToday.map((entry, index) => (
              <li key={index}>
                {entry.alias}: {entry.longest_word}
              </li>
            ))
          ) : (
            <li>Acaba una partida per veure els resultats!</li>
          )}
        </ul>
      </div>

      {/* Highest Score Ever */}
      <div className={styles.leaderboardSection}>
        <h4 className={styles.leaderboardSubTitle}>Màxima puntuació</h4>
        <ul>
          {highestScoreEver.length > 0 ? (
            highestScoreEver.map((entry, index) => (
              <li key={index}>
                {entry.alias}: {entry.max_score} punts
              </li>
            ))
          ) : (
            <li>Acaba una partida per veure els resultats!</li>
          )}
        </ul>
      </div>

      {/* Highest Score of the Day */}
      <div className={styles.leaderboardSection}>
        <h4 className={styles.leaderboardSubTitle}>Màxima puntuació del dia</h4>
        <ul>
          {highestScoreToday.length > 0 ? (
            highestScoreToday.map((entry, index) => (
              <li key={index}>
                {entry.alias}: {entry.max_score} punts
              </li>
            ))
          ) : (
            <li>Acaba una partida per veure els resultats!</li>
          )}
        </ul>
      </div>
    </div>
  </div>
)}


      {/* Game grid */}
      <div className={styles.gridContainer}>
        <div className={styles.gameBoard}>
          {ground.map((row, rowIndex) =>
            row.map((letter, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`${styles.letter} ${
                  selectedLetters.some(l => l.row === rowIndex && l.col === colIndex)
                    ? styles.selected
                    : ''
                }`}
                onClick={() => letter && !gameOver && handleSelectLetter(rowIndex, colIndex)}
              >
                {letter ||
                  (fallingLetter &&
                  fallingLetter.x === colIndex &&
                  fallingLetter.y === rowIndex
                    ? fallingLetter.char
                    : '')}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sidebar with score and game stats */}
      <div className={styles.sidebar}>
        <div className={styles.selectedLetters}>
          <h3>Lletres Seleccionades: {selectedLetters.map(l => l.char).join('')}</h3>
        </div>

        <div className={styles.buttonContainer}>
          <button
            className={styles.submitButton}
            onClick={handleSubmitWord}
            disabled={gameOver}
          >
            Enviar Paraula
          </button>
          <button
            className={styles.deselectButton}
            onClick={handleDeselectAll}
            disabled={gameOver || selectedLetters.length === 0}
          >
            Elimina selecció
          </button>
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
          <div className={styles.longestWordContainer}>
            <span className={styles.longestWordLabel}>Paraula + llarga:</span>
            <span className={styles.longestWordValue}>{longestWord}</span>
          </div>
          <div className={styles.scoreboardItem}>
            <span>Puntuació màxima:</span>
            <span>{maxScore}</span>
          </div>
        </div>

        {gameOver && (
          <>
            <div>
              <button className={styles.wordsFoundButton} onClick={openModal}>
                Paraules trobades
              </button>
            </div>

            <div className={styles.gameOverContainer}>
              <div className={styles.gameOverRow}>
                <h2 className={styles.gameOver}>Has perdut!</h2>
                <button
                  className={`${styles.restartButton} ${styles.flashButton}`}
                  onClick={handleRestart}
                >
                  Juga de nou
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <button className={styles.closeButton} onClick={closeModal}>
              X
            </button>
            <ul>
              {foundWords.map((word, index) => {
                const capitalizedWord =
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                return (
                  <li key={index}>
                    <a
                      href={`https://dlc.iec.cat/Results?DecEntradaText=${capitalizedWord}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {capitalizedWord}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
