import { useEffect, useMemo, useState } from 'react'
import './App.css'
import problemsJson from '../problems.json'

const STORAGE_KEY = 'hpl-island-game-state'
const MAX_LIFE = 5
const MAX_MONEY = 5

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
}

type RawEffect = {
  life: number
  coin: number
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

const INTRO_TEXT = `Welcome engineer! Your mission, should you choose to accept it, is to design a robot to assist people with motor disabilities, i.e. patients who struggle to move, with household tasks. You will be asked various questions related to ethical considerations in different parts of this design process throughout the game. For every ethical answer you choose, you will gain a life but have to pay the financial or time cost. For every unethical shortcut you take, you will lose a life but save money or time. The snakes and ladders represent the unpredictable chance which slows down or boosts real life engineering projects. You start the game with 5 lives and 5 coins. The coins represent your fixed budget for the project, once you have spent all your coins you cannot spend more. Your objective is to be the first to make it to the end of the game with at least 1 life.`

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

function getRealExample(problemId: number) {
  const examples: Record<
    number,
    {
      title: string
      summary: string
      source: string
      url?: string
    }
  > = {
    1: {
      title: 'Ekso Bionics and Shepherd Center rehabilitation partnership',
      summary:
        'In 2024, Ekso Bionics announced a research partnership with Shepherd Center to use exoskeleton devices in rehabilitation and community settings, explicitly framing the technology around patient recovery and quality of life.',
      source: 'Ekso Bionics',
      url: 'https://ir.eksobionics.com/press-releases/detail/761/ekso-bionics-announces-research-partnership-with-shepherd',
    },
    2: {
      title: 'Ekso Bionics and Shepherd Center rehabilitation partnership',
      summary:
        'This partnership is a concrete example of assistive robotics being adopted to support rehabilitation goals rather than long-term dependence on the device itself.',
      source: 'Ekso Bionics',
      url: 'https://ir.eksobionics.com/press-releases/detail/761/ekso-bionics-announces-research-partnership-with-shepherd',
    },
    3: {
      title: 'Cornell University anti-nepotism policy',
      summary:
        'Cornell’s policy explicitly bars family or personal relationships from influencing hiring, supervision, promotion, or performance decisions, showing how institutions formalize merit-based staffing.',
      source: 'Cornell University',
      url: 'https://policy.cornell.edu/policy-library/avoiding-nepotism',
    },
    4: {
      title: 'Apple supplier responsibility program',
      summary:
        'Apple requires suppliers to follow a code covering labor and human rights and says it conducts regular assessments before and during production, reflecting a real-world response to outsourcing and labor-risk scrutiny.',
      source: 'Apple',
      url: 'https://www.apple.com/supplier-responsibility/',
    },
    5: {
      title: 'FTC action against Kohl’s and Walmart over “bamboo” claims',
      summary:
        'The FTC alleged the companies falsely marketed rayon textiles as bamboo and as environmentally friendly, even though the manufacturing process involved toxic chemicals and hazardous pollutants.',
      source: 'U.S. Federal Trade Commission',
      url: 'https://www.ftc.gov/news-events/news/press-releases/2022/04/ftc-uses-penalty-offense-authority-seek-largest-ever-civil-penalty-bogus-bamboo-marketing-kohls',
    },
    6: {
      title: 'Philips sleep apnea machine recall',
      summary:
        'The FDA says Philips recalled millions of CPAP and BiPAP devices after foam used inside the machines could break down and create serious health risks, illustrating how material safety shortcuts can trigger major harm and remediation.',
      source: 'U.S. Food and Drug Administration',
      url: 'https://www.fda.gov/medical-devices/recalled-philips-ventilators-bipap-machines-and-cpap-machines/recommendations-recalled-philips-ventilators-bipap-machines-and-cpap-machines',
    },
    7: {
      title: 'NIST demographic-effects study on face recognition',
      summary:
        'NIST reported that many face-recognition systems showed demographic performance differences, a concrete example of how narrow or imbalanced data can change who gets accurate results.',
      source: 'National Institute of Standards and Technology',
      url: 'https://www.nist.gov/news-events/news/2019/12/nist-study-evaluates-effects-race-age-sex-face-recognition-software',
    },
    8: {
      title: 'External validation of Epic’s proprietary sepsis model',
      summary:
        'A University of Michigan study found that a widely deployed proprietary Epic sepsis model had poor discrimination and calibration, strengthening the case for transparency and independent review of black-box systems.',
      source: 'PubMed / JAMA Internal Medicine',
      url: 'https://pubmed.ncbi.nlm.nih.gov/34152373/',
    },
    9: {
      title: 'Stanford study on speech recognition disparities',
      summary:
        'Stanford researchers found major automated speech-recognition systems made roughly twice as many errors for Black speakers as for white speakers, showing why accent and dialect coverage matters in voice interfaces.',
      source: 'Stanford Report',
      url: 'https://news.stanford.edu/stories/2020/03/automated-speech-recognition-less-accurate-blacks',
    },
    10: {
      title: 'FDA guidance on diversity in clinical trial populations',
      summary:
        'The FDA’s guidance calls for more representative study populations so safety and effectiveness reflect the people who will actually use a product, matching the logic behind broader testing across demographics.',
      source: 'U.S. Food and Drug Administration',
      url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/enhancing-diversity-clinical-trial-populations-eligibility-criteria-enrollment-practices-and-trial',
    },
    11: {
      title: 'Change Healthcare cyberattack',
      summary:
        'HHS says the Change Healthcare ransomware incident ultimately affected roughly 192.7 million individuals, a concrete reminder that health-data privacy failures can scale into national-level harm.',
      source: 'U.S. Department of Health & Human Services',
      url: 'https://www.hhs.gov/hipaa/for-professionals/special-topics/change-healthcare-cybersecurity-incident-frequently-asked-questions/index.html',
    },
    12: {
      title: 'FDA transparency principles for machine-learning medical devices',
      summary:
        'The FDA, Health Canada, and the UK MHRA now explicitly emphasize transparency and clear user information for machine-learning medical devices, reflecting a real regulatory push against hiding meaningful risk behind opaque messaging.',
      source: 'U.S. Food and Drug Administration',
      url: 'https://www.fda.gov/medical-devices/software-medical-device-samd/transparency-machine-learning-enabled-medical-devices-guiding-principles',
    },
    13: {
      title: 'UK CMA greenwashing action against ASOS, Boohoo, and George at Asda',
      summary:
        'In 2024, the CMA secured formal undertakings from these brands to make environmental claims more accurate and specific, showing regulators now act when “sustainable” messaging outruns the evidence.',
      source: 'UK Competition and Markets Authority',
      url: 'https://www.gov.uk/government/news/green-claims-cma-secures-landmark-changes-from-asos-boohoo-and-asda',
    },
    14: {
      title: 'Philips recall and ongoing FDA oversight',
      summary:
        'The Philips CPAP/BiPAP recall shows that when a medical device causes foreseeable harm, manufacturers can face recalls, remediation obligations, and prolonged regulatory scrutiny rather than simply disclaiming responsibility.',
      source: 'U.S. Food and Drug Administration',
      url: 'https://www.fda.gov/medical-devices/recalled-philips-ventilators-bipap-machines-and-cpap-machines/recommendations-recalled-philips-ventilators-bipap-machines-and-cpap-machines',
    },
  }

  return (
    examples[problemId] ?? {
      title: 'Documented ethics and safety review',
      summary:
        'Organizations in high-risk domains often create documented review processes so tradeoffs in safety, fairness, and accountability are explicit rather than hidden.',
      source: 'General governance practice',
    }
  )
}

function buildFeedback(problemId: number, questionText: string, optionText: string, deltaLife: number): {
  label: string
  feedback: string
  whyItMatters: string
  realExample: {
    title: string
    summary: string
    source: string
    url?: string
  }
} {
  const context = `${questionText} ${optionText}`.toLowerCase()
  const isEthical = deltaLife > 0
  const realExample = getRealExample(problemId)

  if (context.includes('dependent') || context.includes('rehabilitation')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You treated the robot as a support tool for recovery instead of a way to lock users into dependence.',
          whyItMatters:
            'Assistive technology should expand a patient’s autonomy and long-term capability, not quietly undermine rehabilitation for business reasons.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You prioritized retention or convenience over the user’s chance to regain independence.',
          whyItMatters:
            'When a product is designed around dependence, the business wins at the expense of the patient’s long-term interests.',
          realExample,
        }
  }

  if (context.includes('cousin') || context.includes('applicant')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You chose merit and fairness over personal loyalty, which protects team quality and trust.',
          whyItMatters:
            'In technical work, weak hiring standards can become safety, quality, and accountability problems later in the project.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You protected a personal relationship, but weakened fairness and risked lowering the team’s competence.',
          whyItMatters:
            'Nepotism sends the message that standards can be bent when pressure or personal ties are involved.',
          realExample,
        }
  }

  if (context.includes('labor') || context.includes('fair wage') || context.includes('outsource')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You avoided pushing the project’s financial pressure onto workers with weaker protections.',
          whyItMatters:
            'Ethical product development includes how the work gets done, not only what the finished device looks like.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You improved the business case on paper, but only by shifting harm and risk onto more vulnerable workers.',
          whyItMatters:
            'Cheap production is not ethically cheap if the real cost is being absorbed through poor labor conditions.',
          realExample,
        }
  }

  if (
    context.includes('biodegradable') ||
    context.includes('child labor') ||
    context.includes('greenwash')
  ) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You looked beyond the marketing label and judged the full supply chain impact of the material decision.',
          whyItMatters:
            'A material can sound sustainable in advertising while still causing environmental destruction or labor abuse upstream.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You chose the cleaner marketing story rather than the cleaner ethical record.',
          whyItMatters:
            'When teams optimize only for what can be advertised, real environmental and human harm becomes easier to ignore.',
          realExample,
        }
  }

  if (context.includes('safe') || context.includes('funding')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You kept safety as a launch requirement instead of treating it as something to patch later.',
          whyItMatters:
            'Early shortcuts in safety-critical products often turn into real injuries before future improvements ever arrive.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You protected short-term momentum by asking early users to absorb risks that should have been designed out first.',
          whyItMatters:
            'Budget pressure does not make preventable safety risk ethically neutral.',
          realExample,
        }
  }

  if (context.includes('dataset') || context.includes('demographics') || context.includes('data')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You invested in representativeness rather than assuming the default data would work equally well for everyone.',
          whyItMatters:
            'Biased datasets often create systems that perform best for already dominant groups and worse for the people who most need support.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You saved time by assuming convenience data would generalize, which pushes the error burden onto underrepresented users.',
          whyItMatters:
            'Dataset bias is not abstract: it changes who gets reliable performance and who gets exclusion or harm.',
          realExample,
        }
  }

  if (context.includes('open source') || context.includes('blackbox')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You accepted more scrutiny in exchange for better transparency, accountability, and public trust.',
          whyItMatters:
            'For systems that affect health and autonomy, outside review can expose weaknesses that internal teams miss.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You protected competitive advantage, but made it harder for users and reviewers to question how the system behaves.',
          whyItMatters:
            'Black-box systems weaken accountability when outputs appear unfair, unsafe, or misleading.',
          realExample,
        }
  }

  if (context.includes('accent') || context.includes('voice')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You treated accessibility as a core design requirement instead of assuming users should adapt to the model.',
          whyItMatters:
            'Voice interfaces that mainly understand dominant accents can silently exclude many legitimate users.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You reduced development effort, but only by making the system less accessible for many real users.',
          whyItMatters:
            'Accessibility failures often get misread as user error when the real problem is a narrow design assumption.',
          realExample,
        }
  }

  if (context.includes('test your device') || context.includes('majority demographic')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You paid for broader evidence instead of letting the majority user stand in for everyone else.',
          whyItMatters:
            'Inclusive testing is how teams discover hidden failure modes before real users do.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You lowered study cost by excluding people whose needs may differ from the assumed default user.',
          whyItMatters:
            'Under-testing does not remove risk; it simply delays when and on whom the risk appears.',
          realExample,
        }
  }

  if (context.includes('anonymise') || context.includes('anonymization') || context.includes('cybersecurity')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You spent scarce resources before an incident happened instead of after the damage was already done.',
          whyItMatters:
            'Privacy protection matters most before a breach, because leaked health data is extremely hard to take back.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You treated low probability as low importance, even though the downside for patients could be severe and long-lasting.',
          whyItMatters:
            'Rare events still deserve preparation when they can expose identities, health conditions, and home information.',
          realExample,
        }
  }

  if (context.includes('legal jargon') || context.includes('privacy concerns') || context.includes('known risks')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You chose informed consent over a smoother sales message, giving users a fairer basis for trust.',
          whyItMatters:
            'Users cannot meaningfully consent if safety and privacy risks are hidden, softened, or buried in unreadable language.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You reduced friction in adoption by making serious risks harder to understand.',
          whyItMatters:
            'Unreadable or incomplete warnings shift responsibility onto users without truly informing them.',
          realExample,
        }
  }

  if (context.includes('use at your own risk') || context.includes('legal responsibility')) {
    return isEthical
      ? {
          label: 'Ethical choice',
          feedback:
            'You accepted accountability for foreseeable harm caused by the product, which creates pressure to build and support it more responsibly.',
          whyItMatters:
            'Teams design differently when failure has real consequences for them too, not only for the user.',
          realExample,
        }
      : {
          label: 'Unethical shortcut',
          feedback:
            'You shifted the burden of failure onto users who are least able to absorb the medical and financial consequences.',
          whyItMatters:
            'A disclaimer may reduce legal exposure, but it does not erase ethical responsibility for foreseeable damage.',
          realExample,
        }
  }

  return isEthical
    ? {
        label: 'Ethical choice',
        feedback:
          'You accepted a real project cost in order to better protect users, fairness, or trust.',
        whyItMatters:
          'Ethical design usually means refusing to hide long-term harm behind short-term efficiency.',
        realExample,
      }
    : {
        label: 'Unethical shortcut',
        feedback:
          'You protected speed, cost, or sales at the expense of user welfare, trust, or inclusion.',
        whyItMatters:
          'Shortcuts rarely remove the cost of a decision; they usually push it onto someone else later.',
        realExample,
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

function buildQuestions(problems: RawProblem[]): Question[] {
    return problems.map((problem) => {
      const category = problem.category ?? 'General'
    const optionAFeedback = buildFeedback(
      problem.id,
      problem.question,
      problem.options.A,
      problem.effects.A.life,
    )
    const optionBFeedback = buildFeedback(
      problem.id,
      problem.question,
      problem.options.B,
      problem.effects.B.life,
    )

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
          feedbackLabel: problem.outcomes?.A?.feedbackLabel ?? optionAFeedback.label,
          feedback: problem.outcomes?.A?.feedback ?? optionAFeedback.feedback,
          realWorldNote: problem.outcomes?.A?.whyItMatters ?? optionAFeedback.whyItMatters,
          realExample: problem.realExample ?? optionAFeedback.realExample,
        },
        {
          text: capitalizeFirstLetter(problem.options.B),
          deltaLife: problem.effects.B.life,
          deltaMoney: problem.effects.B.coin,
          feedbackLabel: problem.outcomes?.B?.feedbackLabel ?? optionBFeedback.label,
          feedback: problem.outcomes?.B?.feedback ?? optionBFeedback.feedback,
          realWorldNote: problem.outcomes?.B?.whyItMatters ?? optionBFeedback.whyItMatters,
          realExample: problem.realExample ?? optionBFeedback.realExample,
        },
      ],
    }
  })
}

const QUESTIONS: Question[] = buildQuestions(problemsJson as RawProblem[])

const defaultState: GameState = {
  phase: 'intro',
  screen: 'main',
  life: MAX_LIFE,
  money: MAX_MONEY,
  currentQuestionIndex: null,
  revealedOptionIndex: null,
  pendingGameOverReason: '',
  gameOverReason: '',
  currentIslandIndex: 0,
  islandAnswers: [],
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

    return {
      phase: parsed.phase === 'game' ? 'game' : 'intro',
      screen:
        parsed.screen === 'question' || parsed.screen === 'gameover' ? parsed.screen : 'main',
      life: clamp(Number(parsed.life ?? MAX_LIFE), 0, MAX_LIFE),
      money: clamp(Number(parsed.money ?? MAX_MONEY), 0, MAX_MONEY),
      currentQuestionIndex: savedQuestionIndex,
      revealedOptionIndex:
        typeof parsed.revealedOptionIndex === 'number' &&
        savedQuestionIndex !== null &&
        parsed.revealedOptionIndex >= 0 &&
        parsed.revealedOptionIndex < QUESTIONS[savedQuestionIndex].options.length
          ? parsed.revealedOptionIndex
          : null,
      pendingGameOverReason:
        typeof parsed.pendingGameOverReason === 'string' ? parsed.pendingGameOverReason : '',
      gameOverReason: typeof parsed.gameOverReason === 'string' ? parsed.gameOverReason : '',
      currentIslandIndex:
        typeof parsed.currentIslandIndex === 'number' &&
        parsed.currentIslandIndex >= 0 &&
        parsed.currentIslandIndex < ISLANDS.length
          ? parsed.currentIslandIndex
          : 0,
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
    setShowRealExamples(false)
    setBridgeSummary(null)
  }

  const startFreshGame = () => {
    setPhase('game')
    setScreen('main')
    setLife(MAX_LIFE)
    setMoney(MAX_MONEY)
    setCurrentQuestionIndex(null)
    setRevealedOptionIndex(null)
    setPendingGameOverReason('')
    setGameOverReason('')
    setCurrentIslandIndex(0)
    setIslandAnswers([])
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
  ])

  const openRandomQuestion = () => {
    const islandQuestionIndexes = QUESTIONS.map((question, index) => ({ question, index }))
      .filter(({ question }) => question.island === currentIsland)
      .map(({ index }) => index)

    if (islandQuestionIndexes.length === 0) {
      return
    }

    const randomIndex =
      islandQuestionIndexes[Math.floor(Math.random() * islandQuestionIndexes.length)]

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

    setCurrentIslandIndex((index) => index + 1)
    setCurrentQuestionIndex(null)
    setRevealedOptionIndex(null)
    setPendingGameOverReason('')
    setScreen('main')
    setBridgeSummary({ fromIsland, toIsland, answers })
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
                <p className="scroll-text">{INTRO_TEXT}</p>

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
                </div>
              </div>
            </section>

            <section className={`screen ${screen === 'question' ? 'active' : ''}`}>
              <div className="screen-inner">
                <p className="question-category">{currentQuestion?.category ?? 'Question'}</p>
                <h2>{currentQuestion?.title ?? 'Question title'}</h2>
                <p className="question-text">{currentQuestion?.text ?? ''}</p>

                {revealedOption === null ? (
                  <>
                    <p className="helper-text">Choose your answer before the costs and rewards are revealed.</p>

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
                    </div>

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
