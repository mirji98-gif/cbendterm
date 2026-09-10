import type { ReactNode } from 'react';

/** Standard page shell for the non-storefront screens. */
export function Screen({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}): JSX.Element {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-white">
      <main className="flex-1 w-full max-w-[560px] mx-auto px-5 py-7">{children}</main>
      {footer ? (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-neutral-200">
          <div className="w-full max-w-[560px] mx-auto px-5 py-3 safe-bottom">{footer}</div>
        </div>
      ) : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}): JSX.Element {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full min-h-[52px] rounded-lg bg-neutral-900 text-white text-[15px] font-medium
                 disabled:bg-neutral-300 disabled:text-neutral-500 transition-colors
                 active:bg-neutral-700"
    >
      {children}
    </button>
  );
}

export function Heading({ children }: { children: ReactNode }): JSX.Element {
  return <h1 className="text-[21px] font-semibold leading-snug mb-3">{children}</h1>;
}
