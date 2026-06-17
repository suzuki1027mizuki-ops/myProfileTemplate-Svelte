<script>
	import { onMount, createEventDispatcher } from 'svelte';
	import { Recognizer, Point } from './dollar1.js';
	import { GestureTemplates } from './templates.js';
	import { sound } from './SoundManager.js';

	const dispatch = createEventDispatcher();

	let canvas;
	let ctx;
	let width = 400;
	let height = 600;
	let isDrawing = false;
	let points = [];
	let lastTickTime = 0;

	// Particle system for the pen tip trail
	let particles = [];

	// Initialize Recognizer and load templates
	const recognizer = new Recognizer();
	onMount(() => {
		for (const [name, pts] of Object.entries(GestureTemplates)) {
			recognizer.addTemplate(name, pts);
		}

		// Set up canvas sizing
		const resize = () => {
			if (canvas) {
				const rect = canvas.parentElement.getBoundingClientRect();
				width = rect.width;
				height = rect.height;
				canvas.width = width;
				canvas.height = height;
			}
		};
		resize();
		window.addEventListener('resize', resize);

		// Particle animation loop
		let animationId;
		const updateParticles = () => {
			particles = particles.filter(p => {
				p.x += p.vx;
				p.y += p.vy;
				p.alpha -= 0.02;
				p.size *= 0.95;
				return p.alpha > 0;
			});

			draw();
			animationId = requestAnimationFrame(updateParticles);
		};
		updateParticles();

		return () => {
			window.removeEventListener('resize', resize);
			cancelAnimationFrame(animationId);
		};
	});

	function getMousePos(e) {
		const rect = canvas.getBoundingClientRect();
		// Handle both mouse/pointer and touches relative to canvas boundary
		return {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		};
	}

	function handlePointerDown(e) {
		sound.resume();
		isDrawing = true;
		points = [];
		particles = [];
		const pos = getMousePos(e);
		points.push(new Point(pos.x, pos.y));
		spawnSparks(pos.x, pos.y, 15);
	}

	function handlePointerMove(e) {
		if (!isDrawing) return;
		const pos = getMousePos(e);
		const lastPt = points[points.length - 1];

		// Only add point if it moved enough to save computational power and keep line smooth
		const dx = pos.x - lastPt.x;
		const dy = pos.y - lastPt.y;
		const dist = Math.sqrt(dx * dx + dy * dy);

		if (dist > 4) {
			points.push(new Point(pos.x, pos.y));

			// Play soft tick sound occasionally while drawing
			const now = Date.now();
			if (now - lastTickTime > 40) {
				sound.playDrawTick();
				lastTickTime = now;
			}

			// Spawn drawing sparks
			spawnSparks(pos.x, pos.y, 3);
		}
	}

	function handlePointerUp() {
		if (!isDrawing) return;
		isDrawing = false;

		if (points.length >= 8) {
			const result = recognizer.recognize(points);
			
			// Only accept match if it exceeds the similarity threshold
			if (result.name !== 'None' && result.score > 0.72) {
				sound.playSpellSuccess();
				dispatch('cast', {
					shape: result.name,
					score: result.score
				});
				// Burst of success particles
				if (points.length > 0) {
					const lastPt = points[points.length - 1];
					spawnSparks(lastPt.x, lastPt.y, 40, '#8ede66', 3);
				}
			} else {
				sound.playSpellFail();
				dispatch('fail');
				// Burst of failure particles
				if (points.length > 0) {
					const lastPt = points[points.length - 1];
					spawnSparks(lastPt.x, lastPt.y, 15, '#ff4d4d', 2);
				}
			}
		} else {
			// Too short to recognize
			dispatch('fail');
		}

		// Animate path fading out
		fadePathOut();
	}

	function spawnSparks(x, y, count = 5, color = null, speedMult = 1) {
		const colors = [color || '#00ffff', color || '#8ede66', color || '#ffcc00'];
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = (Math.random() * 2 + 1) * speedMult;
			particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				size: Math.random() * 4 + 2,
				alpha: 1,
				color: colors[Math.floor(Math.random() * colors.length)]
			});
		}
	}

	let fadeProgress = 1;
	let isFading = false;
	function fadePathOut() {
		isFading = true;
		fadeProgress = 1;
		
		const fade = () => {
			fadeProgress -= 0.08;
			if (fadeProgress <= 0) {
				points = [];
				isFading = false;
			} else {
				requestAnimationFrame(fade);
			}
		};
		fade();
	}

	function draw() {
		if (!ctx) {
			ctx = canvas?.getContext('2d');
			return;
		}

		ctx.clearRect(0, 0, width, height);

		// Draw background grid pattern for high tech magic circles aesthetic
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
		ctx.lineWidth = 1;
		const gridSize = 40;
		for (let x = 0; x < width; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.stroke();
		}
		for (let y = 0; y < height; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}

		// Draw concentric circles in center for casting focus look
		ctx.strokeStyle = 'rgba(142, 222, 102, 0.03)';
		ctx.beginPath();
		ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.3, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(width / 2, height / 2, Math.min(width, height) * 0.1, 0, Math.PI * 2);
		ctx.stroke();

		// Draw candidate path
		if (points.length > 1) {
			ctx.beginPath();
			ctx.moveTo(points[0].x, points[0].y);
			for (let i = 1; i < points.length; i++) {
				ctx.lineTo(points[i].x, points[i].y);
			}

			// Path styling: Glowing neon cyan/green line
			ctx.lineWidth = 6;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';
			
			const alphaVal = isFading ? fadeProgress : 0.85;
			ctx.strokeStyle = `rgba(0, 255, 230, ${alphaVal})`;
			ctx.shadowColor = 'rgba(0, 255, 230, 0.6)';
			ctx.shadowBlur = 12;
			ctx.stroke();

			// Inside core stroke
			ctx.lineWidth = 2.5;
			ctx.strokeStyle = `rgba(255, 255, 255, ${alphaVal})`;
			ctx.shadowBlur = 0;
			ctx.stroke();
		}

		// Draw sparks particles
		for (let p of particles) {
			ctx.save();
			ctx.globalAlpha = p.alpha;
			ctx.fillStyle = p.color;
			ctx.shadowColor = p.color;
			ctx.shadowBlur = p.size * 2;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
	}
</script>

<div class="relative w-full h-full select-none overflow-hidden rounded-2xl bg-zinc-950/80 border border-white/10 backdrop-blur-md">
	<canvas
		bind:this={canvas}
		on:pointerdown={handlePointerDown}
		on:pointermove={handlePointerMove}
		on:pointerup={handlePointerUp}
		class="absolute inset-0 block touch-none cursor-crosshair"
	></canvas>

	{#if points.length === 0 && !isDrawing}
		<div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-6">
			<div class="w-16 h-16 rounded-full border border-dashed border-emerald-500/30 flex items-center justify-center mb-4 animate-pulse">
				<svg class="w-8 h-8 text-emerald-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
				</svg>
			</div>
			<p class="text-sm font-medium tracking-wide text-zinc-400">呪文唱えエリア</p>
			<p class="text-xs text-zinc-600 mt-1 max-w-[200px]">ここをドラッグして呪文の模様を描いてください</p>
		</div>
	{/if}
</div>

<style>
	canvas {
		/* Disable default touch interactions like scrolling while drawing */
		touch-action: none;
	}
</style>
