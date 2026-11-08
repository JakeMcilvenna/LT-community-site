'use client';

import { ExternalLink, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { VerifiedForeverCharacter, VerifiedForeverCharacterDetails } from '@/lib/battlenet/types';
import { buildForeverCharacterProfileLinks } from '@/lib/forever-character-profile';

type DetailState =
  | { status: 'loading' }
  | { status: 'ready'; character: VerifiedForeverCharacterDetails }
  | { status: 'error' };

export function ForeverCharacterInfo({ character }: { character: VerifiedForeverCharacter }) {
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const { fullName, id } = character;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/battlenet/forever-character?name=${encodeURIComponent(fullName)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as { character?: VerifiedForeverCharacterDetails };
        if (!response.ok || body.character?.id !== id || body.character.fullName !== fullName) throw new Error('Character details unavailable.');
        if (!controller.signal.aborted) setState({ status: 'ready', character: body.character });
      })
      .catch(() => { if (!controller.signal.aborted) setState({ status: 'error' }); });
    return () => controller.abort();
  }, [fullName, id]);

  const details = state.status === 'ready' ? state.character : character;
  const specialization = state.status === 'ready' ? state.character.specialization : undefined;
  const links = buildForeverCharacterProfileLinks(details);
  const linkClass = 'inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#79c9c2]/25 px-2.5 py-1.5 text-xs font-bold text-[#8ee0d6] transition-colors hover:bg-[#79c9c2]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8ee0d6]';

  return (
    <div className='mt-4 border-t border-[#79c9c2]/18 pt-4' aria-label='Selected Forever character' aria-live='polite'>
      <p className='break-words text-base font-bold text-[#eef9f6]'>{fullName}</p>
      <dl className='mt-3 flex flex-wrap gap-x-6 gap-y-3 text-sm'>
        <div><dt className='text-xs text-[#9bb2ae]'>Class</dt><dd className='mt-1 text-[#eef9f6]'>{details.className ?? 'Not available yet'}</dd></div>
        <div><dt className='text-xs text-[#9bb2ae]'>Level</dt><dd className='mt-1 text-[#eef9f6]'>{details.level}</dd></div>
        <div><dt className='text-xs text-[#9bb2ae]'>Spec</dt><dd className='mt-1 text-[#eef9f6]'>
          {state.status === 'loading' ? <span className='inline-flex items-center gap-1.5'><LoaderCircle aria-hidden='true' size={13} className='animate-spin' /> Loading…</span>
            : specialization ?? 'Not available yet'}
        </dd></div>
      </dl>
      <div className='mt-3 flex flex-wrap items-center gap-2' aria-label='Forever character profiles'>
        <a href={links.armoryUrl} target='_blank' rel='noreferrer' className={linkClass}>WoW Armory <ExternalLink aria-hidden='true' size={12} /></a>
        {links.raiderIoProfileUrl ? <a href={links.raiderIoProfileUrl} target='_blank' rel='noreferrer' className={linkClass}>Raider.IO <ExternalLink aria-hidden='true' size={12} /></a>
          : <span className='text-xs text-[#9bb2ae]'>{state.status === 'loading' ? 'Loading Raider.IO link…' : 'Raider.IO link unavailable'}</span>}
      </div>
      {state.status === 'error' ? <p className='mt-2 text-xs leading-5 text-[#9bb2ae]'>Extra details are temporarily unavailable. You can still submit this character.</p> : null}
    </div>
  );
}
