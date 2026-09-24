'use client';

import { useCallback, useEffect, useState } from 'react';

import { CHARACTER_SELECTION_STORAGE_KEY, MANUAL_BATTLE_TAG_STORAGE_KEY } from '@/components/recruitment/recruitment-storage';
import type { BattleNetRegion } from '@/lib/battlenet/types';

const oauthErrorMessages: Record<string, string> = {
	cancelled: 'Battle.net authorization was cancelled. Connect again when you are ready.',
	invalid_state: 'The Battle.net sign-in could not be verified. Please connect again.',
	expired_state: 'The Battle.net sign-in expired. Please connect again.',
	missing_code: 'Battle.net did not return an authorization code. Please connect again.',
	provider_failure: 'Battle.net could not complete the connection. Please try again shortly.',
	unavailable: 'Battle.net connection is not configured or is temporarily unavailable.',
	invalid_request: 'The Battle.net connection request was invalid. Please try again.',
};

type BattleNetIdentity =
	| { status: 'loading'; battleTag: ''; region: BattleNetRegion; error: '' }
	| { status: 'disconnected'; battleTag: ''; region: BattleNetRegion; error: string }
	| { status: 'connected'; battleTag: string; region: BattleNetRegion; error: '' };

export type BattleNetIdentityController = {
	identity: BattleNetIdentity;
	manualBattleTag: string;
	setManualBattleTag: (battleTag: string) => void;
	connect: (region: BattleNetRegion) => void;
	disconnect: () => Promise<void>;
};

export function useBattleNetIdentity(): BattleNetIdentityController {
	const [identity, setIdentity] = useState<BattleNetIdentity>({
		status: 'loading',
		battleTag: '',
		region: 'eu',
		error: '',
	});
	const [manualBattleTag, setManualBattleTagState] = useState('');

	useEffect(() => {
		const controller = new AbortController();
		const oauthError = new URL(window.location.href).searchParams.get('battlenetError');
		queueMicrotask(() => {
			if (!controller.signal.aborted) {
				setManualBattleTagState(sessionStorage.getItem(MANUAL_BATTLE_TAG_STORAGE_KEY) ?? '');
			}
		});

		void fetch('/api/battlenet/identity', {
			cache: 'no-store',
			signal: controller.signal,
		})
			.then(async (response) => {
				const body = (await response.json().catch(() => null)) as {
					connected?: boolean;
					battleTag?: string;
					region?: BattleNetRegion;
				} | null;
				if (response.ok && body?.connected && body.battleTag && body.region) {
					setIdentity({
						status: 'connected',
						battleTag: body.battleTag,
						region: body.region,
						error: '',
					});
					return;
				}

				setIdentity({
					status: 'disconnected',
					battleTag: '',
					region: 'eu',
					error: oauthError ? oauthErrorMessages[oauthError] ?? 'Battle.net could not be connected.' : '',
				});
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === 'AbortError') return;
				setIdentity({
					status: 'disconnected',
					battleTag: '',
					region: 'eu',
					error: 'Battle.net connection status could not be checked.',
				});
			});

		return () => controller.abort();
	}, []);

	const setManualBattleTag = useCallback((battleTag: string) => {
		setManualBattleTagState(battleTag);
		if (battleTag.trim()) sessionStorage.setItem(MANUAL_BATTLE_TAG_STORAGE_KEY, battleTag);
		else sessionStorage.removeItem(MANUAL_BATTLE_TAG_STORAGE_KEY);
	}, []);

	const connect = useCallback((region: BattleNetRegion) => {
		const current = new URL(window.location.href);
		current.hash = '';
		const target = new URL('/api/auth/battlenet', window.location.origin);
		target.searchParams.set('region', region);
		target.searchParams.set('returnTo', `${current.pathname}${current.search}`);
		window.location.assign(target);
	}, []);

	const disconnect = useCallback(async () => {
		const response = await fetch('/api/auth/battlenet/disconnect', { method: 'POST' });
		if (!response.ok) throw new Error('Battle.net could not be disconnected.');
		sessionStorage.removeItem(CHARACTER_SELECTION_STORAGE_KEY);
		setIdentity((current) => ({
			status: 'disconnected',
			battleTag: '',
			region: current.region,
			error: '',
		}));
	}, []);

	return { identity, manualBattleTag, setManualBattleTag, connect, disconnect };
}
