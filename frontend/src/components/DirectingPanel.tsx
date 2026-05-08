import { useMemo, useState } from 'react'
import type { DirectingPlan } from '../lib/api'

interface DirectingPanelProps {
  plan: DirectingPlan | null
  script: string
  isGenerating: boolean
  error: string | null
  onGenerate: () => void
  onInsert: (content: string) => void
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n')
}

function formatDirectingPlan(plan: DirectingPlan): string {
  const sections = [
    '# Director Plan',
    '',
    '## Overview',
    plan.overview,
    '',
    '## Scene Breakdown',
    ...plan.scenes.flatMap((scene, index) => [
      `### Scene ${index + 1}: ${scene.id}`,
      `Script: "${scene.scriptExcerpt}"`,
      `Visual Goal: ${scene.visualGoal}`,
      `Location: ${scene.location}`,
      `Shots:\n${formatList(scene.shots)}`,
      `Performance: ${scene.performanceDirection}`,
      scene.props.length ? `Props:\n${formatList(scene.props)}` : 'Props: None',
      '',
    ]),
    '## B-roll',
    ...plan.bRoll.flatMap((item) => [
      `Moment: ${item.moment}`,
      `Shot: ${item.shot}`,
      `Purpose: ${item.purpose}`,
      '',
    ]),
    '## Shooting Tips',
    formatList(plan.shootingTips),
    '',
    '## Creative Ideas',
    formatList(plan.creativeIdeas),
    '',
    '## Editing Notes',
    formatList(plan.editingNotes),
  ]

  return sections.join('\n').trim()
}

export function DirectingPanel({
  plan,
  script,
  isGenerating,
  error,
  onGenerate,
  onInsert,
}: DirectingPanelProps) {
  const [copied, setCopied] = useState(false)
  const canGenerate = Boolean(script.trim()) && !isGenerating
  const formattedPlan = useMemo(() => plan ? formatDirectingPlan(plan) : '', [plan])

  const handleCopy = async () => {
    if (!formattedPlan) return
    await navigator.clipboard.writeText(formattedPlan)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <aside className="director" aria-label="Directing assistant">
      <div className="director-header">
        <div>
          <div className="director-kicker">Director</div>
          <h2>Filming plan</h2>
        </div>
        <button
          className="director-generate"
          onClick={onGenerate}
          disabled={!canGenerate}
        >
          {isGenerating ? 'Generating...' : plan ? 'Regenerate' : 'Generate plan'}
        </button>
      </div>

      {!script.trim() && (
        <div className="director-empty">
          Insert or write a script first, then generate a scene-by-scene filming plan.
        </div>
      )}

      {error && <div className="director-error">{error}</div>}

      {isGenerating && (
        <div className="director-loading">
          Building scenes, B-roll, shooting tips, and edit notes...
        </div>
      )}

      {!plan && !isGenerating && script.trim() && (
        <div className="director-empty">
          Turn the accepted script into a structured checklist with scenes, shots,
          B-roll, performance notes, and editing ideas.
        </div>
      )}

      {plan && (
        <div className="director-content">
          <section className="director-card">
            <h3>Overview</h3>
            <p>{plan.overview}</p>
          </section>

          <section className="director-card">
            <h3>Scene Breakdown</h3>
            <div className="director-scenes">
              {plan.scenes.map((scene, index) => (
                <article className="director-scene" key={`${scene.id}-${index}`}>
                  <div className="director-scene-title">
                    Scene {index + 1}: {scene.id}
                  </div>
                  <p className="director-excerpt">"{scene.scriptExcerpt}"</p>
                  <dl>
                    <dt>Visual Goal</dt>
                    <dd>{scene.visualGoal}</dd>
                    <dt>Location</dt>
                    <dd>{scene.location}</dd>
                    <dt>Shots</dt>
                    <dd>{scene.shots.join(', ')}</dd>
                    <dt>Performance</dt>
                    <dd>{scene.performanceDirection}</dd>
                    <dt>Props</dt>
                    <dd>{scene.props.length ? scene.props.join(', ') : 'None'}</dd>
                  </dl>
                </article>
              ))}
            </div>
          </section>

          <section className="director-card">
            <h3>B-roll</h3>
            <div className="director-list">
              {plan.bRoll.map((item, index) => (
                <article key={`${item.moment}-${index}`}>
                  <strong>{item.moment}</strong>
                  <span>{item.shot}</span>
                  <small>{item.purpose}</small>
                </article>
              ))}
            </div>
          </section>

          <section className="director-card">
            <h3>Shooting Tips</h3>
            <ul>{plan.shootingTips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
          </section>

          <section className="director-card">
            <h3>Creative Ideas</h3>
            <ul>{plan.creativeIdeas.map((idea) => <li key={idea}>{idea}</li>)}</ul>
          </section>

          <section className="director-card">
            <h3>Editing Notes</h3>
            <ul>{plan.editingNotes.map((note) => <li key={note}>{note}</li>)}</ul>
          </section>

          <div className="director-actions">
            <button className="msg-insert" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy plan'}
            </button>
            <button className="msg-insert" onClick={() => onInsert(formattedPlan)}>
              Insert into document
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
