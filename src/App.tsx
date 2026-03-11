import { useState } from 'react'
import './App.css'

const MAX_LIFE = 5
const MAX_MONEY = 5

type Option = {
  text: string
  impact: string
  deltaLife: number
  deltaMoney: number
}

type Question = {
  title: string
  text: string
  options: Option[]
}

const QUESTIONS: Question[] = [
  {
    title: 'Safety training budget',
    text: 'You are starting a high‑rise construction project. The safety team suggests a full day of on‑site safety training, which will increase both cost and schedule.',
    options: [
      {
        text: 'Approve the full training and pay overtime',
        impact: 'Life -0, Budget -2 (safer but more expensive)',
        deltaLife: 0,
        deltaMoney: -2,
      },
      {
        text: 'Run a half‑day online training only',
        impact: 'Life -1, Budget -1 (some training but reduced)',
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: 'Skip formal training and send a slide deck',
        impact: 'Life -2, Budget 0 (cheaper, but big safety risk)',
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
  {
    title: 'Choosing structural materials',
    text: 'You must decide the grade of concrete and steel for the main structure. Safer and lower‑carbon materials are more expensive.',
    options: [
      {
        text: 'Use high‑strength, low‑carbon materials and extra inspections',
        impact: 'Life -0, Budget -2 (high standard, higher cost)',
        deltaLife: 0,
        deltaMoney: -2,
      },
      {
        text: 'Use standard materials at the minimum code requirement',
        impact: 'Life -1, Budget -1 (barely compliant)',
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: 'Pick the cheapest supplier and simplify inspections',
        impact: 'Life -2, Budget 0 (short‑term savings, long‑term risk)',
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
  {
    title: 'Site environmental impact',
    text: 'Noise and dust from the site are causing complaints from nearby residents. You need to respond.',
    options: [
      {
        text: 'Invest in noise barriers and misting systems',
        impact: 'Life -0, Budget -2 (better environment, higher cost)',
        deltaLife: 0,
        deltaMoney: -2,
      },
      {
        text: 'Adjust work hours and slightly reduce night shifts',
        impact: 'Life -1, Budget -1 (some improvement)',
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: 'Keep the current plan and only communicate verbally',
        impact: 'Life -2, Budget 0 (pollution continues, public risk)',
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
  {
    title: 'Delay and acceleration',
    text: 'Design changes have delayed the project. The client still wants the original completion date, or there will be penalties.',
    options: [
      {
        text: 'Negotiate for a schedule extension and keep normal workload',
        impact: 'Life -0, Budget -1 (negotiation costs time and money)',
        deltaLife: 0,
        deltaMoney: -1,
      },
      {
        text: 'Add moderate overtime, slightly cutting rest time',
        impact: 'Life -1, Budget -1 (affects health and cost)',
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: 'Aggressively accelerate with long night shifts',
        impact: 'Life -2, Budget 0 (severe health and safety impact)',
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
  {
    title: 'Emergency preparedness investment',
    text: 'Safety consultants recommend a full emergency system: drills, backup equipment, and supplies.',
    options: [
      {
        text: 'Invest fully with regular drills and updated supplies',
        impact: 'Life -0, Budget -2 (safest but expensive)',
        deltaLife: 0,
        deltaMoney: -2,
      },
      {
        text: 'Keep only the most critical drills and supplies',
        impact: 'Life -1, Budget -1 (basically sufficient)',
        deltaLife: -1,
        deltaMoney: -1,
      },
      {
        text: 'Postpone investment and keep plans on paper only',
        impact: 'Life -2, Budget 0 (weak in real emergencies)',
        deltaLife: -2,
        deltaMoney: 0,
      },
    ],
  },
]

type Screen = 'main' | 'question' | 'gameover'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
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
  const [life, setLife] = useState(MAX_LIFE)
  const [money, setMoney] = useState(MAX_MONEY)
  const [screen, setScreen] = useState<Screen>('main')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [gameOverReason, setGameOverReason] = useState('')

  const openRandomQuestion = () => {
    const index = Math.floor(Math.random() * QUESTIONS.length)
    setCurrentQuestion(QUESTIONS[index])
    setScreen('question')
  }

  const chooseOption = (option: Option) => {
    const updatedLife = clamp(life + option.deltaLife, 0, MAX_LIFE)
    const updatedMoney = clamp(money + option.deltaMoney, 0, MAX_MONEY)

    setLife(updatedLife)
    setMoney(updatedMoney)

    if (updatedLife <= 0 || updatedMoney <= 0) {
      const reasons: string[] = []
      if (updatedLife <= 0) {
        reasons.push(
          'You pushed safety and environmental impact too far. The project is shut down.',
        )
      }
      if (updatedMoney <= 0) {
        reasons.push('The project has completely run out of budget.')
      }

      setGameOverReason(
        `${reasons.join(' ')} This is a tough lesson. Next time, try to balance life and budget more carefully.`,
      )
      setScreen('gameover')
      return
    }

    setScreen('main')
  }

  const resetGame = () => {
    setLife(MAX_LIFE)
    setMoney(MAX_MONEY)
    setCurrentQuestion(null)
    setGameOverReason('')
    setScreen('main')
  }

  return (
    <div className="app">
      <main>
        <div className="card app-card">
          <header className="status-bar">
            <div className="status-group">
              <span className="status-label">Life</span>
              <StatusIcons current={life} max={MAX_LIFE} symbol="❤️" />
            </div>
            <div className="status-group">
              <span className="status-label">Budget</span>
              <StatusIcons current={money} max={MAX_MONEY} symbol="💰" />
            </div>
          </header>

          <section className={`screen ${screen === 'main' ? 'active' : ''}`}>
            <div className="screen-inner">
              <h1 className="title">Construction Project Choices</h1>
              <p className="subtitle">
                You are leading a construction project and must balance people&apos;s safety and
                environmental impact with a limited budget.
              </p>
              <button onClick={openRandomQuestion} className="primary-btn">
                Start / Next decision
              </button>
            </div>
          </section>

          <section className={`screen ${screen === 'question' ? 'active' : ''}`}>
            <div className="screen-inner">
              <h2>{currentQuestion?.title ?? 'Question title'}</h2>
              <p className="question-text">{currentQuestion?.text ?? ''}</p>

              <div className="options">
                {currentQuestion?.options.map((option) => (
                  <button
                    key={option.text}
                    className="option-btn"
                    onClick={() => chooseOption(option)}
                  >
                    <div className="option-main">{option.text}</div>
                    <div className="option-impact">{option.impact}</div>
                  </button>
                ))}
              </div>

              <button onClick={() => setScreen('main')} className="secondary-btn small">
                Back to overview (no choice)
              </button>
            </div>
          </section>

          <section className={`screen ${screen === 'gameover' ? 'active' : ''}`}>
            <div className="screen-inner">
              <h2>Project stopped</h2>
              <p id="gameover-reason">{gameOverReason}</p>
              <button onClick={resetGame} className="primary-btn">
                Start again
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
