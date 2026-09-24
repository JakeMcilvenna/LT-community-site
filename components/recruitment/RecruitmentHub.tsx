'use client';

import {
	ArrowUpRight,
	Backpack,
	CalendarDays,
	CheckCircle2,
	Clock3,
	Flag,
	Globe2,
	Headphones,
	MessageSquareText,
	ScrollText,
	Swords,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { ForeverRecruitmentCallout } from '@/components/recruitment/ForeverRecruitmentCallout';
import { RecruitmentApplicationForm } from '@/components/recruitment/RecruitmentApplicationForm';
import { RecruitmentCard } from '@/components/recruitment/RecruitmentCard';
import type { ApplicationType } from '@/config/application-types';
import type { RecruitmentNeed } from '@/types/guild';

type VerifiedDiscordIdentity = {
	discordUserId: string;
	discordTag: string;
	applicationType: ApplicationType;
	discordReturnUrl: string;
};

export function RecruitmentHub({
	openNeeds,
	discordInviteUrl,
	defaultApplicationType,
	verifiedDiscordIdentity,
	applicationToken,
}: {
	openNeeds: RecruitmentNeed[];
	discordInviteUrl?: string;
	defaultApplicationType: ApplicationType;
	verifiedDiscordIdentity?: VerifiedDiscordIdentity;
	applicationToken?: string;
}) {
	const [applicationType, setApplicationType] = useState<ApplicationType>(
		defaultApplicationType,
	);

	useEffect(() => {
		if (!verifiedDiscordIdentity) return;

		const frame = window.requestAnimationFrame(() => {
			const applicationForm = document.getElementById('application-form');
			if (!applicationForm) return;

			applicationForm.scrollIntoView({
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
					? 'auto'
					: 'smooth',
				block: 'start',
			});
		});

		return () => window.cancelAnimationFrame(frame);
	}, [verifiedDiscordIdentity]);

	const selectApplicationType = (nextType: ApplicationType) => {
		if (verifiedDiscordIdentity && nextType !== verifiedDiscordIdentity.applicationType) {
			return;
		}

		setApplicationType(nextType);

		const url = new URL(window.location.href);
		if (nextType === 'forever') url.searchParams.set('application', 'forever');
		else url.searchParams.delete('application');
		url.hash = 'application';
		window.history.replaceState(
			null,
			'',
			`${url.pathname}${url.search}${url.hash}`,
		);
	};

	const isRetail = applicationType === 'retail';
	const activeTabId = `${applicationType}-recruitment-tab`;
	const applicationTypeIsLocked = Boolean(verifiedDiscordIdentity);

	return (
		<section
			id='application'
			className='scroll-mt-24 border-t border-white/8 bg-[#0b0e10]/70 py-14 sm:py-18'>
			<div className='section-shell'>
				<div className='max-w-3xl'>
					<h2 className='display-font text-[2.5rem] leading-[1.02] tracking-[-0.025em] sm:text-[3.5rem]'>
						Where do you want to play?
					</h2>
					<p className='mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]'>
						Your choice updates both the current openings and the application
						below.
					</p>
				</div>

				<div
					className='mt-10 grid gap-3 sm:grid-cols-2'
					role='tablist'
					aria-label='Choose a World of Warcraft guild'>
					<button
						id='retail-recruitment-tab'
						type='button'
						role='tab'
						aria-selected={isRetail}
						aria-controls='recruitment-track-panel'
						disabled={applicationTypeIsLocked && !isRetail}
						onClick={() => selectApplicationType('retail')}
						className={`flex min-h-24 items-start gap-4 rounded-[0.75rem] border p-4 text-left transition-all duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 ${isRetail ? 'border-[var(--accent-strong)] bg-[rgba(198,166,108,0.1)] shadow-[inset_0_1px_0_rgba(240,237,230,0.05)]' : 'border-white/10 bg-[#0d1012]/70 hover:border-white/20 hover:bg-[#111518]'}`}>
						<span className='grid size-10 shrink-0 place-items-center rounded-[0.5rem] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]'>
							<Swords size={19} strokeWidth={1.7} aria-hidden='true' />
						</span>
						<span>
							<span className='block font-bold text-[var(--foreground)]'>
								Retail WoW
							</span>
							<span className='mt-1 block text-xs leading-5 text-[var(--muted)]'>
								Established raiding with a close-knit team
							</span>
						</span>
					</button>
					<button
						id='forever-recruitment-tab'
						type='button'
						role='tab'
						aria-selected={!isRetail}
						aria-controls='recruitment-track-panel'
						disabled={applicationTypeIsLocked && isRetail}
						onClick={() => selectApplicationType('forever')}
						className={`flex min-h-24 items-start gap-4 rounded-[0.75rem] border p-4 text-left transition-all duration-200 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0 ${!isRetail ? 'border-[#79c9c2] bg-[#79c9c2]/10 shadow-[inset_0_1px_0_rgba(174,237,226,0.06)]' : 'border-white/10 bg-[#0d1012]/70 hover:border-[#79c9c2]/35 hover:bg-[#0c1716]'}`}>
						<span className='grid size-10 shrink-0 place-items-center rounded-[0.5rem] bg-[#79c9c2]/10 text-[#8ee0d6]'>
							<Flag size={19} strokeWidth={1.7} aria-hidden='true' />
						</span>
						<span>
							<span className='block font-bold text-[#eef9f6]'>
								Warcraft Forever
							</span>
							<span className='mt-1 block text-xs leading-5 text-[#8da7a2]'>
								Build a new guild together from day one
							</span>
						</span>
					</button>
				</div>

				<div
					id='recruitment-track-panel'
					role='tabpanel'
					aria-labelledby={activeTabId}
					className='mt-10'>
					{isRetail ? (
						<section aria-labelledby='retail-openings-title'>
							<div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start'>
								<div>
									<h3
										id='retail-openings-title'
										className='display-font text-[2.5rem] leading-[1.02] tracking-[-0.025em] sm:text-[3.125rem]'>
										Current openings
									</h3>
									<p className='mt-5 text-[15px] leading-7 text-[var(--muted)]'>
										If your class is not listed, you can still submit an
										application.
									</p>
								</div>
								<p className='surface flex min-h-20 items-center gap-3 px-6 text-sm font-bold text-[var(--foreground)] lg:mt-1'>
									<CheckCircle2
										className='text-[var(--accent-strong)]'
										size={17}
										strokeWidth={1.8}
										aria-hidden='true'
									/>{' '}
									Applications are open
								</p>
							</div>
							{openNeeds.length > 0 ? (
								<>
									<div className='mt-10 grid max-w-4xl gap-3.5 md:grid-cols-2'>
										{openNeeds.map((need) => (
											<RecruitmentCard key={need.id} need={need} />
										))}
									</div>
								</>
							) : (
								<div className='mt-5 py-6'>
									<h3 className='display-font text-2xl font-semibold'>
										No priority openings right now.
									</h3>
									<p className='mt-3 text-sm text-[var(--muted)]'>
										Retail applications are still welcome.
									</p>
								</div>
							)}
						</section>
					) : (
						<ForeverRecruitmentCallout showCta={false} />
					)}

					{isRetail ? (
						<section
							aria-labelledby='retail-before-apply-title'
							className='mt-6 overflow-hidden rounded-[0.75rem] border border-[rgba(198,166,108,0.24)] bg-[radial-gradient(circle_at_8%_0%,rgba(198,166,108,0.11),transparent_20rem),#11100d] shadow-[inset_0_1px_0_rgba(240,237,230,0.05)]'>
							<div className='grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-10'>
								<div>
									<p className='text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]'>
										Things to know
									</p>
									<h3
										id='retail-before-apply-title'
										className='display-font mt-3 text-[2rem] leading-[1.08] text-[var(--foreground)]'>
										Before you apply
									</h3>
									<p className='mt-3 max-w-md text-sm leading-6 text-[var(--muted)]'>
										Please make sure our realm, raid schedule, and team expectations suit you.
									</p>
								</div>

								<ul className='grid gap-x-7 gap-y-6 sm:grid-cols-2'>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[rgba(198,166,108,0.3)] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]'>
											<Globe2 size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[var(--foreground)]'>Silvermoon EU</p>
											<p className='mt-1 text-sm leading-6 text-[var(--muted)]'>
												Our Retail guild is based on Silvermoon in the EU region.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[rgba(198,166,108,0.3)] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]'>
											<CalendarDays size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[var(--foreground)]'>Wednesday &amp; Sunday</p>
											<p className='mt-1 text-sm leading-6 text-[var(--muted)]'>
												We raid twice a week from 19:30 to 22:30.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[rgba(198,166,108,0.3)] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]'>
											<CheckCircle2 size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[var(--foreground)]'>Regular raid attendance</p>
											<p className='mt-1 text-sm leading-6 text-[var(--muted)]'>
												Raiders are expected to attend regularly and let the team know when they cannot make a night.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[rgba(198,166,108,0.3)] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]'>
											<Headphones size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[var(--foreground)]'>Discord voice required</p>
											<p className='mt-1 text-sm leading-6 text-[var(--muted)]'>
												Raiders must join Discord voice during raids to hear calls and coordinate with the team.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[rgba(198,166,108,0.3)] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]'>
											<Backpack size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[var(--foreground)]'>Come prepared</p>
											<p className='mt-1 text-sm leading-6 text-[var(--muted)]'>
												Arrive on time with your character, consumables, and knowledge of the planned encounters ready.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[rgba(198,166,108,0.3)] bg-[rgba(198,166,108,0.1)] text-[var(--accent-strong)]'>
											<Swords size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[var(--foreground)]'>Relaxed progression</p>
											<p className='mt-1 text-sm leading-6 text-[var(--muted)]'>
												We take progression seriously enough while keeping the team friendly, patient, and fun.
											</p>
										</div>
									</li>
								</ul>
							</div>

							<div className='flex flex-col gap-4 border-t border-[rgba(198,166,108,0.16)] bg-[rgba(198,166,108,0.045)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7'>
								<div className='flex items-start gap-3'>
									<MessageSquareText className='mt-0.5 shrink-0 text-[var(--accent-strong)]' size={18} strokeWidth={1.7} aria-hidden='true' />
									<div>
										<p className='text-sm font-bold text-[var(--foreground)]'>Questions before you apply?</p>
										<p className='mt-1 text-xs leading-5 text-[var(--muted)]'>Join our Discord and speak to an officer.</p>
									</div>
								</div>
								{discordInviteUrl ? (
									<a
										href={discordInviteUrl}
										target='_blank'
										rel='noreferrer'
										className='button-secondary recruitment-link--retail shrink-0'>
										Join the Discord server
										<ArrowUpRight size={16} strokeWidth={1.8} aria-hidden='true' />
									</a>
								) : (
									<p className='text-xs text-[var(--muted)]'>The Discord invite is temporarily unavailable.</p>
								)}
							</div>
						</section>
					) : null}

					{!isRetail ? (
						<section
							aria-labelledby='forever-before-apply-title'
							className='mt-6 overflow-hidden rounded-[0.75rem] border border-[#79c9c2]/24 bg-[radial-gradient(circle_at_8%_0%,rgba(121,201,194,0.11),transparent_20rem),#091312] shadow-[inset_0_1px_0_rgba(174,237,226,0.05)]'>
							<div className='grid gap-6 p-6 sm:p-7 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-10'>
								<div>
									<p className='text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#79c9c2]'>
										Things to know
									</p>
									<h3
										id='forever-before-apply-title'
										className='display-font mt-3 text-[2rem] leading-[1.08] text-[#eef9f6]'>
										Before you apply
									</h3>
									<p className='mt-3 max-w-md text-sm leading-6 text-[#839d98]'>
										Please make sure our faction, focus, and expected raid commitment suit you.
									</p>
								</div>

								<ul className='grid gap-x-7 gap-y-6 sm:grid-cols-2'>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[#79c9c2]/30 bg-[#79c9c2]/10 text-[#8ee0d6]'>
											<Swords size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[#eef9f6]'>Alliance PvP guild</p>
											<p className='mt-1 text-sm leading-6 text-[#839d98]'>
												Last Try Forever will be an Alliance guild with a strong PvP focus.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[#79c9c2]/30 bg-[#79c9c2]/10 text-[#8ee0d6]'>
											<Globe2 size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[#eef9f6]'>EU region</p>
											<p className='mt-1 text-sm leading-6 text-[#839d98]'>
												We are an EU guild. Raid times and guild events will be listed in server time.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[#79c9c2]/30 bg-[#79c9c2]/10 text-[#8ee0d6]'>
											<CalendarDays size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[#eef9f6]'>Raiding is optional</p>
											<p className='mt-1 text-sm leading-6 text-[#839d98]'>
												Raiding is completely optional. For those who join the raid team, we plan to run two three-hour sessions each week. Exact days and times will be confirmed later.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[#79c9c2]/30 bg-[#79c9c2]/10 text-[#8ee0d6]'>
											<CheckCircle2 size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[#eef9f6]'>Regular raid attendance</p>
											<p className='mt-1 text-sm leading-6 text-[#839d98]'>
												Players who join the raid team are expected to maintain regular attendance and let the team know when they cannot attend.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[#79c9c2]/30 bg-[#79c9c2]/10 text-[#8ee0d6]'>
											<Headphones size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[#eef9f6]'>Discord voice required</p>
											<p className='mt-1 text-sm leading-6 text-[#839d98]'>
												Raiders must join Discord voice during raids so they can hear instructions and coordinate with the team.
											</p>
										</div>
									</li>
									<li className='flex gap-3.5'>
										<span className='grid size-9 shrink-0 place-items-center rounded-[0.5rem] border border-[#79c9c2]/30 bg-[#79c9c2]/10 text-[#8ee0d6]'>
											<Backpack size={17} strokeWidth={1.7} aria-hidden='true' />
										</span>
										<div>
											<p className='font-bold text-[#eef9f6]'>Come prepared</p>
											<p className='mt-1 text-sm leading-6 text-[#839d98]'>
												Raiders should arrive on time with their character, consumables, and knowledge of the planned encounters ready.
											</p>
										</div>
									</li>
								</ul>
							</div>

							<div className='flex flex-col gap-4 border-t border-[#79c9c2]/16 bg-[#79c9c2]/[0.045] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7'>
								<div className='flex items-start gap-3'>
									<MessageSquareText className='mt-0.5 shrink-0 text-[#79c9c2]' size={18} strokeWidth={1.7} aria-hidden='true' />
									<div>
										<p className='text-sm font-bold text-[#eef9f6]'>Join our Discord for the latest information</p>
										<p className='mt-1 text-xs leading-5 text-[#839d98]'>We will announce the confirmed raid schedule there.</p>
									</div>
								</div>
								{discordInviteUrl ? (
									<a
										href={discordInviteUrl}
										target='_blank'
										rel='noreferrer'
										className='button-secondary recruitment-link--forever shrink-0'>
										Join the Discord server
										<ArrowUpRight size={16} strokeWidth={1.8} aria-hidden='true' />
									</a>
								) : (
									<p className='text-xs text-[#839d98]'>The Discord invite is temporarily unavailable.</p>
								)}
							</div>
						</section>
					) : null}

					<div className='mt-12 max-w-3xl'>
						<p
							className={`text-[0.68rem] font-bold uppercase tracking-[0.18em] ${isRetail ? 'text-[var(--accent-strong)]' : 'text-[#79c9c2]'}`}>
							{isRetail ? 'Retail WoW' : 'Warcraft Forever'}
						</p>
						<h2 className={`display-font mt-3 text-[2.25rem] leading-[1.02] tracking-[-0.025em] sm:text-[3rem] ${isRetail ? 'text-[var(--foreground)]' : 'text-[#eef9f6]'}`}>
							Start your {isRetail ? '' : 'Forever '}application
						</h2>
						<p className={`mt-4 max-w-2xl text-[15px] leading-7 ${isRetail ? 'text-[var(--muted)]' : 'text-[#839d98]'}`}>
							{isRetail
								? 'Applications go directly to our private officer channel for review. Take your time and give us an honest picture of how you play.'
								: 'Applications go directly to the relevant private officer channel. Take your time and give us an honest picture of how you play.'}
						</p>
					</div>

					<div
						id='application-form'
						className='mt-8 grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start'>
						<RecruitmentApplicationForm
							discordInviteUrl={discordInviteUrl}
							applicationType={applicationType}
							verifiedDiscordIdentity={verifiedDiscordIdentity}
							applicationToken={applicationToken}
						/>
						<aside
							className='grid gap-3 lg:sticky lg:top-28'
							aria-label='Application guidance'>
							<div className='surface p-5'>
								<ScrollText
									className={
										isRetail ? 'text-[var(--accent-strong)]' : 'text-[#79c9c2]'
									}
									size={20}
									strokeWidth={1.7}
									aria-hidden='true'
								/>
								<h3 className={`mt-4 font-bold ${isRetail ? 'text-[var(--foreground)]' : 'text-[#eef9f6]'}`}>Prepare your details</h3>
								<p className={`mt-2 text-sm leading-6 ${isRetail ? 'text-[var(--muted)]' : 'text-[#839d98]'}`}>
									Have your BattleTag, experience, goals, and availability
									ready.
								</p>
							</div>
							<div className='surface p-5'>
								<Clock3
									className={
										isRetail ? 'text-[var(--accent-strong)]' : 'text-[#79c9c2]'
									}
									size={20}
									strokeWidth={1.7}
									aria-hidden='true'
								/>
								<h3 className={`mt-4 font-bold ${isRetail ? 'text-[var(--foreground)]' : 'text-[#eef9f6]'}`}>No rush</h3>
								<p className={`mt-2 text-sm leading-6 ${isRetail ? 'text-[var(--muted)]' : 'text-[#839d98]'}`}>
									Thoughtful answers help us make a fair decision and usually
									save follow-up questions.
								</p>
							</div>
							<div className='surface p-5'>
								<MessageSquareText
									className={
										isRetail ? 'text-[var(--accent-strong)]' : 'text-[#79c9c2]'
									}
									size={20}
									strokeWidth={1.7}
									aria-hidden='true'
								/>
								<h3 className={`mt-4 font-bold ${isRetail ? 'text-[var(--foreground)]' : 'text-[#eef9f6]'}`}>What happens next</h3>
								<p className={`mt-2 text-sm leading-6 ${isRetail ? 'text-[var(--muted)]' : 'text-[#839d98]'}`}>
									An officer will review your application and contact you
									through Discord or Battle.net.
								</p>
							</div>
						</aside>
					</div>
				</div>
			</div>
		</section>
	);
}
