<script>
	import { onMount } from 'svelte';
	import DrawingCanvas from '$lib/game/DrawingCanvas.svelte';
	import GameEngine from '$lib/game/GameEngine.svelte';
	import Shop from '$lib/game/Shop.svelte';
	import { DefaultSpells } from '$lib/game/spells.js';
	import { GestureTemplates } from '$lib/game/templates.js';
	import { sound } from '$lib/game/SoundManager.js';

	// Svelte 5 Runes for state management
	let gameState = $state('start'); // 'start', 'playing', 'stage_clear', 'shop', 'game_over'
	let gold = $state(150); // Starting gold to buy a spell early
	let score = $state(0);
	let stage = $state(1);
	let playerHp = $state(5);
	let playerMaxHp = $state(5);

	// Spell Inventory
	let deck = $state([
		'pyros_blast',   // Triangle
		'aqua_barrier',  // Circle
		'storm_bolt',    // V-Shape
		'aero_slasher',  // Horizontal Line
		'ray_lance'      // Vertical Line
	]);
	let drawPool = $state([]);
	let activeSpells = $state([]);

	// UI Controls
	let showTutorial = $state(false);
	let muted = $state(false);
	let stageClearSummary = $state({ scoreGained: 0, goldGained: 0 });
	let triggerSpellFn = $state(null);
	let lastCastedSpell = $state(null);
	let castSuccessFlash = $state(false);

	// Helpers
	function getSvgPath(shapeName) {
		const pts = GestureTemplates[shapeName];
		if (!pts || pts.length === 0) return '';
		return 'M ' + pts.map(p => `${p.x} ${p.y}`).join(' L ');
	}

	function translateShapeName(shape) {
		const map = {
			'Triangle': '▲ 三角形',
			'Circle': '● 円',
			'V-Shape': '∨ V字',
			'Caret': '∧ 山型',
			'Horizontal Line': '― 横線(➔)',
			'Vertical Line': '│ 縦線(▲)',
			'Square': '■ 四角形',
			'Z-Shape': 'Z Z字',
			'Heart': '♥ ハート',
			'Spiral': '🌀 渦巻き'
		};
		return map[shape] || shape;
	}

	function shuffleArray(array) {
		const arr = [...array];
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	// Game Control Actions
	function initGame() {
		gold = 150;
		score = 0;
		stage = 1;
		playerHp = playerMaxHp;
		deck = [
			'pyros_blast',
			'aqua_barrier',
			'storm_bolt',
			'aero_slasher',
			'ray_lance'
		];
		startStage();
	}

	function startStage() {
		sound.resume();
		gameState = 'playing';
		playerHp = Math.min(playerMaxHp, playerHp); // Carry HP over

		// Build draw pool and select active 4
		drawPool = shuffleArray(deck);
		activeSpells = [];
		for (let i = 0; i < 4; i++) {
			const id = drawPool.shift();
			const spell = DefaultSpells.find(s => s.id === id);
			activeSpells.push(spell);
		}
	}

	// Triggered when user draws a valid shape
	function handleSpellCast(event) {
		if (gameState !== 'playing') return;

		const { shape, score: matchScore } = event.detail;

		// Find if this shape matches any of our 4 active spells
		const spellIndex = activeSpells.findIndex(s => s && s.shape === shape);

		if (spellIndex > -1) {
			const castedSpell = activeSpells[spellIndex];
			lastCastedSpell = castedSpell;

			// Flash HUD for feedback
			castSuccessFlash = true;
			setTimeout(() => { castSuccessFlash = false; }, 250);

			// Trigger projectile in GameEngine
			if (triggerSpellFn) {
				triggerSpellFn(castedSpell.id, matchScore);
			}

			// Cycle Spell Card: Put casted spell back in bottom of pool, draw next from top
			drawPool.push(castedSpell.id);
			
			const nextId = drawPool.shift();
			const nextSpell = DefaultSpells.find(s => s.id === nextId);
			activeSpells[spellIndex] = nextSpell;
		}
	}

	function handlePlayerHit(event) {
		playerHp = event.detail.newHp;
	}

	function handleHeal(event) {
		playerHp = Math.min(playerMaxHp, playerHp + event.detail.amount);
	}

	function handleStageClear(data) {
		stageClearSummary = {
			scoreGained: data.scoreGained,
			goldGained: data.goldGained
		};
		gold = data.finalGold;
		score = data.finalScore;
		gameState = 'stage_clear';
	}

	function handleGameOver() {
		gameState = 'game_over';
	}

	function goToShop() {
		gameState = 'shop';
	}

	function leaveShop() {
		// Minor carry-over healing between stages
		playerHp = Math.min(playerMaxHp, playerHp + 2);
		stage++;
		startStage();
	}

	function toggleMute() {
		muted = sound.toggleMute();
	}

	onMount(() => {
		sound.init();
	});
</script>

<svelte:head>
	<title>呪紋弾幕 - SPELLWEAVER DANMAKU</title>
	<meta name="description" content="PC・タブレット対応。呪文を描いて放つ、新感覚のジェスチャ弾幕シューティングゲーム" />
</svelte:head>

<!-- Responsive Landscape Enforcer -->
<div class="fixed inset-0 z-50 bg-[#050508] flex flex-col items-center justify-center text-center p-6 md:hidden">
	<div class="w-16 h-16 rounded-2xl border border-dashed border-cyan-400/30 flex items-center justify-center animate-spin mb-4">
		<svg class="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
		</svg>
	</div>
	<p class="text-white font-bold tracking-wide text-sm">画面を横向きにしてください</p>
	<p class="text-zinc-500 text-xs mt-2 max-w-[240px]">
		このゲームは左右分割画面デザインのため、ランドスケープ（横長）モードでのプレイに最適化されています。
	</p>
</div>

<!-- Main Game Application Layout -->
<main 
	class="w-screen h-screen overflow-hidden text-zinc-100 font-sans flex items-center justify-center relative select-none transition-all duration-500"
	style="background: radial-gradient(circle at center, rgb({5 + Math.round(50 * (1 - playerHp/playerMaxHp))}, 5, {8 + Math.round(5 * (playerHp/playerMaxHp))}) 0%, #050508 100%)"
>
	
	<!-- Background Sparkles -->
	<div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.03),transparent)] pointer-events-none"></div>

	<!-- Sound Mute toggle standard helper -->
	<button 
		on:click={toggleMute}
		class="absolute top-4 right-4 z-40 p-2.5 rounded-xl bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white transition-colors flex items-center justify-center"
	>
		{#if muted}
			<!-- Speaker muted -->
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path>
			</svg>
		{:else}
			<!-- Speaker active -->
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z"></path>
			</svg>
		{/if}
	</button>

	{#if gameState === 'start'}
		<!-- START SCREEN -->
		<div class="w-full max-w-lg p-8 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl backdrop-blur-md text-center space-y-8 flex flex-col items-center">
			<div class="space-y-3">
				<div class="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
					Cyber-Magic Shooter
				</div>
				<h1 class="text-4xl font-black tracking-wider text-white font-serif bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 bg-clip-text text-transparent">
					呪紋弾幕 (スペルウィーバー)
				</h1>
				<p class="text-xs text-zinc-500">描いた呪紋で弾幕を打ち砕く、魔導シューティングゲーム</p>
			</div>

			<div class="w-full space-y-4">
				<button 
					on:click={initGame}
					class="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:scale-103 active:scale-98 transition-all tracking-widest text-base"
				>
					ゲーム開始 (PLAY GAME)
				</button>
				<button 
					on:click={() => { showTutorial = true; }}
					class="w-full py-3.5 bg-zinc-900 border border-white/10 hover:border-zinc-700 text-zinc-300 font-bold rounded-2xl transition-all"
				>
					遊び方 (HOW TO PLAY)
				</button>
			</div>

			<div class="text-[10px] text-zinc-600">
				PC: WASD移動 / Shift低速 / マウス描画<br />
				タブレット: 弾幕ゾーンのドラッグで移動 / 右ゾーンでタッチ描画
			</div>
		</div>

	{:else if gameState === 'playing'}
		<!-- PLAYING SCREEN -->
		<div class="w-full h-full flex flex-col md:flex-row p-4 gap-4 box-border">
			<!-- Left Panel: Danmaku Zone (56% width) -->
			<div class="w-full md:w-[56%] h-full flex flex-col">
				<div class="flex-1 min-h-0">
					<GameEngine 
						stage={stage}
						bind:playerHp={playerHp}
						playerMaxHp={playerMaxHp}
						bind:gold={gold}
						bind:score={score}
						activeSpells={activeSpells}
						onRegisterTrigger={(fn) => { triggerSpellFn = fn; }}
						onplayerHit={handlePlayerHit}
						onheal={handleHeal}
						onstageClear={handleStageClear}
						ongameOver={handleGameOver}
					/>
				</div>
			</div>

			<!-- Right Panel: Drawing Zone (44% width) -->
			<div class="w-full md:w-[44%] flex flex-col gap-3 h-full">
				<!-- HUD and Stats -->
				<div class="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md flex justify-between items-center flex-shrink-0">
					<div class="space-y-1">
						<div class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">STAGE {stage}</div>
						<div class="flex items-center gap-3">
							<span class="text-rose-400 font-extrabold text-sm tracking-wider">HP</span>
							<!-- Heart Icons -->
							<div class="flex gap-1">
								{#each Array(playerMaxHp) as _, i}
									<span class="text-3xl leading-none transition-all duration-300 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]" class:text-rose-500={i < playerHp} class:text-zinc-800={i >= playerHp} class:scale-110={i < playerHp} class:animate-pulse={playerHp <= 2 && i < playerHp}>
										♥
									</span>
								{/each}
							</div>
							<span class="text-lg font-black font-mono text-rose-400/90 ml-1">
								{playerHp} / {playerMaxHp}
							</span>
						</div>
					</div>

					<div class="text-right space-y-1">
						<div class="text-xs text-yellow-500 font-bold font-mono">{gold} G</div>
						<div class="text-xs text-cyan-400 font-extrabold font-mono">SCORE: {score}</div>
					</div>
				</div>

				<!-- Usable Active Spells Display (4 queue slots) -->
				<div 
					class="p-3 rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md flex-shrink-0 transition-colors duration-200"
					class:bg-emerald-950-10={castSuccessFlash}
					class:border-emerald-500-20={castSuccessFlash}
				>
					<div class="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">使用可能呪文 (描くお手本)</div>
					<div class="grid grid-cols-4 gap-2">
						{#each activeSpells as spell, index}
							{#if spell}
								<div 
									class="flex flex-col items-center p-2 rounded-xl bg-zinc-900/60 border text-center transition-all"
									style="border-color: {spell.color}35; box-shadow: inset 0 0 8px {spell.color}05"
								>
									<span class="text-[9px] text-zinc-400 font-bold truncate max-w-full mb-1">{spell.name}</span>
									
									<!-- SVG Shape Preview -->
									<div class="w-10 h-10 flex items-center justify-center border border-white/5 bg-zinc-950 rounded-lg relative my-1">
										<svg viewBox="0 0 100 100" class="w-8 h-8">
											<path 
												d={getSvgPath(spell.shape)} 
												fill="none" 
												stroke={spell.color} 
												stroke-width="7" 
												stroke-linecap="round" 
												stroke-linejoin="round" 
											/>
										</svg>
									</div>

									<span class="text-[8px] font-extrabold px-1 rounded-md bg-zinc-950 mt-1 uppercase" style="color: {spell.color}">
										{translateShapeName(spell.shape)}
									</span>
								</div>
							{/if}
						{/each}
					</div>
				</div>

				<!-- Casting Drawing Canvas -->
				<div class="flex-1 min-h-0 relative">
					<DrawingCanvas on:cast={handleSpellCast} />
				</div>
			</div>
		</div>

	{:else if gameState === 'stage_clear'}
		<!-- STAGE CLEAR INTERMEDIATE -->
		<div class="w-full max-w-md p-8 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl backdrop-blur-md text-center space-y-6 flex flex-col items-center">
			<div class="space-y-2">
				<div class="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
					Stage Cleared
				</div>
				<h2 class="text-3xl font-black text-white font-serif tracking-wider">
					魔獣討伐 完了
				</h2>
			</div>

			<!-- Results Summary -->
			<div class="w-full p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3 text-sm">
				<div class="flex justify-between border-b border-white/5 pb-2">
					<span class="text-zinc-500">獲得スコア:</span>
					<span class="text-cyan-400 font-extrabold font-mono">+{stageClearSummary.scoreGained}</span>
				</div>
				<div class="flex justify-between border-b border-white/5 pb-2">
					<span class="text-zinc-500">獲得ゴールド:</span>
					<span class="text-yellow-500 font-extrabold font-mono">+{stageClearSummary.goldGained} G</span>
				</div>
				<div class="flex justify-between pt-1">
					<span class="text-zinc-500">現在の総スコア:</span>
					<span class="text-white font-extrabold font-mono">{score}</span>
				</div>
			</div>

			<button 
				on:click={goToShop}
				class="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-102 transition-all tracking-wider text-sm"
			>
				魔導書ショップへ進む ➔
			</button>
		</div>

	{:else if gameState === 'shop'}
		<!-- SPELL SHOP -->
		<Shop 
			gold={gold} 
			deck={deck} 
			stage={stage} 
			onUpdateGold={(g) => { gold = g; }}
			onUpdateDeck={(d) => { deck = d; }}
			onNextStage={leaveShop}
		/>

	{:else if gameState === 'game_over'}
		<!-- GAME OVER -->
		<div class="w-full max-w-md p-8 rounded-3xl bg-zinc-950/80 border border-white/10 shadow-2xl backdrop-blur-md text-center space-y-6 flex flex-col items-center">
			<div class="space-y-2">
				<div class="text-xs font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
					Defeated
				</div>
				<h2 class="text-3xl font-black text-rose-500 font-serif tracking-wider">
					自機大破 (GAME OVER)
				</h2>
			</div>

			<div class="w-full p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3 text-sm">
				<div class="flex justify-between border-b border-white/5 pb-2">
					<span class="text-zinc-500">最終到達ステージ:</span>
					<span class="text-white font-bold">STAGE {stage}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-zinc-500">最終スコア:</span>
					<span class="text-cyan-400 font-black font-mono">{score}</span>
				</div>
			</div>

			<div class="w-full space-y-3">
				<button 
					on:click={initGame}
					class="w-full py-4 bg-white text-black font-extrabold rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:scale-102 transition-all text-sm tracking-wider"
				>
					もう一度プレイ
				</button>
				<button 
					on:click={() => { gameState = 'start'; }}
					class="w-full py-3 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-zinc-300 font-bold rounded-2xl transition-all text-sm"
				>
					タイトルに戻る
				</button>
			</div>
		</div>
	{/if}

	<!-- HOW TO PLAY TUTORIAL DIALOG MODAL -->
	{#if showTutorial}
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
			<div class="w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6 max-h-[90vh] overflow-y-auto relative">
				<button 
					on:click={() => { showTutorial = false; }}
					class="absolute top-4 right-4 text-zinc-500 hover:text-white text-xl p-1"
				>
					✕
				</button>
				
				<div class="border-b border-white/10 pb-3">
					<h3 class="text-2xl font-black text-white font-serif">呪紋弾幕 の遊び方</h3>
					<p class="text-xs text-zinc-500 mt-1">ゲームの基本ルールと操作方法</p>
				</div>

				<div class="space-y-5 text-sm text-zinc-300 leading-relaxed">
					<!-- Step 1 -->
					<div class="space-y-1">
						<h4 class="font-extrabold text-white flex items-center gap-2">
							<span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-mono">1</span>
							自機の操作 (移動)
						</h4>
						<p class="pl-7 text-xs text-zinc-400">
							<strong class="text-white">PC:</strong> <code class="bg-zinc-900 px-1.5 py-0.5 rounded text-white border border-white/5">W A S D</code> キー または <code class="bg-zinc-900 px-1.5 py-0.5 rounded text-white border border-white/5">矢印</code> キーで移動します。<code class="bg-zinc-900 px-1.5 py-0.5 rounded text-white border border-white/5">Shift</code> キーを長押しすると、移動速度がゆっくり（フォーカスモード）になり、赤い被弾判定（ヒットボックス）が可視化されます。<br />
							<strong class="text-white">タブレット:</strong> 左側の <strong class="text-cyan-400">弾幕ゾーン</strong> 内をドラッグすることで、指の動きに合わせて自機を直感的に動かすことができます。
						</p>
					</div>

					<!-- Step 2 -->
					<div class="space-y-1">
						<h4 class="font-extrabold text-white flex items-center gap-2">
							<span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-mono">2</span>
							呪文の詠唱 (模様を描く)
						</h4>
						<p class="pl-7 text-xs text-zinc-400">
							右側の <strong class="text-emerald-400">呪文唱えゾーン</strong> 内をドラッグ（マウスドラッグまたは画面のタッチ）して、呪文のお手本に沿った模様を描きます。
							お手本の模様を描き終えて指やクリックを離すと、自動的に図形が認識されます。
						</p>
					</div>

					<!-- Step 3 -->
					<div class="space-y-1">
						<h4 class="font-extrabold text-white flex items-center gap-2">
							<span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-mono">3</span>
							図形の一致度とダメージ倍率
						</h4>
						<p class="pl-7 text-xs text-zinc-400">
							描いた模様がお手本に似ているほど、呪文の威力（ダメージ）がアップします！完璧に描けると <strong class="text-emerald-400 font-bold">PERFECT(2倍ダメージ)</strong> となり、大きなエネルギーが放たれます。
							お手本とあまりにかけ離れていると詠唱失敗となり弾が出ないので、落ち着いて丁寧に進めましょう。
						</p>
					</div>

					<!-- Step 4 -->
					<div class="space-y-1">
						<h4 class="font-extrabold text-white flex items-center gap-2">
							<span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-mono">4</span>
							グレイズ (かすり) システム
						</h4>
						<p class="pl-7 text-xs text-zinc-400">
							敵の弾にギリギリまで近づく（かすり判定）と <strong class="text-white">"GRAZE!"</strong> というエフェクトとともにスコアが大幅に上昇します。危険ですがハイスコアを狙うための強力な手段です。
						</p>
					</div>

					<!-- Step 5 -->
					<div class="space-y-1">
						<h4 class="font-extrabold text-white flex items-center gap-2">
							<span class="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-mono">5</span>
							ステージサイクルと魔導ショップ
						</h4>
						<p class="pl-7 text-xs text-zinc-400">
							敵のHPを削りきるとステージクリアとなり、獲得スコアに応じたゴールドがもらえます。クリア後は <strong class="text-yellow-400">魔導書ショップ</strong> で不要な呪文を売却（購入額の半値）したり、新たな高威力呪文（全10種類）を購入してデッキを強化できます。
						</p>
					</div>
				</div>

				<div class="pt-4 border-t border-white/10 flex justify-end">
					<button 
						on:click={() => { showTutorial = false; }}
						class="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs"
					>
						理解しました
					</button>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	/* Custom styles and overrides */
	.hover\:scale-103:hover {
		transform: scale(1.03);
	}
	.active\:scale-98:active {
		transform: scale(0.98);
	}
	.bg-emerald-950-10 {
		background-color: rgba(6, 95, 70, 0.1);
	}
	.border-emerald-500-20 {
		border-color: rgba(16, 185, 129, 0.2);
	}
	.hover\:scale-102:hover {
		transform: scale(1.02);
	}
</style>
