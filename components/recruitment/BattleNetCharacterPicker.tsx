'use client';

import { ChevronDown, ExternalLink, LoaderCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { CHARACTER_SELECTION_STORAGE_KEY } from '@/components/recruitment/recruitment-storage';
import type { VerifiedCharacterDetails, VerifiedWowCharacter } from '@/lib/battlenet/types';
import { buildCharacterProfileLinks } from '@/lib/character-profile-links';

type CharacterResponse = {
	characters: VerifiedWowCharacter[];
	error?: string;
};

const battleNetSelectClass =
	'w-full min-w-36 appearance-none rounded-[0.625rem] border border-[#148eff]/40 bg-[#090c0e]/88 px-3.5 py-3 pr-10 text-sm text-[var(--foreground)] transition-colors hover:border-[#4aa7ff]/65 focus:border-[#148eff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148eff]/30 disabled:cursor-not-allowed disabled:opacity-60';

export function BattleNetCharacterPicker({ disabled }: { disabled: boolean }) {
	const [characters, setCharacters] = useState<VerifiedWowCharacter[]>([]);
	const [selectedId, setSelectedId] = useState('');
	const [details, setDetails] = useState<VerifiedCharacterDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [detailLoading, setDetailLoading] = useState(false);
	const [error, setError] = useState('');

	const chooseCharacter = useCallback(async (characterId: string) => {
		setSelectedId(characterId);
		setDetails(null);
		setError('');
		if (!characterId) {
			sessionStorage.removeItem(CHARACTER_SELECTION_STORAGE_KEY);
			return;
		}

		setDetailLoading(true);
		try {
			const response = await fetch('/api/battlenet/character', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ characterId }),
			});
			const body = (await response.json().catch(() => null)) as { character?: VerifiedCharacterDetails; error?: string } | null;
			if (!response.ok || !body?.character) throw new Error(body?.error || 'Character details could not be loaded.');
			setDetails(body.character);
			sessionStorage.setItem(CHARACTER_SELECTION_STORAGE_KEY, characterId);
		} catch (selectionError) {
			setSelectedId('');
			sessionStorage.removeItem(CHARACTER_SELECTION_STORAGE_KEY);
			setError(selectionError instanceof Error ? selectionError.message : 'Character details could not be loaded.');
		} finally {
			setDetailLoading(false);
		}
	}, []);

	useEffect(() => {
		const controller = new AbortController();

		void fetch('/api/battlenet/characters', { cache: 'no-store', signal: controller.signal })
			.then(async (response) => {
				const body = (await response.json().catch(() => null)) as CharacterResponse | null;
				if (!response.ok || !body) throw new Error(body?.error || 'Characters could not be loaded.');
				setCharacters(body.characters);
				if (body.characters.length === 0) {
					setError('No Retail World of Warcraft characters were returned for this account and region.');
					return;
				}

				const storedCharacterId = sessionStorage.getItem(CHARACTER_SELECTION_STORAGE_KEY);
				if (storedCharacterId && body.characters.some((character) => character.id === storedCharacterId)) {
					void chooseCharacter(storedCharacterId);
				} else {
					sessionStorage.removeItem(CHARACTER_SELECTION_STORAGE_KEY);
				}
			})
			.catch((fetchError: unknown) => {
				if (fetchError instanceof DOMException && fetchError.name === 'AbortError') return;
				setError(fetchError instanceof Error ? fetchError.message : 'Characters could not be loaded.');
			})
			.finally(() => setLoading(false));

		return () => controller.abort();
	}, [chooseCharacter]);

	const profileLinks = details ? buildCharacterProfileLinks({
		region: details.region,
		realmSlug: details.realmSlug,
		characterName: details.name,
		raiderIoProfileUrl: details.raiderIoProfileUrl,
	}) : null;

	return (
		<div className='mt-5 border-t border-white/10 pt-5'>
			{loading ? (
				<p className='flex items-center gap-2 text-sm text-[var(--muted)]'><LoaderCircle className='animate-spin' size={17} aria-hidden='true' /> Loading your Retail characters…</p>
			) : (
				<div className='grid gap-5'>
					<div>
						<label htmlFor='battleNetCharacterId' className='mb-2 block text-sm font-bold'>Choose your character <span className='text-[#72bdff]'>*</span></label>
						<div className='relative'>
							<select id='battleNetCharacterId' name='characterId' required value={selectedId} onChange={(event) => void chooseCharacter(event.currentTarget.value)} disabled={disabled || detailLoading} className={battleNetSelectClass}>
								<option value=''>Select an owned character</option>
								{characters.map((character) => <option key={`${character.id}-${character.realmSlug}`} value={character.id}>{character.name} — {character.realmName} — Level {character.level}{character.className ? ` ${character.className}` : ''}</option>)}
							</select>
							<ChevronDown className='pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted)]' size={16} aria-hidden='true' />
						</div>
					</div>

					{detailLoading ? <p className='flex items-center gap-2 text-sm text-[var(--muted)]'><LoaderCircle className='animate-spin' size={17} aria-hidden='true' /> Retrieving character details…</p> : null}
					{details ? (
						<div className='rounded-[0.625rem] border border-white/10 bg-[#090c0e]/72 p-4'>
							<p className='text-lg font-bold'>{details.name}</p>
							<p className='mt-1 text-sm text-[#c8c5be]'>{details.specialization ? `${details.specialization} ` : ''}{details.className ?? 'Class unavailable'} · {details.realmName} {details.region.toUpperCase()}</p>
							<p className='mt-2 text-xs leading-5 text-[var(--muted)]'>Level {details.level}{details.faction ? ` · ${details.faction}` : ''}{details.itemLevel ? ` · Item level ${Math.round(details.itemLevel)}` : ''}{details.raiderIoScore !== undefined ? ` · Raider.IO ${Math.round(details.raiderIoScore)}` : ''}</p>
							{profileLinks ? <div className='mt-4 flex flex-wrap gap-2' aria-label='Character profiles'>{[['Raider.IO', profileLinks.raiderIo], ['Warcraft Logs', profileLinks.warcraftLogs], ['WoW Armory', profileLinks.armory]].map(([label, href]) => <a key={label} href={href} target='_blank' rel='noreferrer' className='inline-flex items-center gap-1.5 rounded-md border border-[#148eff]/25 bg-[#148eff]/[0.07] px-2.5 py-1.5 text-xs font-bold text-[#72bdff] transition-colors hover:bg-[#148eff]/[0.12]'><span>{label}</span><ExternalLink size={12} aria-hidden='true' /></a>)}</div> : null}
						</div>
					) : null}
				</div>
			)}

			{error ? <p className='mt-4 rounded-[0.625rem] border border-[#d97972]/40 bg-[#d97972]/10 px-4 py-3 text-sm leading-6 text-[#efa39d]' role='alert'>{error}</p> : null}

			<input type='hidden' name='characterName' value={details?.name ?? ''} />
			<input type='hidden' name='realm' value={details?.realmName ?? ''} />
			<input type='hidden' name='className' value={details?.className ?? ''} />
			<input type='hidden' name='specialization' value={details?.specialization ?? ''} />
		</div>
	);
}
