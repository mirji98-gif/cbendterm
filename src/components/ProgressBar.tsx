/**
 * Questionnaire progress.
 *
 * Rendered ONLY on questionnaire screens (non-negotiable #5). A progress
 * indicator during the shopping task would announce "this is a study with a
 * fixed number of stages" and destroy the cover story. src/machine/steps.ts
 * `showProgress` is the single gate; this component never decides for itself.
 */
export function ProgressBar({ fraction }: { fraction: number }): JSX.Element {
  return (
    <div className="sticky top-0 z-20 h-1 bg-neutral-200" aria-hidden="true">
      <div
        className="h-full bg-neutral-800 transition-[width] duration-300"
        style={{ width: `${Math.round(fraction * 100)}%` }}
      />
    </div>
  );
}
