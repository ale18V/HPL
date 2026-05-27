import { INTRO_PARAGRAPHS } from '../gameData'

type IntroScreenProps = {
  canContinue: boolean
  onStartNewGame: () => void
  onContinueSavedGame: () => void
}

export function IntroScreen({
  canContinue,
  onStartNewGame,
  onContinueSavedGame,
}: IntroScreenProps) {
  return (
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
            <p className="scroll-text manual-note">
              Need more details? <a href={`${import.meta.env.BASE_URL}manual.pdf`} target="_blank" rel="noopener noreferrer" className="manual-link">Click here for the manual</a>.
            </p>
          </div>

          <div className="intro-actions">
            <button onClick={onStartNewGame} className="primary-btn">
              Start new game
            </button>
            <button onClick={onContinueSavedGame} className="secondary-btn" disabled={!canContinue}>
              Continue previous progress
            </button>
          </div>
        </div>
        <div className="scroll-rim scroll-rim-bottom" />
      </div>
    </section>
  )
}
