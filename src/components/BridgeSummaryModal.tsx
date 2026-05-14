import { ISLAND_LABELS } from '../gameData'
import type { BridgeSummary } from '../types'

type BridgeSummaryModalProps = {
  bridgeSummary: BridgeSummary
  onClose: () => void
}

export function BridgeSummaryModal({ bridgeSummary, onClose }: BridgeSummaryModalProps) {
  return (
    <div className="bridge-modal-overlay" role="dialog" aria-modal="true">
      <div className="bridge-modal">
        <h3 className="bridge-title">
          Bridge crossed: {ISLAND_LABELS[bridgeSummary.fromIsland]} → {ISLAND_LABELS[bridgeSummary.toIsland]}
        </h3>
        <p className="bridge-subtitle">
          Reflection from {ISLAND_LABELS[bridgeSummary.fromIsland]} island answers.
        </p>

        {bridgeSummary.answers.length === 0 ? (
          <p className="bridge-empty">No answered questions were recorded for this island yet.</p>
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
          <button onClick={onClose} className="primary-btn">
            Continue on {ISLAND_LABELS[bridgeSummary.toIsland]}
          </button>
        </div>
      </div>
    </div>
  )
}
