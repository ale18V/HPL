import { useEffect, useMemo, useState } from 'react'
import './App.css'

const STORAGE_KEY = 'hpl-island-game-state'
const MAX_LIFE = 5
const MAX_MONEY = 5

type Phase = 'intro' | 'game'
type Screen = 'main' | 'question' | 'gameover'

type Option = {
  text: string
  deltaLife: number
  deltaMoney: number
  feedbackLabel: string
  feedback: string
  realWorldNote: string
}

type Question = {
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
}

const INTRO_TEXT = `Welcome engineer! Your mission, should you choose to accept it, is to design a robot to assist people with motor disabilities, i.e. patients who struggle to move, with household tasks. You will be asked various questions related to ethical considerations in different parts of this design process throughout the game. For every ethical answer you choose, you will gain a life but have to pay the financial or time cost. For every unethical shortcut you take, you will lose a life but save money or time. The snakes and ladders represent the unpredictable chance which slows down or boosts real life engineering projects. You start the game with 5 lives and 5 coins. The coins represent your fixed budget for the project, once you have spent all your coins you cannot spend more. Your objective is to be the first to make it to the end of the game with at least 1 life.`

const QUESTIONS: Question[] = [
  {
    category: 'HR / Team',
    title: 'Hiring your cousin',
    text: 'You are assembling a team to design the robot. You have a cousin who has been searching for a job for months with no success. Do you offer your cousin a spot instead of a more skilled and experienced applicant you do not know?',
    options: [
      {
        text: 'Choose the more skilled applicant using a fair hiring process',
        deltaLife: 1,
        deltaMoney: -1,
        feedbackLabel: 'Ethical choice',
        feedback: 'You protected fairness, team quality, and trust in the project, but a rigorous hiring process costs time and money.',
        realWorldNote: 'Unfair hiring can damage team performance and create resentment, especially in high-stakes engineering work.',
      },
      {
        text: 'Give the position to your cousin out of loyalty',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You saved some effort in recruitment, but you compromised fairness and may weaken the quality of the team.',
        realWorldNote: 'Nepotism can block more qualified candidates and reduce confidence in decisions across the company.',
      },
    ],
  },
  {
    category: 'HR / Team',
    title: 'Fair wages or outsourcing',
    text: 'You are on a tight budget and need to demonstrate to investors that your product is profitable. Do you recruit local applicants and pay them fair wages, or outsource work to places with weaker labor protections?',
    options: [
      {
        text: 'Recruit fairly paid workers under stronger labor standards',
        deltaLife: 1,
        deltaMoney: -1,
        feedbackLabel: 'Ethical choice',
        feedback: 'You respected workers and reduced labor exploitation, but your project budget becomes tighter.',
        realWorldNote: 'Engineering supply chains often hide labor abuses when cost-cutting is prioritized over basic worker protections.',
      },
      {
        text: 'Outsource to cut costs even if labor conditions are questionable',
        deltaLife: -2,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You saved money immediately, but accepted the risk that your profits depend on unfair labor conditions.',
        realWorldNote: 'When ethics are ignored in hiring and production, the hidden human cost is often paid by workers with the least protection.',
      },
    ],
  },
  {
    category: 'Materials',
    title: 'Sustainable marketing versus harmful extraction',
    text: 'Your marketing team wants a biodegradable material they can advertise as sustainable. But you know extracting it causes heavy pollution, harms local communities, and often involves child labor. Do you use it or choose a less marketable but more ethically sourced material at the same price?',
    options: [
      {
        text: 'Choose the more ethically sourced material',
        deltaLife: 1,
        deltaMoney: -1,
        feedbackLabel: 'Ethical choice',
        feedback: 'You avoided greenwashed ethics and reduced harm in the supply chain, even though the material is less flashy to advertise.',
        realWorldNote: 'A material can sound sustainable in marketing while still causing severe damage through extraction and labor abuse.',
      },
      {
        text: 'Use the biodegradable material anyway for easier marketing',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You gained a simple marketing story, but ignored hidden environmental and human harm behind the material.',
        realWorldNote: 'Ethical evaluation should include the full lifecycle and origin of materials, not just the final label used in advertising.',
      },
    ],
  },
  {
    category: 'Materials',
    title: 'Cheaper but less safe first version',
    text: 'You are on a very tight budget. Do you release an initial product made from cheaper, less safe materials and hope to improve later, or do you look for more funding so that even the first version is fully safe?',
    options: [
      {
        text: 'Delay and look for more funding so the first version is safe',
        deltaLife: 1,
        deltaMoney: -2,
        feedbackLabel: 'Ethical choice',
        feedback: 'You protected users from avoidable harm, but had to spend more of your limited budget to do it properly.',
        realWorldNote: 'In safety-critical products, early shortcuts can become real injuries long before future upgrades ever happen.',
      },
      {
        text: 'Release the cheaper, less safe version and hope to improve it later',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You protected short-term finances, but accepted preventable risk for users who depend on the robot.',
        realWorldNote: 'Promises to fix safety later often fail once unsafe products are already in use.',
      },
    ],
  },
  {
    category: 'Algorithm design',
    title: 'Training data diversity',
    text: 'Most available motion datasets come from able-bodied white men, which may lead to poor performance for many users with disabilities from other demographics. Do you use the cheap existing dataset or collect your own more inclusive one?',
    options: [
      {
        text: 'Collect a more diverse dataset even though it is expensive and time intensive',
        deltaLife: 1,
        deltaMoney: -2,
        feedbackLabel: 'Ethical choice',
        feedback: 'You improved fairness and performance across patient groups, but paid a real cost in time and money.',
        realWorldNote: 'Biased datasets can make systems work well for dominant groups while failing the people who most need support.',
      },
      {
        text: 'Use the existing majority dataset and hope it generalizes',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You saved resources now, but shifted the risk of poor performance onto underrepresented users.',
        realWorldNote: 'Machine learning systems regularly inherit bias from the data they are trained on.',
      },
    ],
  },
  {
    category: 'Algorithm design',
    title: 'Accent accessibility',
    text: 'Users operate the robot with voice commands. Do you spend the extra time and money to train the model on different accents, or only train on a generic American accent and hope for the best?',
    options: [
      {
        text: 'Train on many accents to improve accessibility',
        deltaLife: 1,
        deltaMoney: -1,
        feedbackLabel: 'Ethical choice',
        feedback: 'You made the robot more usable across cultures and speech patterns, at the cost of extra development effort.',
        realWorldNote: 'Speech systems often fail users with accents they were never trained to understand.',
      },
      {
        text: 'Train on one dominant accent to save time',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You simplified development, but made the product less accessible for many real users.',
        realWorldNote: 'When accessibility is ignored, exclusion becomes built into the technology itself.',
      },
    ],
  },
  {
    category: 'Testing / Reviews',
    title: 'Who gets included in testing?',
    text: 'You need to fairly compensate people who volunteer to test your robot. Do you test only on the expected majority demographic to cut costs, or invest in testing across demographics and cultures?',
    options: [
      {
        text: 'Test across demographics and compensate participants fairly',
        deltaLife: 1,
        deltaMoney: -2,
        feedbackLabel: 'Ethical choice',
        feedback: 'You increased inclusiveness and reliability, but broad testing costs more money and coordination.',
        realWorldNote: 'Products tested on narrow user groups often fail once they meet the diversity of the real world.',
      },
      {
        text: 'Test only on the majority group to reduce cost',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You reduced costs, but accepted the risk that many users will be underserved or harmed by the final design.',
        realWorldNote: 'Excluding groups from testing creates hidden failure modes that appear only after deployment.',
      },
    ],
  },
  {
    category: 'Legal / Advertisement',
    title: 'Greenwash the robot?',
    text: 'You optimized the robot for patient safety instead of full sustainability, and some materials are not biodegradable. Do you still allow the company to advertise the robot as sustainable and net-zero to attract buyers?',
    options: [
      {
        text: 'Refuse greenwashing and describe the product honestly',
        deltaLife: 1,
        deltaMoney: -1,
        feedbackLabel: 'Ethical choice',
        feedback: 'You preserved trust and truthful communication, even though the marketing pitch became less attractive.',
        realWorldNote: 'Greenwashing can boost sales in the short term while misleading buyers about real environmental impact.',
      },
      {
        text: 'Approve the sustainability claim to make the robot easier to sell',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You protected short-term marketing value, but at the cost of honesty and public trust.',
        realWorldNote: 'Once misleading sustainability claims are exposed, public confidence is hard to rebuild.',
      },
    ],
  },
  {
    category: 'Legal / Advertisement',
    title: 'Disclose risks and privacy concerns',
    text: 'The robot may still make mistakes, and it needs sensitive data about a user’s home and medical history. Do you clearly disclose these risks even if it scares some people away, or keep the messaging vague to increase adoption?',
    options: [
      {
        text: 'Clearly explain safety and privacy risks to users',
        deltaLife: 1,
        deltaMoney: -1,
        feedbackLabel: 'Ethical choice',
        feedback: 'You supported informed consent and responsible use, even though stronger disclosure may slow adoption.',
        realWorldNote: 'Users cannot meaningfully consent if known risks are hidden or softened in marketing language.',
      },
      {
        text: 'Keep the warning vague so the product seems less risky',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You reduced friction in sales, but denied users the information they need to make an informed decision.',
        realWorldNote: 'Minimizing risks in communication often shifts the real burden onto users and caregivers later.',
      },
    ],
  },
  {
    category: 'Legal / Data privacy',
    title: 'Manual anonymization',
    text: 'You know it is best practice to manually anonymize patient data so identities stay protected even after a cyberattack. Such an attack seems unlikely. Do you still hire someone to do the anonymization?',
    options: [
      {
        text: 'Hire someone to properly anonymize the data',
        deltaLife: 1,
        deltaMoney: -1,
        feedbackLabel: 'Ethical choice',
        feedback: 'You spent scarce resources to protect patients before a crisis happens, rather than after the damage is done.',
        realWorldNote: 'Data breaches become far more harmful when identifiable health information was never properly protected in the first place.',
      },
      {
        text: 'Skip manual anonymization because an attack is unlikely',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You saved money now, but left patients exposed if your security assumptions turn out to be wrong.',
        realWorldNote: 'Low-probability risks still matter when the consequences for patients are severe.',
      },
    ],
  },
  {
    category: 'Long-term impact',
    title: 'Encourage rehabilitation or dependence?',
    text: 'If patients regain motor function, they may no longer need your robot. Do you program the robot to encourage rehabilitation and independence, or quietly optimize for long-term dependence on the device?',
    options: [
      {
        text: 'Encourage rehabilitation even if users may eventually stop needing the robot',
        deltaLife: 1,
        deltaMoney: -1,
        feedbackLabel: 'Ethical choice',
        feedback: 'You prioritized patient well-being and independence over the chance of more future sales.',
        realWorldNote: 'Ethical healthcare technologies should support the user’s real interests, even when those interests reduce profit.',
      },
      {
        text: 'Design for long-term dependence to protect future sales',
        deltaLife: -1,
        deltaMoney: 0,
        feedbackLabel: 'Unethical shortcut',
        feedback: 'You favored business incentives over patient autonomy and recovery.',
        realWorldNote: 'When commercial goals conflict with recovery, patients can be nudged toward dependence instead of empowerment.',
      },
    ],
  },
]

const defaultState: GameState = {
  phase: 'intro',
  screen: 'main',
  life: MAX_LIFE,
  money: MAX_MONEY,
  currentQuestionIndex: null,
  revealedOptionIndex: null,
  pendingGameOverReason: '',
  gameOverReason: '',
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function loadState(): GameState {
  if (typeof window === 'undefined') {
    return defaultState
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return defaultState
    }

    const parsed = JSON.parse(raw) as Partial<GameState>

    return {
      phase: parsed.phase === 'game' ? 'game' : 'intro',
      screen:
        parsed.screen === 'question' || parsed.screen === 'gameover' ? parsed.screen : 'main',
      life: clamp(Number(parsed.life ?? MAX_LIFE), 0, MAX_LIFE),
      money: clamp(Number(parsed.money ?? MAX_MONEY), 0, MAX_MONEY),
      currentQuestionIndex:
        typeof parsed.currentQuestionIndex === 'number' &&
        parsed.currentQuestionIndex >= 0 &&
        parsed.currentQuestionIndex < QUESTIONS.length
          ? parsed.currentQuestionIndex
          : null,
      revealedOptionIndex:
        typeof parsed.revealedOptionIndex === 'number' &&
        parsed.currentQuestionIndex !== null &&
        parsed.revealedOptionIndex >= 0 &&
        parsed.revealedOptionIndex < QUESTIONS[parsed.currentQuestionIndex].options.length
          ? parsed.revealedOptionIndex
          : null,
      pendingGameOverReason:
        typeof parsed.pendingGameOverReason === 'string' ? parsed.pendingGameOverReason : '',
      gameOverReason: typeof parsed.gameOverReason === 'string' ? parsed.gameOverReason : '',
    }
  } catch {
    return defaultState
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
  const initialState = useMemo(loadState, [])
  const [phase, setPhase] = useState<Phase>(initialState.phase)
  const [screen, setScreen] = useState<Screen>(initialState.screen)
  const [life, setLife] = useState(initialState.life)
  const [money, setMoney] = useState(initialState.money)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(
    initialState.currentQuestionIndex,
  )
  const [revealedOptionIndex, setRevealedOptionIndex] = useState<number | null>(
    initialState.revealedOptionIndex,
  )
  const [pendingGameOverReason, setPendingGameOverReason] = useState(
    initialState.pendingGameOverReason,
  )
  const [gameOverReason, setGameOverReason] = useState(initialState.gameOverReason)

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

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        phase,
        screen,
        life,
        money,
        currentQuestionIndex,
        revealedOptionIndex,
        pendingGameOverReason,
        gameOverReason,
      } satisfies GameState),
    )
  }, [
    phase,
    screen,
    life,
    money,
    currentQuestionIndex,
    revealedOptionIndex,
    pendingGameOverReason,
    gameOverReason,
  ])

  const openRandomQuestion = () => {
    const index = Math.floor(Math.random() * QUESTIONS.length)
    setCurrentQuestionIndex(index)
    setRevealedOptionIndex(null)
    setPendingGameOverReason('')
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
    setScreen('main')
  }

  const startGame = () => {
    setPhase('game')
    setScreen('main')
  }

  const openMissionScroll = () => {
    setPhase('intro')
  }

  const resetGame = () => {
    setLife(MAX_LIFE)
    setMoney(MAX_MONEY)
    setCurrentQuestionIndex(null)
    setRevealedOptionIndex(null)
    setPendingGameOverReason('')
    setGameOverReason('')
    setScreen('main')
    setPhase('game')
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
                  <button onClick={startGame} className="primary-btn">
                    Play
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

                <div className="callout-box">
                  Hidden rewards and penalties are only revealed after you answer. Ethical choices
                  usually protect lives but consume time or budget.
                </div>

                <button onClick={openRandomQuestion} className="primary-btn">
                  Generate question
                </button>
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

                    <button onClick={continueAfterAnswer} className="primary-btn">
                      {pendingGameOverReason ? 'See final outcome' : 'Continue'}
                    </button>
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
    </div>
  )
}

export default App
