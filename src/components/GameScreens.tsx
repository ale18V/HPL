import type { Option, Question, Screen } from '../types'

type StatusIconsProps = {
  current: number
  max: number
  symbol: string
}

function StatusIcons({ current, max, symbol }: StatusIconsProps) {
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

type GameScreensProps = {
  screen: Screen
  life: number
  money: number
  maxLife: number
  maxMoney: number
  currentIslandLabel: string
  canCrossBridge: boolean
  hasQuestionsForCurrentIsland: boolean
  snakePassLifeCost: number
  currentQuestion: Question | null
  revealedOption: Option | null
  showRealExamples: boolean
  pendingGameOverReason: string
  gameOverReason: string
  onOpenMissionScroll: () => void
  onOpenRandomQuestion: () => void
  onCrossBridge: () => void
  onUseSnakePass: () => void
  onChooseOption: (optionIndex: number) => void
  onBackToOverview: () => void
  onToggleRealExamples: () => void
  onContinueAfterAnswer: () => void
  onResetGame: () => void
}

export function GameScreens({
  screen,
  life,
  money,
  maxLife,
  maxMoney,
  currentIslandLabel,
  canCrossBridge,
  hasQuestionsForCurrentIsland,
  snakePassLifeCost,
  currentQuestion,
  revealedOption,
  showRealExamples,
  pendingGameOverReason,
  gameOverReason,
  onOpenMissionScroll,
  onOpenRandomQuestion,
  onCrossBridge,
  onUseSnakePass,
  onChooseOption,
  onBackToOverview,
  onToggleRealExamples,
  onContinueAfterAnswer,
  onResetGame,
}: GameScreensProps) {
  return (
    <div className="card app-card island-card">
      <div className="top-actions">
        <span className="step-badge">Step 2 · Ethics Lab</span>
        <button onClick={onOpenMissionScroll} className="secondary-btn small">
          Open mission scroll
        </button>
      </div>

      <header className="status-bar">
        <div className="status-group">
          <span className="status-label">Lives</span>
          <StatusIcons current={life} max={maxLife} symbol="❤️" />
        </div>
        <div className="status-group">
          <span className="status-label">Coins</span>
          <StatusIcons current={money} max={maxMoney} symbol="🪙" />
        </div>
      </header>

      <section className={`screen ${screen === 'main' ? 'active' : ''}`}>
        <div className="screen-inner">
          <h2 className="title game-title">Assistive Robot Ethics Quest</h2>
          <p className="subtitle">Design your household-assistance robot one ethical decision at a time.</p>

          <div className="island-progress">
            <p className="island-current">
              Current island: <strong>{currentIslandLabel}</strong>
            </p>
            <p className="island-sequence">Scope → Plan → Design → Optimize</p>
          </div>

          <div className="callout-box">
            Hidden rewards and penalties are only revealed after you answer. Ethical choices usually protect
            lives but consume time or budget.
          </div>

          <div className="main-actions">
            <button onClick={onOpenRandomQuestion} className="primary-btn" disabled={!hasQuestionsForCurrentIsland}>
              Generate question
            </button>
            <button onClick={onCrossBridge} className="secondary-btn" disabled={!canCrossBridge}>
              {canCrossBridge ? 'Cross bridge' : 'Final island reached'}
            </button>
            <div className="snake-pass-wrap">
              <button
                type="button"
                onClick={onUseSnakePass}
                className="snake-pass-btn"
                disabled={life < snakePassLifeCost}
                title={
                  life < snakePassLifeCost
                    ? `Need at least ${snakePassLifeCost} lives to use a snake pass.`
                    : `Spend ${snakePassLifeCost} lives to skip the next snake on your board.`
                }
              >
                <span className="snake-pass-emoji" aria-hidden>
                  🐍
                </span>
                <span className="snake-pass-text">
                  <span className="snake-pass-title">Snake pass</span>
                  <span className="snake-pass-sub">-{snakePassLifeCost} lives · skip one snake on the board</span>
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
                  <button key={option.text} className="option-btn" onClick={() => onChooseOption(index)}>
                    <div className="option-main">{option.text}</div>
                  </button>
                ))}
              </div>

              <button onClick={onBackToOverview} className="secondary-btn small">
                Back to overview
              </button>
            </>
          ) : (
            <div className="answer-feedback">
              <div className="feedback-badge">{revealedOption.feedbackLabel}</div>
              <p className="feedback-text">{revealedOption.feedback}</p>

              <div className="impact-row">
                <span className="impact-pill life-pill">
                  {revealedOption.deltaLife >= 0
                    ? `Lives +${revealedOption.deltaLife}`
                    : `Lives ${revealedOption.deltaLife}`}
                </span>
                <span className="impact-pill coin-pill">
                  {revealedOption.deltaMoney >= 0
                    ? `Coins +${revealedOption.deltaMoney}`
                    : `Coins ${revealedOption.deltaMoney}`}
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
                <button onClick={onToggleRealExamples} className="secondary-btn">
                  {showRealExamples ? 'Hide real example' : 'View real example'}
                </button>

                <button onClick={onContinueAfterAnswer} className="primary-btn">
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
            <button onClick={onResetGame} className="primary-btn">
              Start again
            </button>
            <button onClick={onOpenMissionScroll} className="secondary-btn small">
              Read mission scroll
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
