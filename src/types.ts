export type Phase = 'intro' | 'game'
export type Screen = 'main' | 'question' | 'gameover'
export type IslandKey = 'scope' | 'plan' | 'design' | 'optimize'

export type IslandAnswer = {
  island: IslandKey
  questionTitle: string
  questionText: string
  answerText: string
  feedback: string
}

export type BridgeSummary = {
  fromIsland: IslandKey
  toIsland: IslandKey
  answers: IslandAnswer[]
}

export type Option = {
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
    imageUrl?: string
  }
}

export type Question = {
  island: IslandKey
  category: string
  title: string
  text: string
  options: Option[]
}

export type GameState = {
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

export type RawEffect = {
  life: number
  coin: number
  turn?: number
  skip_next_turn?: boolean
}

export type RawProblem = {
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
    imageUrl?: string
    image?: string
  }
}

export type RawProblemsByCategory = {
  _meta?: {
    islandCounts?: Partial<Record<'Scope' | 'Planning' | 'Development' | 'Optimisation', number>>
    note?: string
  }
  Scope?: RawProblem[]
  Planning?: RawProblem[]
  Development?: RawProblem[]
  Optimisation?: RawProblem[]
}
