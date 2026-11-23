/**
 * Shared Tailwind class tokens. The look is deliberately flat: warm off-white page,
 * white surfaces, 1px neutral hairlines, charcoal for emphasis. Change a token here to
 * restyle the whole app.
 */

/** Flat white container with a hairline border. */
export const surface = 'rounded-lg border border-neutral-200 bg-white';

/** Field styling without a height, for places that need a custom size. */
export const fieldBase =
  'rounded-md border border-neutral-200 bg-white px-3 text-sm text-ink ' +
  'placeholder:text-neutral-400 outline-none transition-colors duration-150 ' +
  'hover:border-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-900/10 [color-scheme:light]';

export const fieldClass = `h-10 ${fieldBase}`;

/** Monochrome primary action. */
export const primaryButton =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-ink px-4 text-sm font-medium text-white ' +
  'transition-colors duration-150 hover:bg-neutral-700 active:bg-neutral-800 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30 focus-visible:ring-offset-2 focus-visible:ring-offset-paper ' +
  'disabled:cursor-not-allowed disabled:opacity-30';

export const ghostIconButton =
  'rounded-md p-1.5 text-neutral-400 transition-colors duration-150 hover:bg-neutral-100 hover:text-ink ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20';

export const sectionLabel = 'text-xs font-medium text-neutral-500';

/** Shared focus ring for small interactive elements inside rows. */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/25';

/** Inline error banner. */
export const errorBanner =
  'flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700';
