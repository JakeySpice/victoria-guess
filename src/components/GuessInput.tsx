import { useState, type FormEvent } from 'react';
import { SCORING } from '../game/scoring';

interface Props {
  disabled: boolean;
  shakeNonce: number;
  onSubmit: (guess: string) => void;
  lastGuessWrong: boolean | null;
  remainingStrikes: number;
}

export function GuessInput({
  disabled,
  shakeNonce,
  onSubmit,
  lastGuessWrong,
  remainingStrikes,
}: Props) {
  const [value, setValue] = useState('');
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v || disabled) return;
    onSubmit(v);
    setValue('');
  };

  const wrong = lastGuessWrong === true;

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 bg-white p-3 shadow-sm ${
        wrong ? 'animate-shake' : ''
      }`}
      key={shakeNonce}
    >
      <input
        autoFocus
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Guess the town / suburb / region…"
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        Guess
      </button>
      {wrong && (
        <span className="text-sm text-rose-600">
          Wrong! {remainingStrikes} strikes left · −{SCORING.WRONG_ANSWER_PENALTY}
        </span>
      )}
    </form>
  );
}
