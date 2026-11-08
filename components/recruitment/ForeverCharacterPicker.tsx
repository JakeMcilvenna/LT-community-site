'use client';

import { ChevronDown, LoaderCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { VerifiedForeverCharacter } from '@/lib/battlenet/types';
import { FOREVER_CHARACTER_NAME_HINT, FOREVER_CHARACTER_NAME_PATTERN, isValidForeverCharacterName } from '@/lib/recruitment-validation';

const inputClass = 'w-full rounded-[0.5rem] border border-[#79c9c2]/20 bg-[#071312]/88 px-3.5 py-3 text-sm text-[#eef9f6] placeholder:text-[#66817d] transition-colors hover:border-[#79c9c2]/35 focus:border-[#8ee0d6] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';
const actionClass = 'min-h-9 text-xs font-bold text-[#8ee0d6] underline decoration-[#79c9c2]/40 underline-offset-4 hover:decoration-[#8ee0d6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8ee0d6] disabled:opacity-60';

type CharacterListState =
  | { status: 'loading'; characters: VerifiedForeverCharacter[]; error: '' }
  | { status: 'ready'; characters: VerifiedForeverCharacter[]; error: '' }
  | { status: 'error'; characters: VerifiedForeverCharacter[]; error: string };

export function ForeverCharacterPicker({ connected, disabled }: { connected: boolean; disabled: boolean }) {
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [selectedName, setSelectedName] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [list, setList] = useState<CharacterListState>({ status: 'loading', characters: [], error: '' });
  const usePicker = connected && !manual;

  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    void fetch('/api/battlenet/forever-characters', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { characters?: VerifiedForeverCharacter[]; error?: string };
        if (!response.ok || !Array.isArray(body.characters)) throw new Error(body.error || 'Forever characters could not be loaded.');
        if (controller.signal.aborted) return;
        const characters = body.characters;
        setList({ status: 'ready', characters, error: '' });
        setSelectedName((name) => characters.some((character) => character.fullName === name) ? name : '');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setList({ status: 'error', characters: [], error: error instanceof Error ? error.message : 'Forever characters could not be loaded.' });
      });
    return () => controller.abort();
  }, [connected, refresh]);

  const selected = usePicker && list.status === 'ready'
    ? list.characters.find((character) => character.fullName === selectedName)
    : undefined;

  return (
    <div>
      <label htmlFor='foreverCharacterName' className='mb-2 block text-sm font-bold text-[var(--foreground)]'>
        Character name <span className='text-[#8ee0d6]'>*</span>
      </label>
      <p id='foreverCharacterHint' className='mb-2 text-xs leading-5 text-[#839d98]'>
        {usePicker ? 'Choose a character from your Battle.net account.' : 'First and last name, 2–12 letters each.'}
      </p>
      <input type='hidden' name='characterSource' value={usePicker ? 'battlenet' : 'manual'} />
      {usePicker ? (
        <>
          <div className='relative'>
            <select id='foreverCharacterName' name='characterName' required value={selected?.fullName ?? ''}
              aria-describedby='foreverCharacterHint foreverCharacterStatus' aria-busy={list.status === 'loading'}
              onChange={(event) => setSelectedName(event.currentTarget.value)} disabled={disabled}
              className={`${inputClass} appearance-none pr-10`}>
              <option value=''>{list.status === 'loading' ? 'Loading Forever characters…' : 'Select your Forever character'}</option>
              {list.status === 'ready' ? list.characters.map((character) => (
                <option key={`${character.id}:${character.fullName}`} value={character.fullName}>
                  {character.fullName} — Level {character.level}{character.className ? ` ${character.className}` : ''}
                </option>
              )) : null}
            </select>
            <ChevronDown aria-hidden='true' size={16} className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8ee0d6]' />
          </div>
          <div id='foreverCharacterStatus' className='mt-2 text-xs leading-5' aria-live='polite'>
            {list.status === 'loading' ? <p className='flex items-center gap-2 text-[#839d98]'><LoaderCircle aria-hidden='true' size={14} className='animate-spin' /> Loading your characters…</p>
              : list.status === 'error' ? <p className='text-[#efa39d]'>{list.error}</p>
                : list.characters.length === 0 ? <p className='text-[#9bb2ae]'>No Forever characters were returned. Check the requirements above, refresh, or enter your name manually.</p>
                  : selected ? <p className='text-[#9bb2ae]'>Ownership will be checked with Battle.net when you submit.</p> : null}
          </div>
        </>
      ) : (
        <input id='foreverCharacterName' name='characterName' required minLength={5} maxLength={25}
          value={manualName} onChange={(event) => setManualName(event.currentTarget.value)}
          aria-describedby='foreverCharacterHint' pattern={FOREVER_CHARACTER_NAME_PATTERN} title={FOREVER_CHARACTER_NAME_HINT}
          ref={(input) => {
            input?.setCustomValidity(manualName && !isValidForeverCharacterName(manualName) ? FOREVER_CHARACTER_NAME_HINT : '');
          }} placeholder='Asha Brightvale' className={inputClass} disabled={disabled} />
      )}
      {connected ? <div className='mt-1 flex flex-wrap gap-x-4'>
        <button type='button' className={actionClass} disabled={disabled} onClick={() => setManual(!manual)}>
          {usePicker ? 'Enter character manually' : 'Choose from Battle.net'}
        </button>
        {usePicker ? <button type='button' className={`${actionClass} inline-flex items-center gap-1.5`} disabled={disabled || list.status === 'loading'}
          onClick={() => { setList({ status: 'loading', characters: [], error: '' }); setRefresh((count) => count + 1); }}>
          <RefreshCw aria-hidden='true' size={12} /> Refresh characters
        </button> : null}
      </div> : null}
    </div>
  );
}
