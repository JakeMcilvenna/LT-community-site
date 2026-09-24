export function BattleNetMark({ className = '' }: { className?: string }) {
	return (
		<svg viewBox='0 0 24 24' fill='none' className={className} aria-hidden='true'>
			<ellipse cx='12' cy='12' rx='9' ry='4.25' stroke='currentColor' strokeWidth='1.7' />
			<ellipse cx='12' cy='12' rx='9' ry='4.25' stroke='currentColor' strokeWidth='1.7' transform='rotate(60 12 12)' />
			<ellipse cx='12' cy='12' rx='9' ry='4.25' stroke='currentColor' strokeWidth='1.7' transform='rotate(120 12 12)' />
			<circle cx='12' cy='12' r='1.4' fill='currentColor' />
		</svg>
	);
}
