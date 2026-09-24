'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, type CSSProperties } from 'react';

import { MarksLogo } from '@/components/ui/MarksLogo';
import { guildConfig } from '@/config/guild';

type Ember = {
	left: number;
	bottom: number;
	size: number;
	duration: number;
	delay: number;
	rise: number;
	x1: number;
	x2: number;
	x3: number;
	x4: number;
	opacity: number;
	blur: number;
};

function createEmbers(count: number, seed: number): Ember[] {
	let state = seed >>> 0;
	const random = () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 4294967296;
	};
	const between = (min: number, max: number) => min + random() * (max - min);
	const round = (value: number) => Number(value.toFixed(2));

	return Array.from({ length: count }, () => {
		const sizeRoll = random();
		const size =
			sizeRoll < 0.62
				? between(0.5, 1.7)
				: sizeRoll < 0.93
					? between(1.8, 3.8)
					: between(4.2, 5.8);
		const x1 = between(-18, 18);
		const x2 = x1 + between(-28, 28);
		const x3 = x2 + between(-34, 34);
		const x4 = x3 + between(-42, 42);
		const duration = between(4.2, 18.2);

		return {
			left: round(between(2, 98)),
			bottom: round(between(-5, 7)),
			size: round(size),
			duration: round(duration),
			delay: round(between(-duration, -0.2)),
			rise: round(between(36, 82)),
			x1: round(x1),
			x2: round(x2),
			x3: round(x3),
			x4: round(x4),
			opacity: round(between(0.44, 0.94)),
			blur: round(between(0, size > 4 ? 0.28 : 0.16)),
		};
	});
}

const embers = createEmbers(28, 0x6c617374);

type EmberStyle = CSSProperties & {
	'--ember-size': string;
	'--ember-height': string;
	'--ember-duration': string;
	'--ember-delay': string;
	'--ember-x1': string;
	'--ember-x2': string;
	'--ember-x3': string;
	'--ember-x4': string;
	'--ember-y1': string;
	'--ember-y2': string;
	'--ember-y3': string;
	'--ember-rise': string;
	'--ember-opacity': number;
	'--ember-blur': string;
	'--ember-glow-near': string;
	'--ember-glow-far': string;
};

export function Hero() {
	const reduceMotion = useReducedMotion();
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) return;
		if (reduceMotion) {
			video.pause();
			video.currentTime = 0;
		} else {
			void video.play().catch(() => undefined);
		}
		return () => video.pause();
	}, [reduceMotion]);

	return (
		<section className='relative isolate flex min-h-[100dvh] items-end overflow-hidden pb-12 pt-24 sm:pb-16 lg:pb-20'>
			<video
				ref={videoRef}
				className='absolute inset-0 -z-30 size-full object-cover object-[70%_center] sm:object-center'
				autoPlay
				muted
				loop
				playsInline
				preload='metadata'
				poster='/images/hero-poster.jpg'
				aria-hidden='true'>
				<source src='/videos/hero-video.mp4' type='video/mp4' />
			</video>
			<div
				className='absolute inset-0 -z-20 bg-[#080a0c]/30'
				aria-hidden='true'
			/>
			<div
				className='absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(8,10,12,0.72)_0%,rgba(8,10,12,0.48)_42%,rgba(8,10,12,0.08)_76%)]'
				aria-hidden='true'
			/>
			<div
				className='absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(8,10,12,0.72)_100%)]'
				aria-hidden='true'
			/>
			<div
				className='absolute inset-x-0 bottom-0 -z-10 h-[58%] bg-gradient-to-t from-[#080a0c] via-[#080a0c]/82 to-transparent'
				aria-hidden='true'
			/>

			{!reduceMotion && (
				<div className='hero-embers' aria-hidden='true'>
					{embers.map((ember, index) => (
						<span
							className='hero-ember'
							key={`${ember.left}-${index}`}
							style={
								{
									left: `${ember.left}%`,
									bottom: `${ember.bottom}%`,
									'--ember-size': `${ember.size}px`,
									'--ember-height': `${Math.max(ember.size * 1.7, 1.5)}px`,
									'--ember-duration': `${ember.duration}s`,
									'--ember-delay': `${ember.delay}s`,
									'--ember-x1': `${ember.x1}px`,
									'--ember-x2': `${ember.x2}px`,
									'--ember-x3': `${ember.x3}px`,
									'--ember-x4': `${ember.x4}px`,
									'--ember-y1': `${ember.rise * -0.22}vh`,
									'--ember-y2': `${ember.rise * -0.47}vh`,
									'--ember-y3': `${ember.rise * -0.72}vh`,
									'--ember-rise': `${-ember.rise}vh`,
									'--ember-opacity': ember.opacity,
									'--ember-blur': `${ember.blur}px`,
									'--ember-glow-near': `${Math.max(5, ember.size * 2.4)}px`,
									'--ember-glow-far': `${Math.max(12, ember.size * 5.2)}px`,
								} as EmberStyle
							}
						/>
					))}
				</div>
			)}

			<div className='section-shell relative z-10 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_17rem]'>
				<motion.div
					initial={reduceMotion ? false : 'hidden'}
					animate='visible'
					variants={{
						hidden: { opacity: 0, y: 28 },
						visible: {
							opacity: 1,
							y: 0,
							transition: {
								duration: 0.85,
								ease: [0.16, 1, 0.3, 1],
								staggerChildren: 0.09,
							},
						},
					}}
					className='max-w-[62rem]'>
					<motion.p
						variants={{
							hidden: { opacity: 0, y: 14 },
							visible: { opacity: 1, y: 0 },
						}}
						className='mb-4 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--accent-strong)] sm:mb-5 sm:tracking-[0.18em] lg:tracking-[0.32em]'>
						Retail seasons <span className='mx-1.5 text-white/35'>/</span> Warcraft Forever <span className='mx-1.5 text-white/35'>/</span> One community
					</motion.p>
					<motion.div
						variants={{
							hidden: { opacity: 0, y: 18 },
							visible: { opacity: 1, y: 0 },
						}}
						className='flex items-center gap-[clamp(0.35rem,1.1vw,1.25rem)]'>
						<MarksLogo
							className='h-[clamp(7rem,19vw,14rem)] w-[clamp(4.75rem,13vw,9.5rem)] shrink-0'
							priority
							sizes='(max-width: 640px) 76px, 152px'
						/>
						<h1 className='brand-font translate-y-[clamp(0.4rem,1vw,0.875rem)] text-[clamp(4rem,10vw,7.75rem)] leading-[0.84] tracking-[-0.02em] text-[var(--foreground)]'>
							LAST
							<br />
							TRY
						</h1>
					</motion.div>
					<motion.p
						variants={{
							hidden: { opacity: 0, y: 16 },
							visible: { opacity: 1, y: 0 },
						}}
						className='mt-5 max-w-[35rem] text-[15px] leading-7 text-[#ebe7df] sm:text-[17px]'>
						Push every Retail season with us, then build a lasting home together
						in Warcraft Forever. One guild, two adventures.
					</motion.p>
					<motion.div
						variants={{
							hidden: { opacity: 0, y: 14 },
							visible: { opacity: 1, y: 0 },
						}}
						className='mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5'>
						<Link href='/recruitment' className='button-primary'>
							Join Last Try{' '}
							<ArrowRight aria-hidden='true' size={17} strokeWidth={1.8} />
						</Link>
						<a
							href='#progression'
							className='group inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-[#e4e0d8] transition-colors hover:text-[var(--accent-strong)]'>
							View progression
							<span aria-hidden='true' className='h-px w-5 bg-current transition-[width] duration-200 group-hover:w-8' />
						</a>
					</motion.div>
				</motion.div>

				<div className='hidden border-l border-white/16 pl-6 lg:block'>
					<p className='display-font text-lg leading-7 tracking-[-0.015em] text-[#e7e3db]'>
						{guildConfig.tagline}
					</p>
				</div>
			</div>
		</section>
	);
}
