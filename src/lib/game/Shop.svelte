<script>
	import { DefaultSpells } from './spells.js';
	import { GestureTemplates } from './templates.js';
	import { sound } from './SoundManager.js';

	// Props
	export let gold = 0;
	export let deck = []; // list of spell IDs
	export let stage = 1;

	// Event dispatchers
	export let onNextStage;
	export let onUpdateGold;
	export let onUpdateDeck;

	// Helper to generate SVG path from template coordinates
	function getSvgPath(shapeName) {
		const pts = GestureTemplates[shapeName];
		if (!pts || pts.length === 0) return '';
		return 'M ' + pts.map(p => `${p.x} ${p.y}`).join(' L ');
	}

	// Count how many copies of a spell the player has
	function getSpellCount(spellId) {
		return deck.filter(id => id === spellId).length;
	}

	function buySpell(spell) {
		if (gold >= spell.cost) {
			sound.playShopClick();
			const newGold = gold - spell.cost;
			const newDeck = [...deck, spell.id];
			onUpdateGold(newGold);
			onUpdateDeck(newDeck);
		}
	}

	function sellSpell(spellId) {
		if (deck.length <= 4) {
			// Enforce minimum deck size of 4 spells
			return;
		}
		const index = deck.indexOf(spellId);
		if (index > -1) {
			sound.playShopClick();
			const spell = DefaultSpells.find(s => s.id === spellId);
			const newGold = gold + spell.sellCost;
			const newDeck = [...deck];
			newDeck.splice(index, 1);
			onUpdateGold(newGold);
			onUpdateDeck(newDeck);
		}
	}
</script>

<div class="w-full max-w-5xl mx-auto p-6 bg-zinc-950/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-lg flex flex-col h-[85vh] overflow-hidden">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
		<div>
			<h2 class="text-2xl font-black text-white flex items-center gap-3">
				<span class="text-[#8ede66] text-3xl font-serif">◈</span> 呪文の魔導書・売買
			</h2>
			<p class="text-xs text-zinc-500 mt-1">ステージ {stage} クリア! 次の戦いに向けてスペルを調整しましょう。</p>
		</div>
		<div class="flex items-center gap-6">
			<!-- Gold Status -->
			<div class="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
				<span class="text-yellow-400 text-sm font-bold">所持金:</span>
				<span class="text-yellow-400 text-xl font-black">{gold} G</span>
			</div>
			<!-- Deck count -->
			<div class="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
				<span class="text-emerald-400 text-sm font-bold">所持呪文数:</span>
				<span class="text-emerald-400 text-xl font-black">{deck.length}</span>
			</div>
		</div>
	</div>

	<!-- Main split scroll -->
	<div class="flex-1 overflow-y-auto pr-2 space-y-8">
		<!-- Deck overview alert -->
		{#if deck.length === 4}
			<div class="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
				<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
				</svg>
				<span>呪文デッキは最低4つ必要です。これ以上呪文を売却することはできません（所持数 {deck.length}）。</span>
			</div>
		{/if}

		<!-- Spell List Grid -->
		<div>
			<h3 class="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">魔法の呪文カタログ</h3>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each DefaultSpells as spell}
					{@const ownedCount = getSpellCount(spell.id)}
					<div 
						class="flex gap-4 p-4 rounded-2xl bg-zinc-900/60 border transition-all duration-200"
						class:border-white-5={ownedCount === 0}
						class:border-emerald-500-40={ownedCount > 0}
						class:shadow-glow={ownedCount > 0}
						style="--glow-color: {spell.color}22"
					>
						<!-- Left: SVG shape representation -->
						<div 
							class="w-16 h-16 rounded-xl flex items-center justify-center border border-white/10 bg-zinc-950/80 relative group flex-shrink-0"
							style="box-shadow: inset 0 0 10px {spell.color}15"
						>
							<svg viewBox="0 0 100 100" class="w-10 h-10 transition-transform duration-300 group-hover:scale-110">
								<path 
									d={getSvgPath(spell.shape)} 
									fill="none" 
									stroke={spell.color} 
									stroke-width="5" 
									stroke-linecap="round" 
									stroke-linejoin="round" 
								/>
							</svg>
							{#if ownedCount > 0}
								<span class="absolute -top-2 -right-2 bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
									所持: {ownedCount}
								</span>
							{/if}
						</div>

						<!-- Middle: Stats & Text -->
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-1">
								<h4 class="font-extrabold text-sm text-white truncate" style="color: {spell.color}">
									{spell.japaneseName}
								</h4>
								<span class="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded flex-shrink-0">
									威力 {spell.baseDamage}
								</span>
							</div>
							<p class="text-xs text-zinc-400 mt-1 line-clamp-2 h-8 leading-snug">
								{spell.description}
							</p>

							<!-- Bottom buttons -->
							<div class="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
								<!-- Buy Button -->
								<button 
									on:click={() => buySpell(spell)}
									disabled={gold < spell.cost}
									class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
									class:bg-white={gold >= spell.cost}
									class:text-black={gold >= spell.cost}
									class:bg-zinc-800={gold < spell.cost}
									class:text-zinc-600={gold < spell.cost}
									class:hover:scale-102={gold >= spell.cost}
								>
									<span>購入</span>
									<span class="font-mono text-[10px] opacity-80">-{spell.cost} G</span>
								</button>

								<!-- Sell Button -->
								<button 
									on:click={() => sellSpell(spell.id)}
									disabled={ownedCount === 0 || deck.length <= 4}
									class="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5"
									class:border-rose-500-40={ownedCount > 0 && deck.length > 4}
									class:text-rose-400={ownedCount > 0 && deck.length > 4}
									class:bg-rose-950-20={ownedCount > 0 && deck.length > 4}
									class:hover:bg-rose-900-40={ownedCount > 0 && deck.length > 4}
									class:border-zinc-800={ownedCount === 0 || deck.length <= 4}
									class:text-zinc-600={ownedCount === 0 || deck.length <= 4}
									class:hover:scale-102={ownedCount > 0 && deck.length > 4}
								>
									<span>売却</span>
									<span class="font-mono text-[10px] opacity-80">+{spell.sellCost} G</span>
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Footer next stage action -->
	<div class="border-t border-white/10 pt-4 mt-6 flex justify-between items-center bg-zinc-950">
		<div class="text-xs text-zinc-500">
			デッキを強化して次のステージへ進みましょう。
		</div>
		<button 
			on:click={onNextStage}
			class="px-8 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-all text-sm tracking-wide"
		>
			次のステージを開始する ➔
		</button>
	</div>
</div>

<style>
	.shadow-glow {
		box-shadow: 0 0 15px var(--glow-color);
	}
	.border-white-5 {
		border-color: rgba(255, 255, 255, 0.05);
	}
	.border-emerald-500-40 {
		border-color: rgba(16, 185, 129, 0.4);
	}
	.border-rose-500-40 {
		border-color: rgba(244, 63, 94, 0.4);
	}
	.bg-rose-950-20 {
		background-color: rgba(136, 19, 55, 0.2);
	}
	.hover:scale-102:hover {
		transform: scale(1.02);
	}
	.hover:bg-rose-900-40:hover {
		background-color: rgba(225, 29, 72, 0.2);
	}
</style>
