'use client';

import { ChevronDown, KeyRound, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

import { BattleNetMark } from '@/components/recruitment/BattleNetMark';
import type { BattleNetIdentityController } from '@/components/recruitment/useBattleNetIdentity';
import type { BattleNetRegion } from '@/lib/battlenet/types';

export type BattleTagSource = 'battlenet' | 'manual';

type Variant = 'retail' | 'forever';

export function BattleNetIdentityControl({
	variant,
	source,
	sourceName,
	onSourceChange,
	controller,
	disabled,
}: {
	variant: Variant;
	source: BattleTagSource;
	sourceName: 'characterSource' | 'battleTagSource';
	onSourceChange: (source: BattleTagSource) => void;
	controller: BattleNetIdentityController;
	disabled: boolean;
}) {
	const { identity, manualBattleTag, setManualBattleTag, connect, disconnect } = controller;
	const [connectRegion, setConnectRegion] = useState<BattleNetRegion>(identity.region);
	const [disconnectError, setDisconnectError] = useState('');
	const isForever = variant === 'forever';
	const choiceClass =
		'flex min-h-12 cursor-pointer items-center gap-3 rounded-[0.625rem] border border-white/12 bg-[#090c0e]/72 px-3.5 py-3 text-sm text-[#c8c5be] transition-colors has-[:checked]:text-[var(--foreground)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60';
	const battleNetChoiceClass = `${choiceClass} hover:border-[#148eff]/45 hover:bg-[#148eff]/[0.045] has-[:checked]:border-[#148eff]/70 has-[:checked]:bg-[#148eff]/[0.11]`;
	const manualChoiceClass = isForever
		? `${choiceClass} hover:border-[#79c9c2]/38 hover:bg-[#79c9c2]/[0.045] has-[:checked]:border-[#79c9c2] has-[:checked]:bg-[#79c9c2]/[0.11]`
		: `${choiceClass} hover:border-[rgba(198,166,108,0.45)] hover:bg-[rgba(198,166,108,0.045)] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[rgba(198,166,108,0.09)]`;
	const inputClass =
		'w-full rounded-[0.625rem] border border-white/12 bg-[#090c0e]/88 px-3.5 py-3 text-sm text-[var(--foreground)] placeholder:text-[#666863] transition-colors hover:border-white/20 focus:border-[#148eff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#148eff]/30 disabled:cursor-not-allowed disabled:opacity-60';
	const idPrefix = `${variant}-battle-tag`;

	const handleDisconnect = async () => {
		setDisconnectError('');
		try {
			await disconnect();
			setConnectRegion(identity.region);
		} catch (error) {
			setDisconnectError(error instanceof Error ? error.message : 'Battle.net could not be disconnected.');
		}
	};

	return (
		<div>
			<p className='mb-2 text-sm font-bold'>BattleTag</p>
			<div className='grid gap-2.5 sm:grid-cols-2'>
				<label className={battleNetChoiceClass}>
					<input type='radio' name={sourceName} value='battlenet' checked={source === 'battlenet'} onChange={() => onSourceChange('battlenet')} disabled={disabled} className='size-4 accent-[#148eff]' />
					<span><strong className='block text-[var(--foreground)]'>Connect Battle.net</strong><span className='mt-0.5 block text-xs opacity-70'>Verify and fill your BattleTag{isForever ? '.' : ' and character.'}</span></span>
				</label>
				<label className={manualChoiceClass}>
					<input type='radio' name={sourceName} value='manual' checked={source === 'manual'} onChange={() => onSourceChange('manual')} disabled={disabled} className={`size-4 ${isForever ? 'accent-[#8ee0d6]' : 'accent-[var(--accent-strong)]'}`} />
					<span><strong className='block text-[var(--foreground)]'>Enter manually</strong><span className='mt-0.5 block text-xs opacity-70'>Apply without signing in.</span></span>
				</label>
			</div>
			{isForever ? (
				<p className='mt-3 text-xs leading-5 text-[#8fa3ad]'>
					WoW Forever character selection is not currently available through
					Battle.net. Connecting your account will verify your BattleTag only.
				</p>
			) : null}

			{source === 'manual' ? (
				<div className='mt-4'>
					<label htmlFor={`${idPrefix}-manual`} className='mb-2 block text-sm font-bold'>BattleTag <span className={isForever ? 'text-[#8ee0d6]' : 'text-[var(--accent-strong)]'}>*</span></label>
					<input id={`${idPrefix}-manual`} name='battleTag' required maxLength={80} autoComplete='off' placeholder='Name#1234' value={manualBattleTag} onChange={(event) => setManualBattleTag(event.currentTarget.value)} className={inputClass} disabled={disabled} />
					<p className='mt-2 text-xs leading-5 opacity-65'>Saved only for this browser session so it can carry between application forms.</p>
				</div>
			) : (
				<div className='mt-4 rounded-[0.625rem] border border-[#148eff]/30 bg-[#0f1d2a] p-4'>
					{identity.status === 'loading' ? (
						<p className='flex items-center gap-2 text-sm opacity-70'><LoaderCircle className='animate-spin' size={16} aria-hidden='true' /> Checking Battle.net connection…</p>
					) : identity.status === 'connected' ? (
						<div className='flex flex-wrap items-center justify-between gap-3'>
							<div className='flex items-center gap-3'>
								<span className='grid size-9 shrink-0 place-items-center rounded-lg border border-[#55adff]/30 bg-[#148eff]/15 text-[#72bdff]'><BattleNetMark className='size-5' /></span>
								<div><p className='text-sm font-bold text-[#82c5ff]'>Battle.net connected</p><p className='mt-1 text-sm'>{identity.battleTag} · {identity.region.toUpperCase()}</p></div>
							</div>
							<button type='button' onClick={() => void handleDisconnect()} disabled={disabled} className='inline-flex min-h-10 items-center justify-center gap-2 rounded-[0.5rem] border border-[#d97972]/35 bg-[#d97972]/[0.08] px-4 text-sm font-bold text-[#efa39d] transition-colors hover:bg-[#d97972]/15 disabled:opacity-50'><LogOut size={15} aria-hidden='true' /> Disconnect</button>
						</div>
					) : (
						<div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
							<div><label htmlFor={`${idPrefix}-region`} className='mb-2 block text-xs font-bold text-[#8fcaff]'>Account region</label><div className='relative'><select id={`${idPrefix}-region`} value={connectRegion} onChange={(event) => setConnectRegion(event.currentTarget.value as BattleNetRegion)} className={`${inputClass} min-w-36 appearance-none pr-10`} disabled={disabled}><option value='eu'>Europe</option><option value='us'>Americas</option><option value='kr'>Korea</option><option value='tw'>Taiwan</option></select><ChevronDown className='pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[#72bdff]' size={15} aria-hidden='true' /></div></div>
							<button type='button' onClick={() => connect(connectRegion)} disabled={disabled} className='inline-flex min-h-11 items-center justify-center gap-2 rounded-[0.625rem] border border-[#4aa7ff]/55 bg-[#148eff] px-5 text-sm font-bold text-white transition-colors hover:bg-[#278fef] disabled:opacity-50'><BattleNetMark className='size-[1.125rem]' /> Connect Battle.net</button>
						</div>
					)}
					<div className='mt-4 grid gap-3 border-t border-[#148eff]/20 pt-4 sm:grid-cols-2' aria-label='Battle.net connection security'>
						<div className='flex items-start gap-2.5'>
							<ShieldCheck className='mt-0.5 shrink-0 text-[#72bdff]' size={16} strokeWidth={1.8} aria-hidden='true' />
							<p className='text-xs leading-5 text-[#aeb8c0]'><strong className='block text-[#dbeeff]'>Secure Battle.net sign-in</strong>You sign in on Battle.net. We never see your password.</p>
						</div>
						<div className='flex items-start gap-2.5'>
							<KeyRound className='mt-0.5 shrink-0 text-[#72bdff]' size={16} strokeWidth={1.8} aria-hidden='true' />
							<p className='text-xs leading-5 text-[#aeb8c0]'><strong className='block text-[#dbeeff]'>Limited account access</strong>Used only to verify your BattleTag{isForever ? '.' : ' and chosen character.'}</p>
						</div>
					</div>
					{identity.error || disconnectError ? <p className='mt-3 text-sm text-[#efa39d]' role='alert'>{disconnectError || identity.error}</p> : null}
				</div>
			)}
		</div>
	);
}
