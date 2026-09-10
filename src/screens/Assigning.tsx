import { Screen } from '../components/Screen';

/**
 * Shown while the assignment endpoint is queried. Deliberately says nothing
 * about conditions or studies — it reads as an ordinary loading state.
 */
export function Assigning(): JSX.Element {
  return (
    <Screen>
      <div className="min-h-[50dvh] flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full border-2 border-neutral-300 border-t-neutral-800 animate-spin"
          role="status"
          aria-label="Loading"
        />
      </div>
    </Screen>
  );
}
