'use client';

import { useEffect, useState, type FocusEvent, type FormEvent, type ReactNode } from 'react';
import {
	ArrowUpRight,
	CheckCircle2,
	Compass,
	FileImage,
	LoaderCircle,
	MessageCircle,
	Send,
	ShieldCheck,
} from 'lucide-react';

import {
	englishLevels,
	foreverExperienceLevels,
	foreverGoals,
	foreverRoles,
	microphoneOptions,
	raidNights,
	recruitmentQuestions,
	wowClasses,
} from '@/data/recruitment-application';
import type { ApplicationType } from '@/config/application-types';
import { BattleNetCharacterPicker } from '@/components/recruitment/BattleNetCharacterPicker';
import { BattleNetIdentityControl, type BattleTagSource } from '@/components/recruitment/BattleNetIdentityControl';
import { CHARACTER_SELECTION_STORAGE_KEY } from '@/components/recruitment/recruitment-storage';
import { useBattleNetIdentity, type BattleNetIdentityController } from '@/components/recruitment/useBattleNetIdentity';

type VerifiedDiscordIdentity = {
	discordUserId: string;
	discordTag: string;
	applicationType: ApplicationType;
	discordReturnUrl: string;
};

const blurReadOnlyField = (event: FocusEvent<HTMLInputElement>) => {
	event.currentTarget.blur();
};

const inputClass =
	'w-full rounded-[0.625rem] border border-white/12 bg-[#090c0e]/88 px-3.5 py-3 text-sm text-[var(--foreground)] placeholder:text-[#666863] transition-colors hover:border-white/20 focus:border-[var(--accent-strong)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

const choiceClass =
	'flex min-h-12 cursor-pointer items-center gap-3 rounded-[0.625rem] border border-white/12 bg-[#090c0e]/72 px-3.5 py-3 text-sm text-[#c8c5be] transition-colors hover:border-white/22 hover:bg-[#111519] has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[rgba(198,166,108,0.09)] has-[:checked]:text-[var(--foreground)] has-[:disabled]:cursor-not-allowed has-[:disabled]:border-white/6 has-[:disabled]:bg-white/[0.015] has-[:disabled]:text-[#555852] has-[:disabled]:hover:border-white/6 has-[:disabled]:hover:bg-white/[0.015]';

const foreverInputClass =
	'w-full rounded-[0.5rem] border border-[#79c9c2]/20 bg-[#071312]/88 px-3.5 py-3 text-sm text-[#eef9f6] placeholder:text-[#66817d] transition-colors hover:border-[#79c9c2]/35 focus:border-[#8ee0d6] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60';

const foreverChoiceClass =
	'flex min-h-12 cursor-pointer items-center gap-3 rounded-[0.5rem] border border-[#79c9c2]/18 bg-[#071312]/72 px-3.5 py-3 text-sm text-[#bdd0cc] transition-colors hover:border-[#79c9c2]/38 hover:bg-[#0c1d1b] has-[:checked]:border-[#79c9c2] has-[:checked]:bg-[#79c9c2]/12 has-[:checked]:text-[#eef9f6] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60';

type SubmitState =
	| { status: 'idle' }
	| { status: 'submitting' }
	| { status: 'success'; applicationStatusId?: string }
	| { status: 'error'; message: string };

function Field({
	label,
	name,
	hint,
	required = false,
	children,
}: {
	label: string;
	name: string;
	hint?: string;
	required?: boolean;
	children: ReactNode;
}) {
	return (
		<div>
			<label
				htmlFor={name}
				className='mb-2 block text-sm font-bold text-[var(--foreground)]'>
				{label}
				{required ? (
					<span className='ml-1 text-[var(--accent-strong)]'>*</span>
				) : null}
			</label>
			{hint ? (
				<p className='mb-2 text-xs leading-5 text-[var(--muted)]'>{hint}</p>
			) : null}
			{children}
		</div>
	);
}

function FormSection({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<fieldset className='border-0 p-0'>
			<legend className='display-font text-[1.55rem] leading-tight text-[var(--foreground)]'>
				{title}
			</legend>
			<p className='mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]'>
				{description}
			</p>
			<div className='mt-6 grid gap-5'>{children}</div>
		</fieldset>
	);
}

function ApplicationNextSteps({
	discordInviteUrl,
	discordIdentity,
	applicationStatusId,
	variant,
}: {
	discordInviteUrl?: string;
	discordIdentity?: VerifiedDiscordIdentity;
	applicationStatusId?: string;
	variant: 'retail' | 'forever';
}) {
	const [discordChannelUrl, setDiscordChannelUrl] = useState<string>();
	const [finishedWaitingForChannel, setFinishedWaitingForChannel] = useState(false);
	const isForever = variant === 'forever';
	const panelClass = isForever
		? 'border-[#79c9c2]/20 bg-[#071312]/70'
		: 'border-white/10 bg-[#090c0e]/72';
	const numberClass = isForever
		? 'border-[#79c9c2]/35 bg-[#79c9c2]/10 text-[#8ee0d6]'
		: 'border-[rgba(198,166,108,0.35)] bg-[rgba(198,166,108,0.08)] text-[var(--accent-strong)]';
	const headingClass = isForever ? 'text-[#eef9f6]' : 'text-[var(--foreground)]';
	const bodyClass = isForever ? 'text-[#9bb2ae]' : 'text-[var(--muted)]';

	useEffect(() => {
		if (!discordIdentity || !applicationStatusId) return;

		let cancelled = false;
		let attempts = 0;
		let timeout: ReturnType<typeof setTimeout> | undefined;

		const checkForChannel = async () => {
			try {
				const response = await fetch(
					`/api/discord/application-status?id=${encodeURIComponent(applicationStatusId)}`,
					{ cache: 'no-store' },
				);
				const result = (await response.json().catch(() => null)) as {
					url?: string;
				} | null;

				if (!cancelled && response.ok && result?.url) {
					setDiscordChannelUrl(result.url);
					setFinishedWaitingForChannel(true);
					return;
				}
			} catch {
				// A temporary lookup failure is retried while BotGhost finishes its workflow.
			}

			attempts += 1;
			if (cancelled) return;
			if (attempts >= 20) {
				setFinishedWaitingForChannel(true);
				return;
			}
			timeout = setTimeout(checkForChannel, 1_500);
		};

		void checkForChannel();
		return () => {
			cancelled = true;
			if (timeout) clearTimeout(timeout);
		};
	}, [applicationStatusId, discordIdentity]);

	const step = (number: number, content: ReactNode) => (
		<li className='flex gap-3.5'>
			<span
				className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold ${numberClass}`}>
				{number}
			</span>
			<div className={`pt-0.5 text-sm leading-6 ${bodyClass}`}>{content}</div>
		</li>
	);

	return (
		<div className={`mt-7 max-w-2xl rounded-[0.75rem] border p-5 sm:p-6 ${panelClass}`}>
			<h3 className={`font-bold ${headingClass}`}>Your next steps</h3>
			<ol className='mt-5 grid gap-5'>
				{discordIdentity ? (
					<>
						{step(
							1,
							<>
								<p>
									{discordChannelUrl
										? 'Return to your private application thread to follow its progress and speak with the officer team.'
										: finishedWaitingForChannel
											? 'Your application channel is being prepared. You can return to Discord now and it should appear shortly.'
											: 'We are creating your private Discord channel now.'}
								</p>
								{discordChannelUrl || finishedWaitingForChannel ? (
									<a
										href={discordChannelUrl ?? discordIdentity.discordReturnUrl}
										target='_blank'
										rel='noreferrer'
										className={`button-primary mt-3 ${isForever ? 'button-forever' : 'bg-[#5865f2] text-white [border-color:#6f79f5] hover:bg-[#6873f5] hover:[border-color:#7e87fa]'}`}>
										<MessageCircle aria-hidden='true' size={17} strokeWidth={1.8} />
										{discordChannelUrl ? 'Check application status' : 'Return to Discord'}
										<ArrowUpRight aria-hidden='true' size={16} strokeWidth={1.8} />
									</a>
								) : (
									<div role='status' aria-live='polite'>
										<span className='button-primary mt-3 cursor-wait opacity-80'>
											<LoaderCircle className='animate-spin' aria-hidden='true' size={17} strokeWidth={1.8} />
											Generating channel link…
										</span>
										<p className='mt-2 text-xs'>This usually takes a few seconds. Please keep this page open.</p>
									</div>
								)}
							</>,
						)}
						{step(
							2,
							<p>
								We will post updates and any follow-up questions in Discord. Allow up to one day for a response.
							</p>,
						)}
					</>
				) : (
					<>
						{step(
							1,
							<>
								<p>Join the Last Try Discord server so our officers can reach you.</p>
								{discordInviteUrl ? (
							<a
								href={discordInviteUrl}
								target='_blank'
								rel='noreferrer'
								className={`button-primary mt-3 ${isForever ? 'button-forever' : 'bg-[#5865f2] text-white [border-color:#6f79f5] hover:bg-[#6873f5] hover:[border-color:#7e87fa]'}`}>
								<MessageCircle aria-hidden='true' size={17} strokeWidth={1.8} />
								Join the Discord server
								<ArrowUpRight aria-hidden='true' size={16} strokeWidth={1.8} />
							</a>
								) : (
							<p className='mt-2 text-xs'>
								The invite is temporarily unavailable. Please try this page again shortly.
							</p>
						)}
							</>,
						)}
						{step(
					2,
					<p>
						Open <strong className={headingClass}>#server-rules-readfirst</strong>, read the
						rules, then react to the post with the verification check mark to get verified.
					</p>,
						)}
						{step(
					3,
					<p>
						Allow up to one day for a response in Discord or a Battle.net friend request
						from <strong className={headingClass}>jmac#2405</strong> or{' '}
						<strong className={headingClass}>larppa#21732</strong>.
					</p>,
						)}
						{step(
					4,
					<p>
						If you have not heard from us after one day, message an officer in the Discord
						server and let them know you submitted an application.
					</p>,
						)}
					</>
				)}
			</ol>
		</div>
	);
}

function RetailApplicationForm({
	discordInviteUrl,
	verifiedDiscordIdentity,
	applicationToken,
	battleNetIdentity,
}: {
	discordInviteUrl?: string;
	verifiedDiscordIdentity?: VerifiedDiscordIdentity;
	applicationToken?: string;
	battleNetIdentity: BattleNetIdentityController;
}) {
	const [submitState, setSubmitState] = useState<SubmitState>({
		status: 'idle',
	});
	const [screenshotName, setScreenshotName] = useState('');
	const [characterSource, setCharacterSource] = useState<BattleTagSource>('battlenet');
	const [manualWarcraftLogsUrl, setManualWarcraftLogsUrl] = useState('');

	const selectCharacterSource = (source: BattleTagSource) => {
		setCharacterSource(source);
		if (source === 'manual') {
			sessionStorage.removeItem(CHARACTER_SELECTION_STORAGE_KEY);
		}
	};

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;
		const formData = new FormData(form);
		const screenshot = formData.get('uiScreenshot');

		if (screenshot instanceof File && screenshot.size > 4 * 1024 * 1024) {
			setSubmitState({
				status: 'error',
				message: 'The UI screenshot must be smaller than 4 MB.',
			});
			return;
		}

		setSubmitState({ status: 'submitting' });

		try {
			const response = await fetch('/api/recruitment', {
				method: 'POST',
				body: formData,
			});
			const result = (await response.json().catch(() => null)) as {
				error?: string;
				applicationStatusId?: string;
			} | null;

			if (!response.ok) {
				throw new Error(
					result?.error || 'The application could not be submitted.',
				);
			}

			form.reset();
			setScreenshotName('');
			setSubmitState({ status: 'success', applicationStatusId: result?.applicationStatusId });
		} catch (error) {
			setSubmitState({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: 'The application could not be submitted.',
			});
		}
	};

	if (submitState.status === 'success') {
		return (
			<div className='surface p-7 sm:p-10' role='status'>
				<CheckCircle2
					className='text-[var(--accent-strong)]'
					size={32}
					strokeWidth={1.6}
					aria-hidden='true'
				/>
				<h2 className='display-font mt-5 text-[2rem] leading-tight'>
					Application sent
				</h2>
				<p className='mt-3 max-w-xl text-sm leading-7 text-[var(--muted)]'>
					Your application is now with the Last Try officer team. Complete the
					steps below so we can get in touch.
				</p>
				<ApplicationNextSteps
					discordInviteUrl={discordInviteUrl}
					discordIdentity={verifiedDiscordIdentity}
					applicationStatusId={submitState.applicationStatusId}
					variant='retail'
				/>
			</div>
		);
	}

	const submitting = submitState.status === 'submitting';

	return (
		<form
			onSubmit={onSubmit}
			className='surface overflow-hidden'
			encType='multipart/form-data'>
			<input type='hidden' name='applicationType' value='retail' />
			{applicationToken ? (
				<input type='hidden' name='applicationToken' value={applicationToken} />
			) : null}
			<div className='border-b border-white/8 px-5 py-6 sm:px-8 sm:py-7'>
				<div className='flex items-start gap-4'>
					<div className='grid size-11 shrink-0 place-items-center rounded-[0.625rem] border border-[rgba(198,166,108,0.35)] bg-[rgba(198,166,108,0.08)] text-[var(--accent-strong)]'>
						<ShieldCheck size={21} strokeWidth={1.7} aria-hidden='true' />
					</div>
					<div>
						<h2 className='display-font text-[1.85rem] leading-tight'>
							Apply to Last Try
						</h2>
						<p className='mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]'>
							Give us enough detail to understand the player behind the
							character. Required fields are marked with an asterisk.
						</p>
					</div>
				</div>
			</div>

			<div className='grid gap-9 px-5 py-7 sm:px-8 sm:py-9'>
				<fieldset className={`rounded-[0.75rem] border p-5 transition-colors sm:p-6 ${characterSource === 'battlenet' ? 'border-[#148eff]/30 bg-[#148eff]/[0.035]' : 'border-[rgba(198,166,108,0.28)] bg-[rgba(198,166,108,0.055)]'}`}>
					<legend className='display-font px-2 text-[1.55rem] leading-tight text-[var(--foreground)]'>
						Your Retail character
					</legend>
					<p className='mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]'>
						Connect Battle.net to verify character ownership, or enter your character details manually.
					</p>
					<div className='mt-5'>
						<BattleNetIdentityControl variant='retail' source={characterSource} sourceName='characterSource' onSourceChange={selectCharacterSource} controller={battleNetIdentity} disabled={submitting} />
						{characterSource === 'battlenet' && battleNetIdentity.identity.status === 'connected' ? (
							<BattleNetCharacterPicker disabled={submitting} />
						) : characterSource === 'manual' ? (
							<div className='mt-6 border-t border-white/10 pt-6'>
							<div className='grid gap-5 sm:grid-cols-2'>
								<Field label='Character name' name='characterName' required>
									<input id='characterName' name='characterName' required maxLength={40} placeholder='Examplemage' className={inputClass} disabled={submitting} />
								</Field>
								<Field label='Realm' name='realm' required>
									<input id='realm' name='realm' required maxLength={80} placeholder='Tarren Mill' className={inputClass} disabled={submitting} />
								</Field>
								<Field label='Class' name='className' required>
									<select id='className' name='className' required defaultValue='' className={inputClass} disabled={submitting}>
										<option value='' disabled>Select a class</option>
										{wowClasses.map((className) => <option key={className} value={className}>{className}</option>)}
									</select>
								</Field>
								<div className='sm:col-span-2'>
									<Field label='Specialisation' name='specialization' required>
										<input id='specialization' name='specialization' required maxLength={80} placeholder='Arcane' className={inputClass} disabled={submitting} />
									</Field>
								</div>
								<p className='sm:col-span-2 text-xs leading-5 text-[var(--muted)]'>Manually entered characters are not ownership verified.</p>
							</div>
							</div>
						) : null}
					</div>
				</fieldset>

				<div className='h-px bg-white/8' aria-hidden='true' />

				<FormSection
					title='About you'
					description='These details let our officers identify you and get back in touch.'>
					<div className='grid gap-5 sm:grid-cols-2'>
						<Field label='Discord username' name='discordUsername' required>
							<input
								id='discordUsername'
								name='discordUsername'
								required
								maxLength={80}
								autoComplete='username'
								placeholder='yourname'
								defaultValue={verifiedDiscordIdentity?.discordTag}
								readOnly={Boolean(verifiedDiscordIdentity)}
								tabIndex={verifiedDiscordIdentity ? -1 : undefined}
								onFocus={verifiedDiscordIdentity ? blurReadOnlyField : undefined}
								aria-describedby={verifiedDiscordIdentity ? 'discordUsernameVerified' : undefined}
								className={`${inputClass} read-only:pointer-events-none read-only:cursor-default read-only:select-none read-only:border-[#5865f2]/45 read-only:bg-[#5865f2]/8 read-only:text-[#b5b8c8] read-only:caret-transparent read-only:focus:border-[#5865f2]/45`}
								disabled={submitting}
							/>
							{verifiedDiscordIdentity ? (
								<p
									id='discordUsernameVerified'
									className='mt-2 flex items-center gap-1.5 text-xs font-bold text-[#8792ff]'>
									<CheckCircle2 size={14} strokeWidth={2} aria-hidden='true' />
									Verified from Discord
								</p>
							) : null}
						</Field>
						<Field
							label='Email address'
							name='email'
							hint='Optional backup contact.'>
							<input
								id='email'
								name='email'
								type='email'
								maxLength={160}
								autoComplete='email'
								placeholder='you@example.com'
								className={inputClass}
								disabled={submitting}
							/>
						</Field>
						<Field label='Country' name='country' required>
							<input
								id='country'
								name='country'
								required
								maxLength={80}
								autoComplete='country-name'
								placeholder='United Kingdom'
								className={inputClass}
								disabled={submitting}
							/>
						</Field>
						<Field label='Age' name='age' required>
							<input
								id='age'
								name='age'
								type='number'
								required
								min={13}
								max={100}
								inputMode='numeric'
								placeholder='Age'
								className={`${inputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
								disabled={submitting}
							/>
						</Field>
					</div>
				</FormSection>

				{characterSource === 'manual' ? (
					<>
						<div className='h-px bg-white/8' aria-hidden='true' />

						<FormSection
							title='Character logs'
							description='Add the Warcraft Logs profile or report you want us to review. This link is supplied manually and is not ownership verified.'>
							<Field
								label='Warcraft Logs URL'
								name='warcraftLogsUrl'
								hint='Link a recent report or your character profile.'
								required>
								<input
									id='warcraftLogsUrl'
									name='warcraftLogsUrl'
									type='url'
									required
									maxLength={500}
									inputMode='url'
									autoComplete='url'
									placeholder='https://www.warcraftlogs.com/character/...'
									value={manualWarcraftLogsUrl}
									onChange={(event) => setManualWarcraftLogsUrl(event.currentTarget.value)}
									className={inputClass}
									disabled={submitting}
								/>
							</Field>
						</FormSection>
					</>
				) : null}

				<div className='h-px bg-white/8' aria-hidden='true' />

				<FormSection
					title='Availability and communication'
					description='Progression works best when expectations are clear from the start.'>
					<div>
						<p className='mb-2 text-sm font-bold'>English ability</p>
						<div className='grid gap-2.5 sm:grid-cols-3'>
							{englishLevels.map((level) => (
								<label key={level} className={choiceClass}>
									<input
										type='radio'
										name='englishAbility'
										value={level}
										className='size-4 accent-[var(--accent-strong)]'
										disabled={submitting}
									/>
									{level}
								</label>
							))}
						</div>
					</div>
					<div>
						<p className='mb-1 text-sm font-bold'>Raid nights</p>
						<p className='mb-3 text-xs leading-5 text-[var(--muted)]'>
							Select every night you can reliably attend.
						</p>
						<div className='grid gap-2.5 sm:grid-cols-2'>
							{raidNights.map((night) => (
								<label key={night} className={choiceClass}>
									<input
										type='checkbox'
										name='availability'
										value={night}
										className='size-4 rounded accent-[var(--accent-strong)]'
										disabled={submitting}
									/>
									{night}
								</label>
							))}
						</div>
					</div>
					<div>
						<p className='mb-2 text-sm font-bold'>
							Do you have a microphone and can you speak during raids?
						</p>
						<div className='grid gap-2.5 sm:grid-cols-2'>
							{microphoneOptions.map((option) => (
								<label key={option} className={choiceClass}>
									<input
										type='radio'
										name='microphone'
										value={option}
										className='size-4 accent-[var(--accent-strong)]'
										disabled={submitting}
									/>
									{option}
								</label>
							))}
						</div>
					</div>
				</FormSection>

				<div className='h-px bg-white/8' aria-hidden='true' />

				<FormSection
					title='Experience and fit'
					description='Specific examples are more useful than perfect answers.'>
					{recruitmentQuestions.map((question) => (
						<Field
							key={question.name}
							label={question.label}
							name={question.name}
							required={question.required}>
							<textarea
								id={question.name}
								name={question.name}
								required={question.required}
								maxLength={2000}
								rows={5}
								className={`${inputClass} min-h-32 resize-y leading-6`}
								disabled={submitting}
							/>
						</Field>
					))}
					<Field
						label='Were you referred by someone? If so, who?'
						name='referral'
						hint='Enter “No” if you were not referred.'
						required>
						<input
							id='referral'
							name='referral'
							required
							maxLength={300}
							placeholder='No, or their name or character'
							className={inputClass}
							disabled={submitting}
						/>
					</Field>
					<Field
						label='Screenshot of your UI'
						name='uiScreenshot'
						hint='Optional. JPG, PNG, or WebP, up to 4 MB.'>
						<label
							className={`${choiceClass} min-h-20 justify-center border-dashed text-center`}>
							<FileImage size={20} strokeWidth={1.7} aria-hidden='true' />
							<span>{screenshotName || 'Choose an image'}</span>
							<input
								id='uiScreenshot'
								name='uiScreenshot'
								type='file'
								accept='image/jpeg,image/png,image/webp'
								className='sr-only'
								disabled={submitting}
								onChange={(event) =>
									setScreenshotName(event.currentTarget.files?.[0]?.name ?? '')
								}
							/>
						</label>
					</Field>
				</FormSection>

				<div className='hidden' aria-hidden='true'>
					<label htmlFor='website'>Website</label>
					<input id='website' name='website' tabIndex={-1} autoComplete='off' />
				</div>

				<div className='border-t border-white/8 pt-7'>
					<label className='flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#c8c5be]'>
						<input
							type='checkbox'
							name='consent'
							value='accepted'
							required
							className='mt-1 size-4 shrink-0 accent-[var(--accent-strong)]'
							disabled={submitting}
						/>
						<span>
							I understand that this application and any uploaded screenshot
							will be shared privately with the Last Try officer team in Discord
							for recruitment review.
						</span>
					</label>

					{submitState.status === 'error' ? (
						<div
							className='mt-5 rounded-[0.625rem] border border-[#d97972]/40 bg-[#d97972]/10 px-4 py-3 text-sm leading-6 text-[#efa39d]'
							role='alert'>
							<p>{submitState.message}</p>
							{discordInviteUrl ? (
								<a
									href={discordInviteUrl}
									target='_blank'
									rel='noreferrer'
									className='button-secondary recruitment-link--retail mt-3'>
									<MessageCircle
										aria-hidden='true'
										size={17}
										strokeWidth={1.8}
									/>
									Join Discord for help
									<ArrowUpRight
										aria-hidden='true'
										size={16}
										strokeWidth={1.8}
									/>
								</a>
							) : null}
						</div>
					) : null}

					<div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
						<p className='max-w-md text-xs leading-5 text-[var(--muted)]'>
							Your application is not stored on this website.
						</p>
						<button
							type='submit'
							className='button-primary min-w-44'
							disabled={submitting}>
							{submitting ? 'Sending application...' : 'Submit application'}
							{!submitting ? (
								<Send size={16} strokeWidth={1.8} aria-hidden='true' />
							) : null}
						</button>
					</div>
				</div>
			</div>
		</form>
	);
}

function ForeverApplicationForm({
	discordInviteUrl,
	verifiedDiscordIdentity,
	applicationToken,
	battleNetIdentity,
}: {
	discordInviteUrl?: string;
	verifiedDiscordIdentity?: VerifiedDiscordIdentity;
	applicationToken?: string;
	battleNetIdentity: BattleNetIdentityController;
}) {
	const [submitState, setSubmitState] = useState<SubmitState>({
		status: 'idle',
	});
	const [battleTagSource, setBattleTagSource] = useState<BattleTagSource>('battlenet');

	const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;
		setSubmitState({ status: 'submitting' });

		try {
			const response = await fetch('/api/recruitment', {
				method: 'POST',
				body: new FormData(form),
			});
			const result = (await response.json().catch(() => null)) as {
				error?: string;
				applicationStatusId?: string;
			} | null;

			if (!response.ok) {
				throw new Error(
					result?.error || 'The application could not be submitted.',
				);
			}

			form.reset();
			setSubmitState({ status: 'success', applicationStatusId: result?.applicationStatusId });
		} catch (error) {
			setSubmitState({
				status: 'error',
				message:
					error instanceof Error
						? error.message
						: 'The application could not be submitted.',
			});
		}
	};

	if (submitState.status === 'success') {
		return (
			<div
				className='overflow-hidden rounded-[0.75rem] border border-[#79c9c2]/30 bg-[#0a1716]/90 p-7 shadow-[inset_0_1px_0_rgba(174,237,226,0.06)] sm:p-10'
				role='status'>
				<CheckCircle2
					className='text-[#8ee0d6]'
					size={32}
					strokeWidth={1.6}
					aria-hidden='true'
				/>
				<h2 className='display-font mt-5 text-[2rem] leading-tight'>
					Forever application sent
				</h2>
				<p className='mt-3 max-w-xl text-sm leading-7 text-[#9bb2ae]'>
					Your application is now with the Last Try Forever team. Complete the
					steps below so we can get in touch.
				</p>
				<ApplicationNextSteps
					discordInviteUrl={discordInviteUrl}
					discordIdentity={verifiedDiscordIdentity}
					applicationStatusId={submitState.applicationStatusId}
					variant='forever'
				/>
			</div>
		);
	}

	const submitting = submitState.status === 'submitting';

	return (
		<form
			onSubmit={onSubmit}
			className='overflow-hidden rounded-[0.75rem] border border-[#79c9c2]/28 bg-[radial-gradient(circle_at_88%_0%,rgba(72,160,149,0.14),transparent_22rem),rgba(9,20,19,0.92)] [--accent-strong:#8ee0d6] [--muted:#839d98] shadow-[inset_0_1px_0_rgba(174,237,226,0.06)]'
			encType='multipart/form-data'>
			<input type='hidden' name='applicationType' value='forever' />
			{applicationToken ? (
				<input type='hidden' name='applicationToken' value={applicationToken} />
			) : null}
			<div className='border-b border-[#79c9c2]/14 px-5 py-6 sm:px-8 sm:py-7'>
				<div className='flex items-start gap-4'>
					<div className='grid size-11 shrink-0 place-items-center rounded-[0.5rem] border border-[#79c9c2]/40 bg-[#79c9c2]/10 text-[#8ee0d6]'>
						<Compass size={21} strokeWidth={1.7} aria-hidden='true' />
					</div>
					<div>
						<p className='mb-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#79c9c2]'>
							A new beginning
						</p>
						<h2 className='display-font text-[1.85rem] leading-tight text-[#f1faf8]'>
							Join us in Warcraft Forever
						</h2>
						<p className='mt-2 max-w-2xl text-sm leading-6 text-[#9bb2ae]'>
							This is a fresh-start community application. We care more about
							how you want to explore, play, and contribute than old character
							records.
						</p>
					</div>
				</div>
			</div>

			<div className='grid gap-9 px-5 py-7 text-[#eef9f6] sm:px-8 sm:py-9'>
				<FormSection
					title='Your adventurer'
					description='Tell us who you are and how our officers can reach you.'>
					<BattleNetIdentityControl variant='forever' source={battleTagSource} sourceName='battleTagSource' onSourceChange={setBattleTagSource} controller={battleNetIdentity} disabled={submitting} />
					<div className='grid gap-5 sm:grid-cols-2'>
						<Field
							label='Discord username'
							name='foreverDiscordUsername'
							required>
							<input
								id='foreverDiscordUsername'
								name='discordUsername'
								required
								maxLength={80}
								autoComplete='username'
								placeholder='yourname'
								defaultValue={verifiedDiscordIdentity?.discordTag}
								readOnly={Boolean(verifiedDiscordIdentity)}
								tabIndex={verifiedDiscordIdentity ? -1 : undefined}
								onFocus={verifiedDiscordIdentity ? blurReadOnlyField : undefined}
								aria-describedby={verifiedDiscordIdentity ? 'foreverDiscordUsernameVerified' : undefined}
								className={`${foreverInputClass} read-only:pointer-events-none read-only:cursor-default read-only:select-none read-only:border-[#79c9c2]/50 read-only:bg-[#79c9c2]/8 read-only:text-[#aec5c1] read-only:caret-transparent read-only:focus:border-[#79c9c2]/50`}
								disabled={submitting}
							/>
							{verifiedDiscordIdentity ? (
								<p
									id='foreverDiscordUsernameVerified'
									className='mt-2 flex items-center gap-1.5 text-xs font-bold text-[#8ee0d6]'>
									<CheckCircle2 size={14} strokeWidth={2} aria-hidden='true' />
									Verified from Discord
								</p>
							) : null}
						</Field>
						<Field
							label='Email address'
							name='foreverEmail'
							hint='Optional backup contact.'>
							<input
								id='foreverEmail'
								name='email'
								type='email'
								maxLength={160}
								autoComplete='email'
								placeholder='you@example.com'
								className={foreverInputClass}
								disabled={submitting}
							/>
						</Field>
						<Field label='Country or timezone' name='foreverCountry' required>
							<input
								id='foreverCountry'
								name='country'
								required
								maxLength={80}
								autoComplete='country-name'
								placeholder='United Kingdom / GMT'
								className={foreverInputClass}
								disabled={submitting}
							/>
						</Field>
						<Field label='Age' name='foreverAge' required>
							<input
								id='foreverAge'
								name='age'
								type='number'
								required
								min={13}
								max={100}
								inputMode='numeric'
								placeholder='Age'
								className={`${foreverInputClass} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
								disabled={submitting}
							/>
						</Field>
					</div>
				</FormSection>

				<div className='h-px bg-[#79c9c2]/14' aria-hidden='true' />

				<FormSection
					title='The path you want to take'
					description='Nothing here locks you in. It gives us a useful picture of the guild you want to help build.'>
					<div>
						<p className='mb-1 text-sm font-bold'>Roles that interest you</p>
						<p className='mb-3 text-xs leading-5 text-[#839d98]'>
							Choose as many as apply.
						</p>
						<div className='grid gap-2.5 sm:grid-cols-2'>
							{foreverRoles.map((role) => (
								<label key={role} className={foreverChoiceClass}>
									<input
										type='checkbox'
										name='roleInterests'
										value={role}
										className='size-4 rounded accent-[#8ee0d6]'
										disabled={submitting}
									/>
									{role}
								</label>
							))}
						</div>
					</div>
					<Field
						label='What class or character ideas are you considering?'
						name='characterPlans'
						hint='It is completely fine to be undecided.'
						required>
						<textarea
							id='characterPlans'
							name='characterPlans'
							required
							maxLength={1200}
							rows={4}
							className={`${foreverInputClass} min-h-28 resize-y leading-6`}
							disabled={submitting}
						/>
					</Field>
					<div>
						<p className='mb-1 text-sm font-bold'>
							What do you want from Forever?
						</p>
						<p className='mb-3 text-xs leading-5 text-[#839d98]'>
							Choose the parts of the journey that matter to you.
						</p>
						<div className='grid gap-2.5 sm:grid-cols-2'>
							{foreverGoals.map((goal) => (
								<label key={goal} className={foreverChoiceClass}>
									<input
										type='checkbox'
										name='gameGoals'
										value={goal}
										className='size-4 rounded accent-[#8ee0d6]'
										disabled={submitting}
									/>
									{goal}
								</label>
							))}
						</div>
					</div>
				</FormSection>

				<div className='h-px bg-[#79c9c2]/14' aria-hidden='true' />

				<FormSection
					title='Experience and expectations'
					description='We welcome different backgrounds. Honest answers help us shape the right community from day one.'>
					<div>
						<p className='mb-2 text-sm font-bold'>Your Warcraft background</p>
						<div className='grid gap-2.5 sm:grid-cols-2'>
							{foreverExperienceLevels.map((level) => (
								<label key={level} className={foreverChoiceClass}>
									<input
										type='radio'
										name='experienceLevel'
										value={level}
										required
										className='size-4 accent-[#8ee0d6]'
										disabled={submitting}
									/>
									{level}
								</label>
							))}
						</div>
					</div>
					<Field
						label='When do you usually expect to play?'
						name='typicalAvailability'
						hint='Include days, approximate times, and timezone.'
						required>
						<textarea
							id='typicalAvailability'
							name='typicalAvailability'
							required
							maxLength={1200}
							rows={4}
							className={`${foreverInputClass} min-h-28 resize-y leading-6`}
							disabled={submitting}
						/>
					</Field>
					<Field
						label='What would make Last Try a lasting home for you?'
						name='foreverMotivation'
						required>
						<textarea
							id='foreverMotivation'
							name='foreverMotivation'
							required
							maxLength={2000}
							rows={5}
							className={`${foreverInputClass} min-h-32 resize-y leading-6`}
							disabled={submitting}
						/>
					</Field>
					<Field
						label='How do you like to contribute to a guild community?'
						name='communityContribution'
						required>
						<textarea
							id='communityContribution'
							name='communityContribution'
							required
							maxLength={2000}
							rows={5}
							className={`${foreverInputClass} min-h-32 resize-y leading-6`}
							disabled={submitting}
						/>
					</Field>
					<Field
						label='Were you referred by someone? If so, who?'
						name='foreverReferral'
						hint='Enter “No” if you were not referred.'
						required>
						<input
							id='foreverReferral'
							name='referral'
							required
							maxLength={300}
							placeholder='No, or their name'
							className={foreverInputClass}
							disabled={submitting}
						/>
					</Field>
				</FormSection>

				<div className='hidden' aria-hidden='true'>
					<label htmlFor='foreverWebsite'>Website</label>
					<input
						id='foreverWebsite'
						name='website'
						tabIndex={-1}
						autoComplete='off'
					/>
				</div>

				<div className='border-t border-[#79c9c2]/14 pt-7'>
					<label className='flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#bdd0cc]'>
						<input
							type='checkbox'
							name='consent'
							value='accepted'
							required
							className='mt-1 size-4 shrink-0 accent-[#8ee0d6]'
							disabled={submitting}
						/>
						<span>
							I understand that this application will be shared privately with
							the Last Try officer team in Discord for recruitment review.
						</span>
					</label>

					{submitState.status === 'error' ? (
						<div
							className='mt-5 rounded-[0.5rem] border border-[#d97972]/40 bg-[#d97972]/10 px-4 py-3 text-sm leading-6 text-[#efa39d]'
							role='alert'>
							<p>{submitState.message}</p>
							{discordInviteUrl ? (
								<a
									href={discordInviteUrl}
									target='_blank'
									rel='noreferrer'
									className='button-secondary recruitment-link--forever mt-3'>
									<MessageCircle
										aria-hidden='true'
										size={17}
										strokeWidth={1.8}
									/>
									Join Discord for help
									<ArrowUpRight
										aria-hidden='true'
										size={16}
										strokeWidth={1.8}
									/>
								</a>
							) : null}
						</div>
					) : null}

					<div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
						<p className='max-w-md text-xs leading-5 text-[#839d98]'>
							Your application is not stored on this website.
						</p>
						<button
							type='submit'
							className='button-primary button-forever min-w-44'
							disabled={submitting}>
							{submitting
								? 'Sending application...'
								: 'Submit Forever application'}
							{!submitting ? (
								<Send size={16} strokeWidth={1.8} aria-hidden='true' />
							) : null}
						</button>
					</div>
				</div>
			</div>
		</form>
	);
}

export function RecruitmentApplicationForm({
	discordInviteUrl,
	applicationType,
	verifiedDiscordIdentity,
	applicationToken,
}: {
	discordInviteUrl?: string;
	applicationType: ApplicationType;
	verifiedDiscordIdentity?: VerifiedDiscordIdentity;
	applicationToken?: string;
}) {
	const battleNetIdentity = useBattleNetIdentity();

	return applicationType === 'retail' ? (
		<RetailApplicationForm
			discordInviteUrl={discordInviteUrl}
			verifiedDiscordIdentity={verifiedDiscordIdentity}
			applicationToken={applicationToken}
			battleNetIdentity={battleNetIdentity}
		/>
	) : (
		<ForeverApplicationForm
			discordInviteUrl={discordInviteUrl}
			verifiedDiscordIdentity={verifiedDiscordIdentity}
			applicationToken={applicationToken}
			battleNetIdentity={battleNetIdentity}
		/>
	);
}
