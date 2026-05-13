import { useEffect, useMemo, useState } from 'react'
import './App.css'
import problemsJson from '../problems.json'

const STORAGE_KEY = 'hpl-island-game-state'
const MAX_LIFE = 7
const MAX_MONEY = 5
/** Lives spent to skip a snake on the physical board (Snakes & Ladders tie-in). */
const SNAKE_PASS_LIFE_COST = 3
const STARTING_LIFE = 3
const UNSEEN_REFRESH_THRESHOLD = 5

type Phase = 'intro' | 'game'
type Screen = 'main' | 'question' | 'gameover'
type IslandKey = 'scope' | 'plan' | 'design' | 'optimize'

type IslandAnswer = {
  island: IslandKey
  questionTitle: string
  questionText: string
  answerText: string
  feedback: string
}

type BridgeSummary = {
  fromIsland: IslandKey
  toIsland: IslandKey
  answers: IslandAnswer[]
}

type Option = {
  text: string
  deltaLife: number
  deltaMoney: number
  deltaTurns: number
  feedbackLabel: string
  feedback: string
  realWorldNote: string
  realExample: {
    title: string
    summary: string
    source: string
    url?: string
  }
}

type Question = {
  island: IslandKey
  category: string
  title: string
  text: string
  options: Option[]
}

type GameState = {
  phase: Phase
  screen: Screen
  life: number
  money: number
  currentQuestionIndex: number | null
  revealedOptionIndex: number | null
  pendingGameOverReason: string
  gameOverReason: string
  currentIslandIndex: number
  islandAnswers: IslandAnswer[]
  seenQuestionIndexes: number[]
}

type RawEffect = {
  life: number
  coin: number
  turn?: number
  skip_next_turn?: boolean
}

type RawProblem = {
  id: number
  category?: string
  title?: string
  question: string
  options: {
    A: string
    B: string
  }
  effects: {
    A: RawEffect
    B: RawEffect
  }
  outcomes?: {
    A?: {
      feedbackLabel?: string
      feedback?: string
      whyItMatters?: string
    }
    B?: {
      feedbackLabel?: string
      feedback?: string
      whyItMatters?: string
    }
  }
  realExample?: {
    title: string
    summary: string
    source: string
    url?: string
  }
}

type RawProblemsByCategory = {
  _meta?: {
    islandCounts?: Partial<Record<'Scope' | 'Planning' | 'Development' | 'Optimisation', number>>
    note?: string
  }
  Scope?: RawProblem[]
  Planning?: RawProblem[]
  Development?: RawProblem[]
  Optimisation?: RawProblem[]
}

const INTRO_PARAGRAPHS = [
  `Welcome engineer! Your mission, should you choose to accept it, is to design a robot to assist people with motor disabilities, i.e. patients who struggle to move, with household tasks.`,
  `You will be asked various questions related to ethical considerations in different parts of this design process throughout the game. For every ethical answer you choose, you will gain a life but have to pay the financial or time cost. For every unethical shortcut you take, you will lose a life but save money or time.`,
  `The snakes and ladders represent the unpredictable chance which slows down or boosts real life engineering projects.`,
  `You start the game with 3 lives and 5 coins. The snake pass costs 3 lives. You can hold up to 7 lives. Every time you cross a bridge to the next island, you gain 1 coin.`,
  `The coins represent your fixed budget for the project, once you have spent all your coins you cannot spend more. Your objective is to be the first to make it to the end of the game with at least 1 life.`,
]

const ISLANDS: IslandKey[] = ['scope', 'plan', 'design', 'optimize']

const ISLAND_LABELS: Record<IslandKey, string> = {
  scope: 'Scope',
  plan: 'Plan',
  design: 'Design',
  optimize: 'Optimize',
}

function capitalizeFirstLetter(text: string) {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const DEFAULT_REAL_EXAMPLE: Option['realExample'] = {
  title: 'Documented ethics and safety review',
  summary:
    'Organizations in high-risk domains often document tradeoffs in safety, fairness, and accountability rather than hiding them.',
  source: 'General governance practice',
}

function buildFallbackOutcome(deltaLife: number) {
  const isEthical = deltaLife > 0

  return {
    feedbackLabel: isEthical ? 'Ethical choice' : 'Unethical shortcut',
    feedback: isEthical
      ? 'You accepted a real project cost in order to better protect users, fairness, or trust.'
      : 'You protected speed, cost, or sales at the expense of user welfare, trust, or inclusion.',
    whyItMatters: isEthical
      ? 'Ethical design usually means refusing to hide long-term harm behind short-term efficiency.'
      : 'Shortcuts rarely remove the cost of a decision; they usually push it onto someone else later.',
  }
}

function mapCategoryToIsland(category: string): IslandKey {
    const normalizedCategory = category.toLowerCase()

    if (normalizedCategory.includes('scope')) {
      return 'scope'
    }

    if (normalizedCategory.includes('plan')) {
      return 'plan'
    }

    if (normalizedCategory.includes('develop') || normalizedCategory.includes('design')) {
      return 'design'
    }

    if (normalizedCategory.includes('optim') || normalizedCategory.includes('refin')) {
      return 'optimize'
    }

    return 'scope'
  }

function normalizeProblems(input: RawProblem[] | RawProblemsByCategory): RawProblem[] {
  if (Array.isArray(input)) {
    return input
  }

  return [
    ...(input.Scope ?? []),
    ...(input.Planning ?? []),
    ...(input.Development ?? []),
    ...(input.Optimisation ?? []),
  ]
}

function buildQuestions(problems: RawProblem[]): Question[] {
  return problems.map((problem) => {
    const category = problem.category ?? 'General'
    const optionAFallback = buildFallbackOutcome(problem.effects.A.life)
    const optionBFallback = buildFallbackOutcome(problem.effects.B.life)

    return {
      island: mapCategoryToIsland(category),
      category,
      title: problem.title ?? `Problem ${problem.id}`,
      text: problem.question,
      options: [
        {
          text: capitalizeFirstLetter(problem.options.A),
          deltaLife: problem.effects.A.life,
          deltaMoney: problem.effects.A.coin,
          deltaTurns: problem.effects.A.turn ?? (problem.effects.A.skip_next_turn ? -1 : 0),
          feedbackLabel: problem.outcomes?.A?.feedbackLabel ?? optionAFallback.feedbackLabel,
          feedback: problem.outcomes?.A?.feedback ?? optionAFallback.feedback,
          realWorldNote: problem.outcomes?.A?.whyItMatters ?? optionAFallback.whyItMatters,
          realExample: problem.realExample ?? DEFAULT_REAL_EXAMPLE,
        },
        {
          text: capitalizeFirstLetter(problem.options.B),
          deltaLife: problem.effects.B.life,
          deltaMoney: problem.effects.B.coin,
          deltaTurns: problem.effects.B.turn ?? (problem.effects.B.skip_next_turn ? -1 : 0),
          feedbackLabel: problem.outcomes?.B?.feedbackLabel ?? optionBFallback.feedbackLabel,
          feedback: problem.outcomes?.B?.feedback ?? optionBFallback.feedback,
          realWorldNote: problem.outcomes?.B?.whyItMatters ?? optionBFallback.whyItMatters,
          realExample: problem.realExample ?? DEFAULT_REAL_EXAMPLE,
        },
      ],
    }
  })
}

const QUESTIONS: Question[] = buildQuestions(
  normalizeProblems(problemsJson as RawProblem[] | RawProblemsByCategory),
)

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
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

function StatusIcons({ current, max, symbol }: { current: number; max: number; symbol: string }) {
  return (
    <div className="icon-row">
      {Array.from({ length: max }).map((_, index) => (
        <span key={index} className={`icon ${index < current ? '' : 'empty'}`}>
          {symbol}
        </span>
      ))}
    </div>
  )
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

  const currentQuestion = useMemo(
    () => (currentQuestionIndex === null ? null : QUESTIONS[currentQuestionIndex]),
    [currentQuestionIndex],
  )
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
          <section className="intro-layout">
            <div className="step-badge">Step 1 · Mission Scroll</div>
            <div className="scroll-card">
              <div className="scroll-rim scroll-rim-top" />
              <div className="scroll-body">
                <p className="eyebrow">Island briefing</p>
                <h1 className="title">Welcome, engineer</h1>
                <div className="scroll-copy">
                  {INTRO_PARAGRAPHS.map((paragraph) => (
                    <p key={paragraph} className="scroll-text">
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div className="intro-actions">
                  <button onClick={startNewGame} className="primary-btn">
                    Start new game
                  </button>
                  <button
                    onClick={continueSavedGame}
                    className="secondary-btn"
                    disabled={!canContinue}
                  >
                    Continue previous progress
                  </button>
                </div>
              </div>
              <div className="scroll-rim scroll-rim-bottom" />
            </div>
          </section>
        ) : (
          <div className="card app-card island-card">
            <div className="top-actions">
              <span className="step-badge">Step 2 · Ethics Lab</span>
              <button onClick={openMissionScroll} className="secondary-btn small">
                Open mission scroll
              </button>
            </div>

            <header className="status-bar">
              <div className="status-group">
                <span className="status-label">Lives</span>
                <StatusIcons current={life} max={MAX_LIFE} symbol="❤️" />
              </div>
              <div className="status-group">
                <span className="status-label">Coins</span>
                <StatusIcons current={money} max={MAX_MONEY} symbol="🪙" />
              </div>
            </header>

            <section className={`screen ${screen === 'main' ? 'active' : ''}`}>
              <div className="screen-inner">
                <h2 className="title game-title">Assistive Robot Ethics Quest</h2>
                <p className="subtitle">
                  Design your household-assistance robot one ethical decision at a time.
                </p>

                <div className="island-progress">
                  <p className="island-current">
                    Current island: <strong>{currentIslandLabel}</strong>
                  </p>
                  <p className="island-sequence">Scope → Plan → Design → Optimize</p>
                </div>

                <div className="callout-box">
                  Hidden rewards and penalties are only revealed after you answer. Ethical choices
                  usually protect lives but consume time or budget.
                </div>

                <div className="main-actions">
                  <button
                    onClick={openRandomQuestion}
                    className="primary-btn"
                    disabled={!hasQuestionsForCurrentIsland}
                  >
                    Generate question
                  </button>
                  <button
                    onClick={crossBridge}
                    className="secondary-btn"
                    disabled={!canCrossBridge}
                  >
                    {canCrossBridge ? 'Cross bridge' : 'Final island reached'}
                  </button>
                  <div className="snake-pass-wrap">
                    <button
                      type="button"
                      onClick={useSnakePass}
                      className="snake-pass-btn"
                      disabled={life < SNAKE_PASS_LIFE_COST}
                      title={
                        life < SNAKE_PASS_LIFE_COST
                          ? `Need at least ${SNAKE_PASS_LIFE_COST} lives to use a snake pass.`
                          : `Spend ${SNAKE_PASS_LIFE_COST} lives to skip the next snake on your board.`
                      }
                    >
                      <span className="snake-pass-emoji" aria-hidden>
                        🐍
                      </span>
                      <span className="snake-pass-text">
                        <span className="snake-pass-title">Snake pass</span>
                        <span className="snake-pass-sub">
                          −{SNAKE_PASS_LIFE_COST} lives · skip one snake on the board
                        </span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className={`screen ${screen === 'question' ? 'active' : ''}`}>
              <div className="screen-inner">
                <p className="question-category">{currentQuestion?.category ?? 'Question'}</p>
                {revealedOption !== null ? <h2>{currentQuestion?.title ?? 'Question title'}</h2> : null}
                <p className="question-text">{currentQuestion?.text ?? ''}</p>

                {revealedOption === null ? (
                  <>
                    <div className="options">
                      {currentQuestion?.options.map((option, index) => (
                        <button
                          key={option.text}
                          className="option-btn"
                          onClick={() => chooseOption(index)}
                        >
                          <div className="option-main">{option.text}</div>
                        </button>
                      ))}
                    </div>

                    <button onClick={() => setScreen('main')} className="secondary-btn small">
                      Back to overview
                    </button>
                  </>
                ) : (
                  <div className="answer-feedback">
                    <div className="feedback-badge">{revealedOption.feedbackLabel}</div>
                    <p className="feedback-text">{revealedOption.feedback}</p>

                    <div className="impact-row">
                      <span className="impact-pill life-pill">
                        {revealedOption.deltaLife >= 0 ? `Lives +${revealedOption.deltaLife}` : `Lives ${revealedOption.deltaLife}`}
                      </span>
                      <span className="impact-pill coin-pill">
                        {revealedOption.deltaMoney >= 0 ? `Coins +${revealedOption.deltaMoney}` : `Coins ${revealedOption.deltaMoney}`}
                      </span>
                      {revealedOption.deltaTurns !== 0 ? (
                        <span className="impact-pill coin-pill">
                          {revealedOption.deltaTurns > 0
                            ? `Turns +${revealedOption.deltaTurns}`
                            : `Turns ${revealedOption.deltaTurns}`}
                        </span>
                      ) : null}
                    </div>

                    {revealedOption.deltaTurns < 0 ? (
                      <div className="turn-warning-banner">
                        You lose 1 turn because this ethical choice requires extra time.
                      </div>
                    ) : null}

                    <div className="real-world-note">
                      <strong>Why it matters:</strong> {revealedOption.realWorldNote}
                    </div>

                    {showRealExamples ? (
                      <div className="real-examples-box">
                        <strong>Real example:</strong>
                        <p className="real-example-title">{revealedOption.realExample.title}</p>
                        <p className="real-example-summary">{revealedOption.realExample.summary}</p>
                        <p className="real-example-meta">
                          Source: {revealedOption.realExample.source}
                          {revealedOption.realExample.url ? (
                            <>
                              {' · '}
                              <a
                                href={revealedOption.realExample.url}
                                target="_blank"
                                rel="noreferrer"
                                className="example-link"
                              >
                                Open link
                              </a>
                            </>
                          ) : null}
                        </p>
                      </div>
                    ) : null}

                    <div className="feedback-actions">
                      <button
                        onClick={() => setShowRealExamples((current) => !current)}
                        className="secondary-btn"
                      >
                        {showRealExamples ? 'Hide real example' : 'View real example'}
                      </button>

                      <button onClick={continueAfterAnswer} className="primary-btn">
                        {pendingGameOverReason ? 'See final outcome' : 'Continue'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className={`screen ${screen === 'gameover' ? 'active' : ''}`}>
              <div className="screen-inner">
                <h2>Expedition paused</h2>
                <p id="gameover-reason">{gameOverReason}</p>

                <div className="gameover-actions">
                  <button onClick={resetGame} className="primary-btn">
                    Start again
                  </button>
                  <button onClick={openMissionScroll} className="secondary-btn small">
                    Read mission scroll
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {bridgeSummary ? (
        <div className="bridge-modal-overlay" role="dialog" aria-modal="true">
          <div className="bridge-modal">
            <h3 className="bridge-title">
              Bridge crossed: {ISLAND_LABELS[bridgeSummary.fromIsland]} →{' '}
              {ISLAND_LABELS[bridgeSummary.toIsland]}
            </h3>
            <p className="bridge-subtitle">
              Reflection from {ISLAND_LABELS[bridgeSummary.fromIsland]} island answers.
            </p>

            {bridgeSummary.answers.length === 0 ? (
              <p className="bridge-empty">
                No answered questions were recorded for this island yet.
              </p>
            ) : (
              <ul className="bridge-list">
                {bridgeSummary.answers.map((entry, index) => (
                  <li className="bridge-item" key={`${entry.questionTitle}-${index}`}>
                    <p className="bridge-question">Q{index + 1}. {entry.questionTitle}</p>
                    <p className="bridge-question-text">{entry.questionText}</p>
                    <p className="bridge-answer">
                      <strong>Your answer:</strong> {entry.answerText}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            <div className="bridge-actions">
              <button onClick={closeBridgeSummary} className="primary-btn">
                Continue on {ISLAND_LABELS[bridgeSummary.toIsland]}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
