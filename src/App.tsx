import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { BridgeSummaryModal } from './components/BridgeSummaryModal'
import { GameScreens } from './components/GameScreens'
import { IntroScreen } from './components/IntroScreen'
import {
    ISLANDS,
    ISLAND_LABELS,
    MAX_LIFE,
    MAX_MONEY,
    SNAKE_PASS_LIFE_COST,
    STARTING_LIFE,
    STORAGE_KEY,
    UNSEEN_REFRESH_THRESHOLD
} from './gameData'
import { QUESTIONS, clamp, shuffleQuestionOptions } from './gameData'
import {
  type BridgeSummary,
  type Phase,
  type Screen,
  type GameState,
  type IslandAnswer,
  type IslandKey,
} from './types'

const defaultState: GameState = {
  phase: 'intro',
  screen: 'main',
  life: STARTING_LIFE,
  money: MAX_MONEY,
  currentQuestionIndex: null,
  revealedOptionIndex: null,
  pendingGameOverReason: '',
  gameOverReason: '',
  currentIslandIndex: 0,
  islandAnswers: [],
  seenQuestionIndexes: [],
}

function loadSavedState(): GameState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<GameState>

    const savedQuestionIndex =
      typeof parsed.currentQuestionIndex === 'number' &&
      parsed.currentQuestionIndex >= 0 &&
      parsed.currentQuestionIndex < QUESTIONS.length
        ? parsed.currentQuestionIndex
        : null

    const savedIslandIndex =
      typeof parsed.currentIslandIndex === 'number' &&
      parsed.currentIslandIndex >= 0 &&
      parsed.currentIslandIndex < ISLANDS.length
        ? parsed.currentIslandIndex
        : 0
    const savedIsland = ISLANDS[savedIslandIndex]
    const alignedQuestionIndex =
      savedQuestionIndex !== null && QUESTIONS[savedQuestionIndex].island === savedIsland
        ? savedQuestionIndex
        : null

    return {
      phase: parsed.phase === 'game' ? 'game' : 'intro',
      screen:
        (parsed.screen === 'question' && alignedQuestionIndex !== null) ||
        parsed.screen === 'gameover'
          ? parsed.screen
          : 'main',
      life: clamp(Number(parsed.life ?? STARTING_LIFE), 0, MAX_LIFE),
      money: clamp(Number(parsed.money ?? MAX_MONEY), 0, MAX_MONEY),
      currentQuestionIndex: alignedQuestionIndex,
      revealedOptionIndex:
        typeof parsed.revealedOptionIndex === 'number' &&
        alignedQuestionIndex !== null &&
        parsed.revealedOptionIndex >= 0 &&
        parsed.revealedOptionIndex < QUESTIONS[alignedQuestionIndex].options.length
          ? parsed.revealedOptionIndex
          : null,
      pendingGameOverReason:
        typeof parsed.pendingGameOverReason === 'string' ? parsed.pendingGameOverReason : '',
      gameOverReason: typeof parsed.gameOverReason === 'string' ? parsed.gameOverReason : '',
      currentIslandIndex: savedIslandIndex,
      islandAnswers: Array.isArray(parsed.islandAnswers)
        ? parsed.islandAnswers.filter(
            (entry): entry is IslandAnswer =>
              typeof entry === 'object' &&
              entry !== null &&
              typeof entry.island === 'string' &&
              ISLANDS.includes(entry.island as IslandKey) &&
              typeof entry.questionTitle === 'string' &&
              typeof entry.questionText === 'string' &&
              typeof entry.answerText === 'string' &&
              typeof entry.feedback === 'string',
          )
        : [],
      seenQuestionIndexes: Array.isArray(parsed.seenQuestionIndexes)
        ? Array.from(
            new Set(
              parsed.seenQuestionIndexes.filter(
                (value): value is number =>
                  typeof value === 'number' && value >= 0 && value < QUESTIONS.length,
              ),
            ),
          )
        : [],
    }
  } catch {
    return null
  }
}


function App() {
  const [phase, setPhase] = useState<Phase>(defaultState.phase)
  const [screen, setScreen] = useState<Screen>(defaultState.screen)
  const [life, setLife] = useState(defaultState.life)
  const [money, setMoney] = useState(defaultState.money)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(
    defaultState.currentQuestionIndex,
  )
  const [revealedOptionIndex, setRevealedOptionIndex] = useState<number | null>(
    defaultState.revealedOptionIndex,
  )
  const [pendingGameOverReason, setPendingGameOverReason] = useState(
    defaultState.pendingGameOverReason,
  )
  const [gameOverReason, setGameOverReason] = useState(defaultState.gameOverReason)
  const [currentIslandIndex, setCurrentIslandIndex] = useState(defaultState.currentIslandIndex)
  const [islandAnswers, setIslandAnswers] = useState<IslandAnswer[]>(defaultState.islandAnswers)
  const [seenQuestionIndexes, setSeenQuestionIndexes] = useState<number[]>(
    defaultState.seenQuestionIndexes,
  )
  const [showRealExamples, setShowRealExamples] = useState(false)
  const [bridgeSummary, setBridgeSummary] = useState<BridgeSummary | null>(null)
  const [canContinue, setCanContinue] = useState(() => loadSavedState() !== null)
  const [hasStartedSession, setHasStartedSession] = useState(false)

  const currentIsland = ISLANDS[currentIslandIndex]
  const currentIslandLabel = ISLAND_LABELS[currentIsland]
  const canCrossBridge = currentIslandIndex < ISLANDS.length - 1
  const hasQuestionsForCurrentIsland = useMemo(
    () => QUESTIONS.some((question) => question.island === currentIsland),
    [currentIsland],
  )

  const currentQuestion = useMemo(() => {
    if (currentQuestionIndex === null) {
      return null
    }

    return shuffleQuestionOptions(QUESTIONS[currentQuestionIndex])
  }, [currentQuestionIndex])
  const revealedOption = useMemo(
    () =>
      currentQuestion && revealedOptionIndex !== null
        ? currentQuestion.options[revealedOptionIndex]
        : null,
    [currentQuestion, revealedOptionIndex],
  )

  const applySavedState = (savedState: GameState) => {
    setPhase(savedState.phase)
    setScreen(savedState.screen)
    setLife(savedState.life)
    setMoney(savedState.money)
    setCurrentQuestionIndex(savedState.currentQuestionIndex)
    setRevealedOptionIndex(savedState.revealedOptionIndex)
    setPendingGameOverReason(savedState.pendingGameOverReason)
    setGameOverReason(savedState.gameOverReason)
    setCurrentIslandIndex(savedState.currentIslandIndex)
    setIslandAnswers(savedState.islandAnswers)
    setSeenQuestionIndexes(savedState.seenQuestionIndexes)
    setShowRealExamples(false)
    setBridgeSummary(null)
  }

  const startFreshGame = () => {
    setPhase('game')
    setScreen('main')
    setLife(STARTING_LIFE)
    setMoney(MAX_MONEY)
    setCurrentQuestionIndex(null)
    setRevealedOptionIndex(null)
    setPendingGameOverReason('')
    setGameOverReason('')
    setCurrentIslandIndex(0)
    setIslandAnswers([])
    setSeenQuestionIndexes([])
    setShowRealExamples(false)
    setBridgeSummary(null)
  }

  useEffect(() => {
    if (!hasStartedSession) {
      return
    }

    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        phase: phase === 'intro' ? 'game' : phase,
        screen,
        life,
        money,
        currentQuestionIndex,
        revealedOptionIndex,
        pendingGameOverReason,
        gameOverReason,
        currentIslandIndex,
        islandAnswers,
        seenQuestionIndexes,
      } satisfies GameState),
    )
    setCanContinue(true)
  }, [
    hasStartedSession,
    phase,
    screen,
    life,
    money,
    currentQuestionIndex,
    revealedOptionIndex,
    pendingGameOverReason,
    gameOverReason,
    currentIslandIndex,
    islandAnswers,
    seenQuestionIndexes,
  ])

  useEffect(() => {
    if (screen !== 'question' || currentQuestionIndex === null) {
      return
    }

    if (QUESTIONS[currentQuestionIndex].island !== currentIsland) {
      setCurrentQuestionIndex(null)
      setRevealedOptionIndex(null)
      setPendingGameOverReason('')
      setScreen('main')
    }
  }, [screen, currentQuestionIndex, currentIsland])

  const openRandomQuestion = () => {
    if (QUESTIONS.length === 0) {
      return
    }

    const islandQuestionIndexes = QUESTIONS.map((question, index) => ({ question, index }))
      .filter(({ question }) => question.island === currentIsland)
      .map(({ index }) => index)

    if (islandQuestionIndexes.length === 0) {
      return
    }

    let seenSet = new Set(seenQuestionIndexes)
    const unseenTotal = QUESTIONS.length - seenSet.size

    if (unseenTotal < UNSEEN_REFRESH_THRESHOLD) {
      seenSet = new Set<number>()
      setSeenQuestionIndexes([])
    }

    const allQuestionIndexes = QUESTIONS.map((_, index) => index)
    const candidateIndexes = islandQuestionIndexes.length > 0 ? islandQuestionIndexes : allQuestionIndexes
    let availableIndexes = candidateIndexes.filter((index) => !seenSet.has(index))

    if (availableIndexes.length === 0) {
      availableIndexes = allQuestionIndexes.filter((index) => !seenSet.has(index))
    }

    if (availableIndexes.length === 0) {
      availableIndexes = candidateIndexes
    }

    const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)]

    setSeenQuestionIndexes((previous) =>
      previous.includes(randomIndex) ? previous : [...previous, randomIndex],
    )

    setCurrentQuestionIndex(randomIndex)
    setRevealedOptionIndex(null)
    setPendingGameOverReason('')
    setShowRealExamples(false)
    setScreen('question')
  }

  const chooseOption = (optionIndex: number) => {
    if (!currentQuestion || revealedOptionIndex !== null) {
      return
    }

    const option = currentQuestion.options[optionIndex]
    const updatedLife = clamp(life + option.deltaLife, 0, MAX_LIFE)
    const updatedMoney = clamp(money + option.deltaMoney, 0, MAX_MONEY)

    setLife(updatedLife)
    setMoney(updatedMoney)
    setRevealedOptionIndex(optionIndex)
    setShowRealExamples(false)
    setIslandAnswers((previous) => [
      ...previous,
      {
        island: currentIsland,
        questionTitle: currentQuestion.title,
        questionText: currentQuestion.text,
        answerText: option.text,
        feedback: option.feedback,
      },
    ])

    if (updatedLife <= 0 || updatedMoney <= 0) {
      const reasons: string[] = []

      if (updatedLife <= 0) {
        reasons.push('Too many unethical shortcuts damaged trust in the project.')
      }

      if (updatedMoney <= 0) {
        reasons.push('You used up the entire project budget.')
      }

      setPendingGameOverReason(
        `${reasons.join(' ')} The robot program stops here. Try again and balance ethics with limited resources.`,
      )
      return
    }
  }

  const continueAfterAnswer = () => {
    if (pendingGameOverReason) {
      setGameOverReason(pendingGameOverReason)
      setPendingGameOverReason('')
      setScreen('gameover')
      return
    }

    setCurrentQuestionIndex(null)
    setRevealedOptionIndex(null)
    setShowRealExamples(false)
    setScreen('main')
  }

  const startNewGame = () => {
    setHasStartedSession(true)
    startFreshGame()
  }

  const continueSavedGame = () => {
    const savedState = loadSavedState()

    if (!savedState) {
      setCanContinue(false)
      return
    }

    setHasStartedSession(true)
    applySavedState({
      ...savedState,
      phase: 'game',
      screen:
        savedState.screen === 'question' || savedState.screen === 'gameover'
          ? savedState.screen
          : 'main',
    })
  }

  const openMissionScroll = () => {
    setPhase('intro')
  }

  const crossBridge = () => {
    if (!canCrossBridge) {
      return
    }

    const fromIsland = currentIsland
    const toIsland = ISLANDS[currentIslandIndex + 1]
    const answers = islandAnswers.filter((entry) => entry.island === fromIsland)
    const updatedMoney = clamp(money + 1, 0, MAX_MONEY)

    setCurrentIslandIndex((index) => index + 1)
    setMoney(updatedMoney)
    setCurrentQuestionIndex(null)
    setRevealedOptionIndex(null)
    setPendingGameOverReason('')
    setScreen('main')
    setBridgeSummary({ fromIsland, toIsland, answers })
  }

  const useSnakePass = () => {
    if (life < SNAKE_PASS_LIFE_COST) {
      return
    }

    const updatedLife = clamp(life - SNAKE_PASS_LIFE_COST, 0, MAX_LIFE)
    setLife(updatedLife)

    if (updatedLife <= 0) {
      setGameOverReason(
        'You spent your last lives on a snake pass. With no trust left in the project, the ethics quest ends here.',
      )
      setScreen('gameover')
    }
  }

  const closeBridgeSummary = () => {
    setBridgeSummary(null)
  }

  const resetGame = () => {
    setHasStartedSession(true)
    startFreshGame()
  }

  return (
    <div className="app shell-theme">
      <main>
        {phase === 'intro' ? (
          <IntroScreen
            canContinue={canContinue}
            onStartNewGame={startNewGame}
            onContinueSavedGame={continueSavedGame}
          />
        ) : (
          <GameScreens
            screen={screen}
            life={life}
            money={money}
            maxLife={MAX_LIFE}
            maxMoney={MAX_MONEY}
            currentIslandLabel={currentIslandLabel}
            canCrossBridge={canCrossBridge}
            hasQuestionsForCurrentIsland={hasQuestionsForCurrentIsland}
            snakePassLifeCost={SNAKE_PASS_LIFE_COST}
            currentQuestion={currentQuestion}
            revealedOption={revealedOption}
            showRealExamples={showRealExamples}
            pendingGameOverReason={pendingGameOverReason}
            gameOverReason={gameOverReason}
            onOpenMissionScroll={openMissionScroll}
            onOpenRandomQuestion={openRandomQuestion}
            onCrossBridge={crossBridge}
            onUseSnakePass={useSnakePass}
            onChooseOption={chooseOption}
            onBackToOverview={() => setScreen('main')}
            onToggleRealExamples={() => setShowRealExamples((current) => !current)}
            onContinueAfterAnswer={continueAfterAnswer}
            onResetGame={resetGame}
          />
        )}
      </main>

      {bridgeSummary ? (
        <BridgeSummaryModal bridgeSummary={bridgeSummary} onClose={closeBridgeSummary} />
      ) : null}
    </div>
  )
}

export default App
