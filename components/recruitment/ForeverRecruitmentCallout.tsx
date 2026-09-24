import { ArrowRight, Clock3, Compass, Flag, Hammer, UsersRound } from 'lucide-react';
import Link from 'next/link';

export function ForeverRecruitmentCallout({
	compact = false,
	showCta = true,
}: {
	compact?: boolean;
	showCta?: boolean;
}) {
	return (
		<article className='relative overflow-hidden rounded-[0.75rem] border border-[#79c9c2]/30 bg-[radial-gradient(circle_at_88%_8%,rgba(72,160,149,0.18),transparent_18rem),#0a1716] p-6 shadow-[inset_0_1px_0_rgba(174,237,226,0.06)] sm:p-7'>
			<div
				className='absolute inset-y-0 left-0 w-1 bg-[#79c9c2]'
				aria-hidden='true'
			/>
			<div className='flex items-start justify-between gap-5'>
				<div>
					<p className='flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#79c9c2]'>
						<Flag size={14} strokeWidth={1.8} aria-hidden='true' /> Warcraft
						Forever
					</p>
					<h3
						className={`display-font mt-4 text-[#f1faf8] ${compact ? 'text-[1.65rem]' : 'text-[2rem]'} leading-[1.08]`}>
						Everyone is welcome.
					</h3>
				</div>
				<Compass
					className='hidden shrink-0 text-[#8ee0d6] opacity-80 sm:block'
					size={30}
					strokeWidth={1.4}
					aria-hidden='true'
				/>
			</div>

			<p className='mt-4 max-w-xl text-sm leading-6 text-[#9bb2ae]'>
				We are building the Last Try guild in Warcraft Forever from day one. New
				players, returning veterans, every role, and every playstyle can apply.
				Whether you want to level at your own pace, tackle group content, or help
				shape the community, there is a place for you.
			</p>

			<div className='mt-6 grid gap-2.5 text-sm text-[#c9dbd7]'>
				<p className='flex items-center gap-2.5'>
					<UsersRound
						className='text-[#79c9c2]'
						size={16}
						strokeWidth={1.7}
						aria-hidden='true'
					/>{' '}
					No previous experience required
				</p>
				<p className='flex items-center gap-2.5'>
					<Compass
						className='text-[#79c9c2]'
						size={16}
						strokeWidth={1.7}
						aria-hidden='true'
					/>{' '}
					All roles and goals considered
				</p>
				<p className='flex items-center gap-2.5'>
					<Clock3
						className='text-[#79c9c2]'
						size={16}
						strokeWidth={1.7}
						aria-hidden='true'
					/>{' '}
					Level at your own pace
				</p>
				<p className='flex items-center gap-2.5'>
					<Hammer
						className='text-[#79c9c2]'
						size={16}
						strokeWidth={1.7}
						aria-hidden='true'
					/>{' '}
					Help shape the guild from day one
				</p>
			</div>

			{showCta ? (
				<Link
					href='/recruitment?application=forever#application'
					className='button-primary button-forever mt-7'>
					Apply to Warcraft Forever{' '}
					<ArrowRight aria-hidden='true' size={17} strokeWidth={1.8} />
				</Link>
			) : null}
		</article>
	);
}
