/**
 * TeachingView — Multi-step view router for the Teaching module.
 *
 * Steps:
 *  menu               → View 1: Function selection (Extraction / Tube Pattern / Stain / Thread Mix)
 *  extraction-actions → View 2: Extraction sub-actions (Diameter Setting / Finalize & Setup)
 *  diameter-step1     → View 3: Bobbin calibration wizard
 *  diameter-step2     → View 4: Tube calibration wizard
 *  finalize           → View 5: Finalize settings + history grid
 *  tube-patterns      → View 6: Tube pattern profile grid
 *  pattern-modal      → View 7: Pattern action modal (overlaid on tube-patterns)
 */

import { useState } from 'react';
import FunctionMenu      from '../components/teaching/FunctionMenu';
import ExtractionActions from '../components/teaching/ExtractionActions';
import DiameterStep1     from '../components/teaching/DiameterStep1';
import DiameterStep2     from '../components/teaching/DiameterStep2';
import FinalizeSettings  from '../components/teaching/FinalizeSettings';
import TubePatternGrid   from '../components/teaching/TubePatternGrid';
import PatternModal      from '../components/teaching/PatternModal';

type TeachingStep =
  | 'menu'
  | 'extraction-actions'
  | 'diameter-step1'
  | 'diameter-step2'
  | 'finalize'
  | 'tube-patterns'
  | 'pattern-modal';

const PATTERN_IMAGE_COUNTS: Record<string, number> = {
  brown:           8,
  green:           23,
  'dark-brown':    5,
  'white-pattern': 4,
  testing:         1,
};

export default function TeachingView() {
  const [step, setStep]                 = useState<TeachingStep>('menu');
  const [bobbinDiameter, setBobbinDiam] = useState(190);
  const [tubeDiameter, setTubeDiam]     = useState(41);
  const [selectedPattern, setPattern]   = useState<string | null>(null);

  const go = (s: TeachingStep) => setStep(s);

  // ── Function menu selection handler ────────────────────────
  const handleFunctionSelect = (id: string) => {
    if (id === 'extraction')   go('extraction-actions');
    if (id === 'tube-pattern') go('tube-patterns');
    // Stain / Thread Mix: placeholder — back to menu for now
  };

  return (
    <>
      {/* ── View 1: Function Menu ─────────────────────────── */}
      {step === 'menu' && (
        <FunctionMenu
          onBack={() => {}}          // top-level, no parent
          onSelect={handleFunctionSelect}
        />
      )}

      {/* ── View 2: Extraction Actions ────────────────────── */}
      {step === 'extraction-actions' && (
        <ExtractionActions
          onBack={() => go('menu')}
          onDiameter={() => go('diameter-step1')}
          onFinalize={() => go('finalize')}
        />
      )}

      {/* ── View 3: Diameter Step 1 — Bobbin ─────────────── */}
      {step === 'diameter-step1' && (
        <DiameterStep1
          onBack={() => go('extraction-actions')}
          onNext={diam => {
            setBobbinDiam(diam);
            go('diameter-step2');
          }}
        />
      )}

      {/* ── View 4: Diameter Step 2 — Tube ───────────────── */}
      {step === 'diameter-step2' && (
        <DiameterStep2
          bobbinDiameter={bobbinDiameter}
          onBack={() => go('diameter-step1')}
          onSave={tube => {
            setTubeDiam(tube);
            go('finalize');
          }}
        />
      )}

      {/* ── View 5: Finalize Settings ─────────────────────── */}
      {step === 'finalize' && (
        <FinalizeSettings
          bobbinDiameter={bobbinDiameter}
          tubeDiameter={tubeDiameter}
          onBack={() => go('extraction-actions')}
          onUseForInspection={() => {
            // Settings applied — return to menu
            go('menu');
          }}
        />
      )}

      {/* ── View 6: Tube Pattern Grid ─────────────────────── */}
      {(step === 'tube-patterns' || step === 'pattern-modal') && (
        <>
          <TubePatternGrid
            onBack={() => go('menu')}
            onSelect={name => {
              setPattern(name);
              go('pattern-modal');
            }}
          />

          {/* ── View 7: Pattern Modal (overlaid) ─────────── */}
          {step === 'pattern-modal' && selectedPattern && (
            <PatternModal
              patternName={selectedPattern}
              imageCount={PATTERN_IMAGE_COUNTS[selectedPattern] ?? 0}
              onClose={() => go('tube-patterns')}
              onUseForInspection={() => go('menu')}
            />
          )}
        </>
      )}
    </>
  );
}
