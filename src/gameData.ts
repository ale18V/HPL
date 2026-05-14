import problemsJson from '../problems.json'
import type {
  IslandKey,
  Option,
  Question,
  RawProblem,
  RawProblemsByCategory,
} from './types'

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

export const QUESTIONS: Question[] = buildQuestions(
  normalizeProblems(problemsJson as RawProblem[] | RawProblemsByCategory),
)

export function shuffleQuestionOptions(question: Question): Question {
  if (question.options.length < 2 || Math.random() < 0.5) {
    return question
  }

  return {
    ...question,
    options: [question.options[1], question.options[0]],
  }
}

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}export const STORAGE_KEY = 'hpl-island-game-state'
export const MAX_LIFE = 7
export const MAX_MONEY = 5
/** Lives spent to skip a snake on the physical board (Snakes & Ladders tie-in). */
export const SNAKE_PASS_LIFE_COST = 3
export const STARTING_LIFE = 3
export const UNSEEN_REFRESH_THRESHOLD = 5

export const INTRO_PARAGRAPHS = [
    `Welcome engineer! Your mission, should you choose to accept it, is to design a robot to assist people with motor disabilities, i.e. patients who struggle to move, with household tasks.`,
    `You will be asked various questions related to ethical considerations in different parts of this design process throughout the game. For every ethical answer you choose, you will gain a life but have to pay the financial or time cost. For every unethical shortcut you take, you will lose a life but save money or time.`,
    `The snakes and ladders represent the unpredictable chance which slows down or boosts real life engineering projects.`,
    `You start the game with 3 lives and 5 coins. The snake pass costs 3 lives. You can hold up to 7 lives. Every time you cross a bridge to the next island, you gain 1 coin.`,
    `The coins represent your fixed budget for the project, once you have spent all your coins you cannot spend more. Your objective is to be the first to make it to the end of the game with at least 1 life.`,
]

export const ISLANDS: IslandKey[] = ['scope', 'plan', 'design', 'optimize']

export const ISLAND_LABELS: Record<IslandKey, string> = {
    scope: 'Scope',
    plan: 'Plan',
    design: 'Design',
    optimize: 'Optimize',
}

