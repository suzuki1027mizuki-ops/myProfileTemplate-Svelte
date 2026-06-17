<script>
	import { onMount } from 'svelte';
	import { sound } from './SoundManager.js';
	import { DefaultSpells } from './spells.js';

	// Props (Svelte 5 runes mode)
	let {
		stage = 1,
		playerHp = $bindable(5),
		playerMaxHp = 5,
		gold = $bindable(0),
		score = $bindable(0),
		activeSpells = [],
		onRegisterTrigger = null,
		onplayerHit = null,
		onheal = null,
		onstageClear = null,
		ongameOver = null
	} = $props();

	let bulletSpeedMult = $derived(1.0 + Math.min(0.5, (stage - 1) * 0.04));

	let canvas;
	let ctx;
	let width = 500;
	let height = 650;
	let isRunning = false;

	// Player State
	let player = {
		x: 250,
		y: 520,
		radius: 12,
		hitboxRadius: 3.0,
		speedNormal: 4.5,
		speedFocus: 1.8,
		invincibilityFrames: 0,
		shieldFrames: 0,
		focusActive: false
	};

	// Enemy State
	let enemy = {
		x: 250,
		y: 100,
		targetX: 250,
		radius: 24,
		hp: 200,
		maxHp: 200,
		name: '小妖精ルミ',
		color: '#8ede66',
		shootCooldown: 0,
		patternState: 0,
		stateTimer: 0,
		stunFrames: 0
	};

	// Lists
	let enemyBullets = [];
	let playerProjectiles = [];
	let particles = [];
	let floatTexts = []; // Floating damage numbers or "GRAZE!"

	// Inputs
	let keys = {};
	let touchState = {
		active: false,
		startX: 0,
		startY: 0,
		playerStartX: 0,
		playerStartY: 0
	};

	// Spell casting queue / delayed actions
	let spellQueuedActions = [];

	// Enemy descriptions/names per stage
	const enemyPool = [
		{ name: '妖精 ルミ', color: '#33ff99', hp: 200 },
		{ name: '風導師 アルフレッド', color: '#00ffff', hp: 350 },
		{ name: '氷皇 シルフ', color: '#3399ff', hp: 500 },
		{ name: '雷帝 ジーク', color: '#ffcc00', hp: 700 },
		{ name: '深淵の魔女 クローディア', color: '#cc33ff', hp: 950 },
		{ name: '烈火の戦神 バルカン', color: '#ff4d4d', hp: 1200 },
		{ name: '大魔導 デオン', color: '#ff9933', hp: 1500 }
	];

	// Initialize enemy for current stage
	function initEnemy() {
		const poolIdx = (stage - 1) % enemyPool.length;
		const baseEnemy = enemyPool[poolIdx];
		// Scale HP indefinitely for stages beyond the pool size
		const hpMultiplier = 1 + Math.floor((stage - 1) / enemyPool.length) * 0.5;
		
		enemy.name = baseEnemy.name + (stage > enemyPool.length ? ` Lv.${Math.floor(stage/enemyPool.length) + 1}` : '');
		enemy.maxHp = Math.round(baseEnemy.hp * hpMultiplier);
		enemy.hp = enemy.maxHp;
		enemy.color = baseEnemy.color;
		enemy.x = width / 2;
		enemy.y = 100;
		enemy.targetX = width / 2;
		enemy.shootCooldown = 60;
		enemy.patternState = 0;
		enemy.stateTimer = 0;
		enemy.stunFrames = 0;

		enemyBullets = [];
		playerProjectiles = [];
		particles = [];
		floatTexts = [];
		spellQueuedActions = [];
	}

	onMount(() => {
		initEnemy();
		isRunning = true;

		// Expose triggerSpell to parent
		if (onRegisterTrigger) onRegisterTrigger(triggerSpell);
		// Input handlers
		const handleKeyDown = (e) => {
			keys[e.code] = true;
			if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
				player.focusActive = true;
			}
		};

		const handleKeyUp = (e) => {
			keys[e.code] = false;
			if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
				player.focusActive = false;
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		window.addEventListener('keyup', handleKeyUp);

		// Canvas resize listener
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

		// Game loop
		let animationId;
		const gameLoop = () => {
			if (isRunning) {
				update();
				render();
			}
			animationId = requestAnimationFrame(gameLoop);
		};
		gameLoop();

		return () => {
			isRunning = false;
			window.removeEventListener('keydown', handleKeyDown);
			window.removeEventListener('keyup', handleKeyUp);
			window.removeEventListener('resize', resize);
			cancelAnimationFrame(animationId);
		};
	});

	// Trigger spell from parent controller — exposed via onRegisterTrigger callback
	function triggerSpell(spellId, score) {
		if (enemy.hp <= 0 || playerHp <= 0) return;

		const spell = DefaultSpells.find(s => s.id === spellId);
		if (!spell) return;

		// Cast projectile depending on spell behavior
		const dmgMultiplier = score * (score >= 0.95 ? 2.0 : 1.25); // high rewards for drawing accuracy
		const finalDmg = Math.round(spell.baseDamage * dmgMultiplier);

		if (spell.behavior === 'spread') {
			// Pyros Blast: 3 fireballs
			sound.playShoot();
			const angles = [-0.2, 0, 0.2];
			angles.forEach(ang => {
				playerProjectiles.push({
					x: player.x,
					y: player.y - 10,
					vx: Math.sin(ang) * 7.5,
					vy: -Math.cos(ang) * 7.5,
					radius: 9,
					damage: finalDmg,
					color: spell.color,
					type: 'fireball',
					score: score
				});
			});
			// Casting sparks
			spawnParticles(player.x, player.y - 10, 15, spell.color, 3);

		} else if (spell.behavior === 'shield') {
			// Aqua Barrier: set shield timer
			sound.playShield();
			player.shieldFrames = 240; // 4 seconds
			spawnParticles(player.x, player.y, 25, spell.color, 2);
			spawnFloatText(player.x, player.y - 25, 'BARRIER!', spell.color);

		} else if (spell.behavior === 'chain') {
			// Storm Bolt: Instant lightning strike
			sound.playShoot();
			enemy.hp = Math.max(0, enemy.hp - finalDmg);
			enemy.stunFrames = 40; // Stun for 0.6 seconds
			sound.playEnemyHit();

			// Spawn float text
			spawnFloatText(enemy.x, enemy.y - 20, `-${finalDmg} STUN!`, spell.color);
			// Lightning lightning particle line
			for (let i = 0; i < 6; i++) {
				particles.push({
					x: player.x,
					y: player.y,
					type: 'lightning',
					tx: enemy.x,
					ty: enemy.y,
					color: spell.color,
					alpha: 1.0,
					decay: 0.08
				});
			}
			spawnParticles(enemy.x, enemy.y, 20, spell.color, 4);
			checkEnemyDeath();

		} else if (spell.behavior === 'pierce') {
			// Aero Slasher: wide horizontal crescent wind blade
			sound.playShoot();
			playerProjectiles.push({
				x: player.x,
				y: player.y - 15,
				vx: 0,
				vy: -9,
				width: 100,
				height: 16,
				damage: finalDmg,
				color: spell.color,
				type: 'blade',
				hitDelay: 0
			});
			spawnParticles(player.x, player.y - 15, 10, spell.color, 2);

		} else if (spell.behavior === 'beam') {
			// Ray Lance: Continuous laser beam
			sound.playShoot();
			playerProjectiles.push({
				x: player.x,
				y: player.y,
				vx: 0,
				vy: 0,
				width: 32,
				damage: finalDmg, // deals damage ticks
				color: spell.color,
				type: 'laser',
				duration: 75 // 1.25s
			});

		} else if (spell.behavior === 'homing') {
			// Volt Thunder: 3 bouncing electrical balls locking on target
			sound.playShoot();
			for (let i = 0; i < 3; i++) {
				const startAng = -0.5 + i * 0.5;
				playerProjectiles.push({
					x: player.x,
					y: player.y - 10,
					vx: Math.sin(startAng) * 4.0,
					vy: -Math.cos(startAng) * 4.0,
					radius: 7,
					damage: finalDmg,
					color: spell.color,
					type: 'spark',
					timer: 300 // stays 5s max
				});
			}
			spawnParticles(player.x, player.y - 10, 12, spell.color, 2);

		} else if (spell.behavior === 'burst') {
			// Gale Shot: Queue 8 needles
			sound.playShoot();
			for (let i = 0; i < 8; i++) {
				spellQueuedActions.push({
					type: 'needle',
					delay: i * 4,
					damage: finalDmg,
					color: spell.color
				});
			}

		} else if (spell.behavior === 'charge') {
			// Geo Bastion: Stone wall, blocks then launches
			sound.playShield();
			playerProjectiles.push({
				x: player.x,
				y: player.y - 30,
				vx: 0,
				vy: 0,
				width: 60,
				height: 15,
				damage: finalDmg,
				color: spell.color,
				type: 'stonewall',
				duration: 90 // 1.5s then launch
			});
			spawnParticles(player.x, player.y - 30, 8, spell.color, 1);

		} else if (spell.behavior === 'heal') {
			// Life Drain: Bouncing heart
			sound.playShoot();
			playerProjectiles.push({
				x: player.x,
				y: player.y - 10,
				vx: 0,
				vy: -6,
				radius: 8,
				damage: finalDmg,
				color: spell.color,
				type: 'heart'
			});

		} else if (spell.behavior === 'vortex') {
			// Vortex Blackhole: Spawn on enemy
			sound.playShield();
			playerProjectiles.push({
				x: enemy.x,
				y: enemy.y + 40,
				vx: 0,
				vy: 0,
				radius: 12,
				maxRadius: 80,
				damage: finalDmg,
				color: spell.color,
				type: 'vortex',
				duration: 180 // 3 seconds
			});
		}
	}

	// Update game state
	function update() {
		if (enemy.hp <= 0 || playerHp <= 0) return;

		updatePlayerMovement();
		updatePlayerShields();
		updateQueuedSpells();
		updatePlayerProjectiles();
		updateEnemyState();
		updateEnemyBullets();
		updateParticles();
		updateFloatTexts();
		checkCollisions();
	}

	function updatePlayerMovement() {
		// Normal keyboard movement
		let dx = 0;
		let dy = 0;

		if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
		if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
		if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
		if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

		// Normalize speed
		if (dx !== 0 && dy !== 0) {
			const len = Math.sqrt(dx * dx + dy * dy);
			dx /= len;
			dy /= len;
		}

		const currentSpeed = player.focusActive ? player.speedFocus : player.speedNormal;
		player.x += dx * currentSpeed;
		player.y += dy * currentSpeed;

		// Clamp player inside canvas
		player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
		player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));
	}

	function updatePlayerShields() {
		if (player.shieldFrames > 0) {
			player.shieldFrames--;
		}
		if (player.invincibilityFrames > 0) {
			player.invincibilityFrames--;
		}
	}

	function updateQueuedSpells() {
		// Handle Gale Shot needles spawning over time
		spellQueuedActions = spellQueuedActions.map(act => {
			if (act.delay > 0) {
				act.delay--;
				return act;
			} else {
				// Fire needle
				playerProjectiles.push({
					x: player.x + (Math.random() * 16 - 8),
					y: player.y - 12,
					vx: (Math.random() * 0.8 - 0.4),
					vy: -11.0,
					radius: 4,
					damage: act.damage,
					color: act.color,
					type: 'needle'
				});
				sound.playShoot();
				return null; // remove
			}
		}).filter(Boolean);
	}

	function updatePlayerProjectiles() {
		playerProjectiles = playerProjectiles.map(p => {
			if (p.type === 'laser') {
				// Follow player movement
				p.x = player.x;
				p.y = player.y;
				p.duration--;
				// Deal tick damage to enemy if overlap
				if (p.duration % 4 === 0 && Math.abs(enemy.x - p.x) < p.width / 2 + enemy.radius) {
					enemy.hp = Math.max(0, enemy.hp - p.damage);
					sound.playEnemyHit();
					spawnFloatText(enemy.x + (Math.random() * 20 - 10), enemy.y + (Math.random() * 10), `-${p.damage}`, p.color);
					spawnParticles(enemy.x, enemy.y, 3, p.color, 1.5);
					checkEnemyDeath();
				}
				// Spawn laser sparks
				spawnParticles(p.x, p.y - 50, 1, p.color, 2);
				return p.duration > 0 ? p : null;

			} else if (p.type === 'stonewall') {
				p.duration--;
				if (p.duration <= 0) {
					// Launch! Convert to flying boulder projectile
					p.type = 'boulder';
					p.vy = -12;
				} else {
					// Float/stay in front of player
					p.x = player.x;
					p.y = player.y - 30;
				}
				return p;

			} else if (p.type === 'vortex') {
				p.duration--;
				// Animate rotation radius
				p.radius = Math.min(p.maxRadius, p.radius + 1.5);
				// Pull in enemy bullets and damage enemy
				if (p.duration % 5 === 0) {
					const distToEnemy = Math.hypot(enemy.x - p.x, enemy.y - p.y);
					if (distToEnemy < p.radius + enemy.radius) {
						enemy.hp = Math.max(0, enemy.hp - p.damage);
						sound.playEnemyHit();
						spawnFloatText(enemy.x + (Math.random() * 20 - 10), enemy.y, `-${p.damage}`, p.color);
						spawnParticles(enemy.x, enemy.y, 4, p.color, 2);
						checkEnemyDeath();
					}
				}
				// Vortex particles
				const angle = Math.random() * Math.PI * 2;
				const rad = Math.random() * p.radius;
				particles.push({
					x: p.x + Math.cos(angle) * rad,
					y: p.y + Math.sin(angle) * rad,
					vx: -Math.sin(angle) * 1.5,
					vy: Math.cos(angle) * 1.5,
					size: Math.random() * 3 + 1,
					alpha: 1.0,
					decay: 0.03,
					color: p.color
				});
				return p.duration > 0 ? p : null;

			} else if (p.type === 'spark') {
				// Homing behavior
				p.timer--;
				if (p.timer <= 0) return null;

				const dx = enemy.x - p.x;
				const dy = enemy.y - p.y;
				const dist = Math.hypot(dx, dy);

				// Accelerate towards enemy
				if (dist > 5) {
					p.vx += (dx / dist) * 0.45;
					p.vy += (dy / dist) * 0.45;
				}

				// Limit speed
				const speed = Math.hypot(p.vx, p.vy);
				if (speed > 6.5) {
					p.vx = (p.vx / speed) * 6.5;
					p.vy = (p.vy / speed) * 6.5;
				}

				p.x += p.vx;
				p.y += p.vy;

				// Bounce off walls
				if (p.x < p.radius || p.x > width - p.radius) {
					p.vx *= -1;
					p.x = Math.max(p.radius, Math.min(width - p.radius, p.x));
				}

				return p;

			} else {
				// Standard straight projectile
				p.x += p.vx || 0;
				p.y += p.vy || 0;

				// Out of bounds cleanup
				if (p.y < -50 || p.y > height + 50 || p.x < -50 || p.x > width + 50) {
					return null;
				}
				return p;
			}
		}).filter(Boolean);
	}

	function updateEnemyState() {
		// Stun decrement
		if (enemy.stunFrames > 0) {
			enemy.stunFrames--;
			return; // Can't move or shoot while stunned
		}

		enemy.stateTimer++;

		// Gentle floating movement
		enemy.targetX = width / 2 + Math.sin(enemy.stateTimer * 0.015) * (width * 0.35);
		enemy.x += (enemy.targetX - enemy.x) * 0.05;
		enemy.y = 100 + Math.sin(enemy.stateTimer * 0.03) * 15;

		// Shoot cooldown logic
		if (enemy.shootCooldown > 0) {
			enemy.shootCooldown--;
		} else {
			fireEnemyDanmaku();
		}

		// Pattern switching every 380 frames
		if (enemy.stateTimer % 380 === 0) {
			enemy.patternState = (enemy.patternState + 1) % 8; // 8 patterns
		}
	}

	function fireEnemyDanmaku() {
		// Stage difficulty multipliers
		const bulletDensityCount = Math.min(5, Math.floor((stage - 1) / 3));

		if (enemy.patternState === 0) {
			// Pattern 0: Spiral shot (Slower)
			const baseAngle = enemy.stateTimer * 0.08;
			const density = 2 + bulletDensityCount;
			for (let i = 0; i < density; i++) {
				const ang = baseAngle + (i * Math.PI * 2) / density;
				enemyBullets.push({
					x: enemy.x,
					y: enemy.y + 10,
					vx: Math.cos(ang) * 1.5 * bulletSpeedMult,
					vy: Math.sin(ang) * 1.5 * bulletSpeedMult,
					radius: 5,
					color: enemy.color,
					grazed: false
				});
			}
			enemy.shootCooldown = 8;

		} else if (enemy.patternState === 1) {
			// Pattern 1: Target spread shot (Slower)
			const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
			const count = 3 + bulletDensityCount;
			const spread = 0.18; // spread angle
			for (let i = 0; i < count; i++) {
				const ang = angleToPlayer + (i - (count - 1) / 2) * spread;
				enemyBullets.push({
					x: enemy.x,
					y: enemy.y + 15,
					vx: Math.cos(ang) * 2.2 * bulletSpeedMult,
					vy: Math.sin(ang) * 2.2 * bulletSpeedMult,
					radius: 6,
					color: '#ff6600', // orange
					grazed: false
				});
			}
			sound.playShoot();
			enemy.shootCooldown = 50;

		} else if (enemy.patternState === 2) {
			// Pattern 2: Expanding ring shot (Slower)
			const ringCount = 12 + bulletDensityCount * 3;
			for (let i = 0; i < ringCount; i++) {
				const ang = (i * Math.PI * 2) / ringCount;
				enemyBullets.push({
					x: enemy.x,
					y: enemy.y + 15,
					vx: Math.cos(ang) * 1.4 * bulletSpeedMult,
					vy: Math.sin(ang) * 1.4 * bulletSpeedMult,
					radius: 5.5,
					color: '#ffcc00', // yellow
					grazed: false
				});
			}
			sound.playShoot();
			enemy.shootCooldown = 90;

		} else if (enemy.patternState === 3) {
			// Pattern 3: Wavy swing shot (Slower)
			const swing = Math.sin(enemy.stateTimer * 0.08) * 0.6;
			const ang = Math.PI / 2 + swing;
			enemyBullets.push({
				x: enemy.x,
				y: enemy.y + 15,
				vx: Math.cos(ang) * 2.5 * bulletSpeedMult,
				vy: Math.sin(ang) * 2.5 * bulletSpeedMult,
				radius: 5,
				color: '#cc33ff', // purple
				grazed: false
			});
			// Twin mirror shot
			const ang2 = Math.PI / 2 - swing;
			enemyBullets.push({
				x: enemy.x,
				y: enemy.y + 15,
				vx: Math.cos(ang2) * 2.5 * bulletSpeedMult,
				vy: Math.sin(ang2) * 2.5 * bulletSpeedMult,
				radius: 5,
				color: '#cc33ff',
				grazed: false
			});
			enemy.shootCooldown = 12;

		} else if (enemy.patternState === 4) {
			// Pattern 4: Blooming Flower Spiral (Criss-crossing emerald & purple)
			const baseAngle = enemy.stateTimer * 0.05;
			const arms = 3;
			for (let i = 0; i < arms; i++) {
				const angCw = baseAngle + (i * Math.PI * 2) / arms;
				enemyBullets.push({
					x: enemy.x,
					y: enemy.y + 10,
					vx: Math.cos(angCw) * 1.4 * bulletSpeedMult,
					vy: Math.sin(angCw) * 1.4 * bulletSpeedMult,
					radius: 5,
					color: '#10b981',
					grazed: false
				});
				const angCcw = -baseAngle + (i * Math.PI * 2) / arms + Math.PI / arms;
				enemyBullets.push({
					x: enemy.x,
					y: enemy.y + 10,
					vx: Math.cos(angCcw) * 1.4 * bulletSpeedMult,
					vy: Math.sin(angCcw) * 1.4 * bulletSpeedMult,
					radius: 5,
					color: '#a855f7',
					grazed: false
				});
			}
			enemy.shootCooldown = 9;

		} else if (enemy.patternState === 5) {
			// Pattern 5: Starlight Deceleration & Aim (Stop and go neon cyan stars)
			const count = 12 + bulletDensityCount * 2;
			for (let i = 0; i < count; i++) {
				const ang = (i * Math.PI * 2) / count + (enemy.stateTimer * 0.02);
				enemyBullets.push({
					x: enemy.x,
					y: enemy.y + 15,
					vx: Math.cos(ang) * 2.5 * bulletSpeedMult,
					vy: Math.sin(ang) * 2.5 * bulletSpeedMult,
					radius: 5,
					color: '#00f0ff',
					behavior: 'stop-and-aim',
					grazed: false
				});
			}
			sound.playShoot();
			enemy.shootCooldown = 75;

		} else if (enemy.patternState === 6) {
			// Pattern 6: Curving Meteor Storm (Curving pink and blue streams)
			const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
			enemyBullets.push({
				x: enemy.x - 10,
				y: enemy.y + 10,
				vx: Math.cos(angleToPlayer - 0.4) * 2.0 * bulletSpeedMult,
				vy: Math.sin(angleToPlayer - 0.4) * 2.0 * bulletSpeedMult,
				radius: 5,
				color: '#ec4899',
				behavior: 'curve-right',
				grazed: false
			});
			enemyBullets.push({
				x: enemy.x + 10,
				y: enemy.y + 10,
				vx: Math.cos(angleToPlayer + 0.4) * 2.0 * bulletSpeedMult,
				vy: Math.sin(angleToPlayer + 0.4) * 2.0 * bulletSpeedMult,
				radius: 5,
				color: '#3b82f6',
				behavior: 'curve-left',
				grazed: false
			});
			sound.playShoot();
			enemy.shootCooldown = 15;

		} else if (enemy.patternState === 7) {
			// Pattern 7: Ancient Mystic Seal (Orange ring + green wavy petals)
			const ringCount = 14;
			const baseAng = Math.random() * Math.PI;
			for (let i = 0; i < ringCount; i++) {
				const ang = baseAng + (i * Math.PI * 2) / ringCount;
				enemyBullets.push({
					x: enemy.x,
					y: enemy.y + 15,
					vx: Math.cos(ang) * 1.2 * bulletSpeedMult,
					vy: Math.sin(ang) * 1.2 * bulletSpeedMult,
					radius: 5.5,
					color: '#f59e0b',
					grazed: false
				});
			}
			const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
			const petalCount = 3 + Math.floor(bulletDensityCount / 2);
			const spread = 0.25;
			for (let i = 0; i < petalCount; i++) {
				const ang = angleToPlayer + (i - (petalCount - 1) / 2) * spread;
				enemyBullets.push({
					x: enemy.x,
					y: enemy.y + 15,
					vx: Math.cos(ang) * 1.0 * bulletSpeedMult,
					vy: Math.sin(ang) * 1.0 * bulletSpeedMult,
					radius: 6,
					color: '#10b981',
					behavior: 'wavy',
					grazed: false
				});
			}
			sound.playShoot();
			enemy.shootCooldown = 90;
		}
	}

	function updateEnemyBullets() {
		// Filter out of bounds bullets
		enemyBullets = enemyBullets.map(b => {
			if (b.behavior === 'stop-and-aim') {
				b.timer = (b.timer || 0) + 1;
				if (b.timer < 50) {
					// Decelerate to stop
					b.vx *= 0.92;
					b.vy *= 0.92;
				} else if (b.timer === 50) {
					// Redirect towards player's position
					const dx = player.x - b.x;
					const dy = player.y - b.y;
					const dist = Math.hypot(dx, dy) || 1;
					b.vx = (dx / dist) * 1.6 * bulletSpeedMult;
					b.vy = (dy / dist) * 1.6 * bulletSpeedMult;
				}
				b.x += b.vx;
				b.y += b.vy;
			} else if (b.behavior === 'curve-left') {
				const angle = -0.015;
				const cos = Math.cos(angle);
				const sin = Math.sin(angle);
				const vx = b.vx * cos - b.vy * sin;
				const vy = b.vx * sin + b.vy * cos;
				b.vx = vx;
				b.vy = vy;
				b.x += b.vx;
				b.y += b.vy;
			} else if (b.behavior === 'curve-right') {
				const angle = 0.015;
				const cos = Math.cos(angle);
				const sin = Math.sin(angle);
				const vx = b.vx * cos - b.vy * sin;
				const vy = b.vx * sin + b.vy * cos;
				b.vx = vx;
				b.vy = vy;
				b.x += b.vx;
				b.y += b.vy;
			} else if (b.behavior === 'wavy') {
				b.timer = (b.timer || 0) + 1;
				const speed = Math.hypot(b.vx, b.vy) || 1;
				const perpX = -b.vy / speed;
				const perpY = b.vx / speed;
				const wave = Math.sin(b.timer * 0.1) * 0.8;
				b.x += b.vx + perpX * wave;
				b.y += b.vy + perpY * wave;
			} else {
				b.x += b.vx;
				b.y += b.vy;
			}

			// Out of bounds cleanup
			if (b.y < -20 || b.y > height + 20 || b.x < -20 || b.x > width + 20) {
				return null;
			}
			return b;
		}).filter(Boolean);
	}

	function updateParticles() {
		particles = particles.map(p => {
			if (p.type === 'lightning') {
				p.alpha -= p.decay;
				return p.alpha > 0 ? p : null;
			} else {
				p.x += p.vx;
				p.y += p.vy;
				p.alpha -= p.decay || 0.025;
				p.size *= 0.96;
				return p.alpha > 0 ? p : null;
			}
		}).filter(Boolean);
	}

	function updateFloatTexts() {
		floatTexts = floatTexts.map(t => {
			t.y -= t.vy;
			t.vy *= 0.92;
			t.alpha -= 0.02;
			return t.alpha > 0 ? t : null;
		}).filter(Boolean);
	}

	function checkCollisions() {
		// 1. Player Projectiles hitting Enemy
		playerProjectiles = playerProjectiles.map(p => {
			// Check bounding-box pierce blade
			if (p.type === 'blade') {
				// Width 100, height 16
				const overlaps = (p.x - p.width / 2 < enemy.x + enemy.radius) &&
								 (p.x + p.width / 2 > enemy.x - enemy.radius) &&
								 (p.y - p.height / 2 < enemy.y + enemy.radius) &&
								 (p.y + p.height / 2 > enemy.y - enemy.radius);

				if (overlaps) {
					// Tick damage
					p.hitDelay = p.hitDelay || 0;
					if (p.hitDelay <= 0) {
						enemy.hp = Math.max(0, enemy.hp - p.damage);
						sound.playEnemyHit();
						spawnFloatText(enemy.x + (Math.random() * 20 - 10), enemy.y + (Math.random() * 10), `-${p.damage}`, p.color);
						spawnParticles(enemy.x, enemy.y, 4, p.color, 2.0);
						p.hitDelay = 12; // hit delay tick
						checkEnemyDeath();
					} else {
						p.hitDelay--;
					}
				}
				return p;

			} else if (p.type === 'stonewall') {
				// Wall blocks bullets
				enemyBullets = enemyBullets.filter(b => {
					const insideWall = (b.x > p.x - p.width / 2) && (b.x < p.x + p.width / 2) &&
									   (b.y > p.y - p.height / 2) && (b.y < p.y + p.height / 2);
					if (insideWall) {
						spawnParticles(b.x, b.y, 3, p.color, 1);
						return false; // delete bullet
					}
					return true;
				});
				return p;

			} else if (p.type === 'boulder') {
				// Fired wall hitting enemy
				const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
				if (dist < enemy.radius + 20) {
					enemy.hp = Math.max(0, enemy.hp - p.damage);
					sound.playEnemyHit();
					spawnFloatText(enemy.x, enemy.y, `-${p.damage}`, p.color);
					spawnParticles(enemy.x, enemy.y, 25, p.color, 3.5);
					checkEnemyDeath();
					return null; // destroy boulder
				}
				// Boulder blocks bullets too
				enemyBullets = enemyBullets.filter(b => {
					const inBoulder = Math.hypot(b.x - p.x, b.y - p.y) < 20;
					if (inBoulder) {
						spawnParticles(b.x, b.y, 3, p.color, 1);
						return false;
					}
					return true;
				});
				return p;

			} else if (p.type === 'laser' || p.type === 'vortex') {
				// Handled in updatePlayerProjectiles
				return p;

			} else {
				// Standard circular projectile
				const dist = Math.hypot(enemy.x - p.x, enemy.y - p.y);
				if (dist < enemy.radius + p.radius) {
					enemy.hp = Math.max(0, enemy.hp - p.damage);
					sound.playEnemyHit();
					spawnFloatText(enemy.x, enemy.y, `-${p.damage}`, p.color);
					spawnParticles(enemy.x, enemy.y, 8, p.color, 2.0);

					if (p.type === 'heart') {
						onheal?.({ detail: { amount: 1 } });
						spawnFloatText(player.x, player.y - 20, '+1 HP', '#ff66b2');
						spawnParticles(player.x, player.y, 10, '#ff66b2', 1.5);
					}

					checkEnemyDeath();
					return null; // destroy projectile
				}
				return p;
			}
		}).filter(Boolean);

		// 2. Active vortexes absorbing enemy bullets
		const vortexes = playerProjectiles.filter(p => p.type === 'vortex');
		if (vortexes.length > 0) {
			enemyBullets = enemyBullets.filter(b => {
				for (let v of vortexes) {
					const dist = Math.hypot(b.x - v.x, b.y - v.y);
					if (dist < v.radius) {
						spawnParticles(b.x, b.y, 2, v.color, 0.8);
						return false; // absorb bullet
					}
				}
				return true;
			});
		}

		// 3. Player Shield absorbing enemy bullets
		if (player.shieldFrames > 0) {
			enemyBullets = enemyBullets.filter(b => {
				const dist = Math.hypot(b.x - player.x, b.y - player.y);
				if (dist < 40) { // shield radius
					spawnParticles(b.x, b.y, 3, '#3399ff', 1.0);
					score += 5; // small points for deletion
					return false;
				}
				return true;
			});
		}

		// 4. Enemy Bullets hitting Player & Graze logic
		enemyBullets = enemyBullets.filter(b => {
			const dist = Math.hypot(b.x - player.x, b.y - player.y);

			// Collision check
			if (dist < b.radius + player.hitboxRadius) {
				if (player.invincibilityFrames <= 0) {
					playerHp = Math.max(0, playerHp - 1);
					sound.playPlayerHit();
					spawnParticles(player.x, player.y, 35, '#ff3333', 4.0);
					spawnFloatText(player.x, player.y - 15, '-1 HP', '#ff3333');
					
					player.invincibilityFrames = 60; // 1s invincibility
					onplayerHit?.({ detail: { newHp: playerHp } });

					if (playerHp <= 0) {
						ongameOver?.();
					}
				}
				return false; // delete bullet
			}

			// Graze check (classical danmaku reward)
			if (!b.grazed && dist < b.radius + 18) {
				b.grazed = true;
				score += 20;
				spawnFloatText(player.x + (Math.random() * 20 - 10), player.y - 20, 'GRAZE!', '#ffffff', 0.8);
				// Small white sparkle
				particles.push({
					x: player.x + (b.x - player.x) * 0.5,
					y: player.y + (b.y - player.y) * 0.5,
					vx: Math.random() * 2 - 1,
					vy: Math.random() * 2 - 1,
					size: Math.random() * 2.5 + 1.5,
					alpha: 1.0,
					decay: 0.05,
					color: '#ffffff'
				});
			}

			return true;
		});
	}

	function checkEnemyDeath() {
		if (enemy.hp <= 0) {
			sound.playClear();
			// Calculations for score & money
			const stageBonus = stage * 1000;
			const hpBonus = playerHp * 500;
			const finalStageScore = stageBonus + hpBonus;
			score += finalStageScore;
			
			// Gold payout
			const earnedGold = 100 + stage * 50 + Math.round(hpBonus / 10);
			gold += earnedGold;

			// Spawn final explosion
			spawnParticles(enemy.x, enemy.y, 50, enemy.color, 5.0);

			onstageClear?.({
				scoreGained: finalStageScore,
				goldGained: earnedGold,
				finalGold: gold,
				finalScore: score
			});
		}
	}

	// Particles Generator
	function spawnParticles(x, y, count, color, speedVal = 2.0) {
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = (Math.random() * speedVal + 0.5);
			particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				size: Math.random() * 4 + 2,
				alpha: 1.0,
				decay: Math.random() * 0.02 + 0.015,
				color
			});
		}
	}

	function spawnFloatText(x, y, text, color, vy = 1.8) {
		floatTexts.push({
			x,
			y,
			text,
			color,
			alpha: 1.0,
			vy
		});
	}

	// Touch Controls (Relative touch dragging anywhere inside this zone)
	function handlePointerDown(e) {
		e.preventDefault();
		sound.resume();
		canvas.setPointerCapture(e.pointerId);

		const rect = canvas.getBoundingClientRect();
		const clientX = e.clientX - rect.left;
		const clientY = e.clientY - rect.top;

		touchState.active = true;
		touchState.startX = clientX;
		touchState.startY = clientY;
		touchState.playerStartX = player.x;
		touchState.playerStartY = player.y;
	}

	function handlePointerMove(e) {
		if (!touchState.active) return;
		e.preventDefault();

		const rect = canvas.getBoundingClientRect();
		const clientX = e.clientX - rect.left;
		const clientY = e.clientY - rect.top;

		const dx = clientX - touchState.startX;
		const dy = clientY - touchState.startY;

		// Relative movement
		player.x = touchState.playerStartX + dx;
		player.y = touchState.playerStartY + dy;

		// Clamp player
		player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
		player.y = Math.max(player.radius, Math.min(height - player.radius, player.y));
	}

	function handlePointerUp(e) {
		if (touchState.active) {
			canvas.releasePointerCapture(e.pointerId);
			touchState.active = false;
		}
	}

	// Canvas rendering methods
	function render() {
		if (!ctx) {
			ctx = canvas?.getContext('2d');
			return;
		}

		ctx.clearRect(0, 0, width, height);

		// 1. Draw glowing space/grid background (dynamic HP color interpolation)
		const hpRatio = Math.max(0, Math.min(1, playerHp / playerMaxHp));
		const bgR = Math.round(7 * hpRatio + 55 * (1 - hpRatio));
		const bgG = Math.round(7 * hpRatio + 5 * (1 - hpRatio));
		const bgB = Math.round(13 * hpRatio + 10 * (1 - hpRatio));
		ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
		ctx.fillRect(0, 0, width, height);

		ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
		ctx.lineWidth = 1;
		const gridSize = 50;
		// Scrolling grid simulation
		const scrollOffset = (enemy.stateTimer * 0.5) % gridSize;
		for (let x = 0; x < width; x += gridSize) {
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, height);
			ctx.stroke();
		}
		for (let y = scrollOffset; y < height; y += gridSize) {
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();
		}

		// 2. Draw Enemy
		if (enemy.hp > 0) {
			// Outer glow ring
			ctx.strokeStyle = `${enemy.color}15`;
			ctx.lineWidth = 6;
			ctx.beginPath();
			ctx.arc(enemy.x, enemy.y, enemy.radius + 15 + Math.sin(enemy.stateTimer * 0.05) * 5, 0, Math.PI * 2);
			ctx.stroke();

			// Core
			ctx.fillStyle = enemy.color;
			ctx.shadowColor = enemy.color;
			ctx.shadowBlur = 18;
			ctx.beginPath();
			ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;

			// Core eye/symbol (magic seal effect)
			ctx.strokeStyle = '#050505';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(enemy.x, enemy.y, enemy.radius * 0.5, 0, Math.PI * 2);
			ctx.stroke();
			// crosshair
			ctx.beginPath();
			ctx.moveTo(enemy.x - enemy.radius * 0.7, enemy.y);
			ctx.lineTo(enemy.x + enemy.radius * 0.7, enemy.y);
			ctx.moveTo(enemy.x, enemy.y - enemy.radius * 0.7);
			ctx.lineTo(enemy.x, enemy.y + enemy.radius * 0.7);
			ctx.stroke();

			// Stun overlay indicators
			if (enemy.stunFrames > 0) {
				ctx.strokeStyle = '#ffcc00';
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
				ctx.stroke();
				// Zzz text
				ctx.fillStyle = '#ffcc00';
				ctx.font = 'bold 10px monospace';
				ctx.fillText('STUNNED', enemy.x - 20, enemy.y - enemy.radius - 8);
			}

			// Enemy HP bar
			const barWidth = width * 0.8;
			const barHeight = 4;
			const barX = (width - barWidth) / 2;
			const barY = 24;

			ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
			ctx.fillRect(barX, barY, barWidth, barHeight);

			const hpRatio = enemy.hp / enemy.maxHp;
			ctx.fillStyle = enemy.color;
			ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

			// Enemy Name tag
			ctx.fillStyle = '#ffffff';
			ctx.font = 'bold 11px sans-serif';
			ctx.fillText(enemy.name, barX, barY - 6);
		}

		// 3. Draw Player
		if (playerHp > 0) {
			// Flashing if invincible
			const isVisible = player.invincibilityFrames === 0 || (Math.floor(player.invincibilityFrames / 3) % 2 === 0);

			if (isVisible) {
				// Barrier ring (if active)
				if (player.shieldFrames > 0) {
					ctx.strokeStyle = 'rgba(51, 153, 255, 0.45)';
					ctx.lineWidth = 3;
					ctx.shadowColor = '#3399ff';
					ctx.shadowBlur = 10;
					ctx.beginPath();
					ctx.arc(player.x, player.y, 40, 0, Math.PI * 2);
					ctx.stroke();
					ctx.shadowBlur = 0;
					// barrier rotation arcs
					ctx.strokeStyle = 'rgba(51, 153, 255, 0.8)';
					ctx.lineWidth = 1.5;
					const rot = enemy.stateTimer * 0.04;
					ctx.beginPath();
					ctx.arc(player.x, player.y, 40, rot, rot + Math.PI * 0.4);
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(player.x, player.y, 40, rot + Math.PI, rot + Math.PI * 1.4);
					ctx.stroke();
				}

				// Player outer aura
				ctx.fillStyle = 'rgba(0, 255, 230, 0.1)';
				ctx.beginPath();
				ctx.arc(player.x, player.y, player.radius * 1.5, 0, Math.PI * 2);
				ctx.fill();

				// Core body
				ctx.fillStyle = '#00ffe6';
				ctx.beginPath();
				ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
				ctx.fill();

				// Highlight
				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(player.x - 3, player.y - 3, 4, 0, Math.PI * 2);
				ctx.fill();

				// Hitbox center dot (red core - only visible in focus mode or when dodging to help player precision)
				if (player.focusActive || enemyBullets.some(b => Math.hypot(b.x - player.x, b.y - player.y) < 60)) {
					ctx.fillStyle = '#ff0000';
					ctx.strokeStyle = '#ffffff';
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.arc(player.x, player.y, player.hitboxRadius + 1, 0, Math.PI * 2);
					ctx.fill();
					ctx.stroke();

					// Focus circle guide
					ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.arc(player.x, player.y, 20, 0, Math.PI * 2);
					ctx.stroke();
				}
			}
		}

		// 4. Draw Player Projectiles
		for (let p of playerProjectiles) {
			ctx.fillStyle = p.color;
			ctx.shadowColor = p.color;

			if (p.type === 'fireball') {
				ctx.shadowBlur = 12;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;
				// Fire core
				ctx.fillStyle = '#ffffff';
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
				ctx.fill();

			} else if (p.type === 'blade') {
				// Green crescent wind blade
				ctx.shadowBlur = 10;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.beginPath();
				// Draw crescent shape
				ctx.arc(0, 0, p.width / 2, Math.PI, 2 * Math.PI);
				ctx.arc(0, 8, p.width / 2 - 5, 2 * Math.PI, Math.PI, true);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
				ctx.shadowBlur = 0;

			} else if (p.type === 'laser') {
				// Piercing vertical beam
				ctx.shadowBlur = 15;
				ctx.fillStyle = `${p.color}aa`;
				ctx.fillRect(p.x - p.width / 2, 0, p.width, p.y);
				// Laser inner white beam
				ctx.fillStyle = '#ffffff';
				ctx.fillRect(p.x - p.width / 4, 0, p.width / 2, p.y);
				ctx.shadowBlur = 0;

			} else if (p.type === 'stonewall') {
				// Stone barrier in front of player
				ctx.strokeStyle = p.color;
				ctx.lineWidth = 3;
				ctx.fillStyle = '#1c1c1f';
				ctx.shadowBlur = 6;
				ctx.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
				ctx.strokeRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
				ctx.shadowBlur = 0;

			} else if (p.type === 'boulder') {
				// Flying stone boulder
				ctx.shadowBlur = 8;
				ctx.beginPath();
				ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
				ctx.fill();
				ctx.lineWidth = 2;
				ctx.strokeStyle = '#ffffff';
				ctx.stroke();
				ctx.shadowBlur = 0;

			} else if (p.type === 'heart') {
				// Pink heart projectile
				ctx.shadowBlur = 10;
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.beginPath();
				// standard SVG path scaling
				const size = p.radius * 0.12;
				ctx.scale(size, size);
				ctx.moveTo(0, -5);
				ctx.bezierCurveTo(-5, -12, -15, -12, -15, -5);
				ctx.bezierCurveTo(-15, 5, -5, 12, 0, 18);
				ctx.bezierCurveTo(5, 12, 15, 5, 15, -5);
				ctx.bezierCurveTo(15, -12, 5, -12, 0, -5);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
				ctx.shadowBlur = 0;

			} else if (p.type === 'vortex') {
				// Vortex black hole circle
				ctx.strokeStyle = p.color;
				ctx.lineWidth = 4;
				ctx.shadowBlur = 15;
				ctx.fillStyle = 'rgba(15, 10, 30, 0.4)';
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
				ctx.shadowBlur = 0;

			} else {
				// Spark / Needle: small circles
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius || 4, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// 5. Draw Enemy Bullets
		for (let b of enemyBullets) {
			ctx.fillStyle = b.color;
			ctx.shadowColor = b.color;
			ctx.shadowBlur = 8;
			ctx.beginPath();
			ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;
			// Inner white core
			ctx.fillStyle = '#ffffff';
			ctx.beginPath();
			ctx.arc(b.x, b.y, b.radius * 0.4, 0, Math.PI * 2);
			ctx.fill();
		}

		// 6. Draw Visual Particles
		for (let p of particles) {
			if (p.type === 'lightning') {
				ctx.save();
				ctx.globalAlpha = p.alpha;
				ctx.strokeStyle = p.color;
				ctx.lineWidth = 3;
				ctx.shadowColor = p.color;
				ctx.shadowBlur = 10;
				
				ctx.beginPath();
				ctx.moveTo(p.x, p.y);
				
				// Generate intermediate jagged lightning points
				let curX = p.x;
				let curY = p.y;
				const steps = 6;
				const dx = (p.tx - p.x) / steps;
				const dy = (p.ty - p.y) / steps;
				
				for (let s = 1; s < steps; s++) {
					const jagX = curX + dx + (Math.random() * 26 - 13);
					const jagY = curY + dy + (Math.random() * 26 - 13);
					ctx.lineTo(jagX, jagY);
					curX = jagX;
					curY = jagY;
				}
				ctx.lineTo(p.tx, p.ty);
				ctx.stroke();
				ctx.restore();
			} else {
				ctx.fillStyle = p.color;
				ctx.globalAlpha = p.alpha;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1.0; // reset
			}
		}

		// 7. Draw Floating Texts
		for (let t of floatTexts) {
			ctx.fillStyle = t.color;
			ctx.globalAlpha = t.alpha;
			ctx.font = 'black 12px monospace';
			ctx.textAlign = 'center';
			ctx.fillText(t.text, t.x, t.y);
			ctx.globalAlpha = 1.0;
		}

		// 8. Draw Low HP Vignette Warning
		if (playerHp <= 2) {
			const dangerRatio = 1 - (playerHp / playerMaxHp);
			const pulse = Math.sin(enemy.stateTimer * 0.08) * 0.15 + 0.5;
			const alpha = pulse * dangerRatio;
			
			const grad = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.3, width / 2, height / 2, Math.max(width, height) * 0.85);
			grad.addColorStop(0, 'rgba(239, 68, 68, 0)');
			grad.addColorStop(1, `rgba(239, 68, 68, ${alpha * 0.7})`);
			
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, width, height);
		}
	}
</script>

<div class="relative w-full h-full select-none overflow-hidden rounded-2xl bg-[#07070d] border border-white/10 backdrop-blur-md">
	<canvas
		bind:this={canvas}
		on:pointerdown={handlePointerDown}
		on:pointermove={handlePointerMove}
		on:pointerup={handlePointerUp}
		on:pointercancel={handlePointerUp}
		class="absolute inset-0 block touch-none"
	></canvas>

	{#if touchState.active}
		<!-- Small indicator for touch movement active -->
		<div 
			class="absolute w-8 h-8 rounded-full border border-dashed border-cyan-400/30 flex items-center justify-center animate-ping pointer-events-none"
			style="left: {touchState.startX - 16}px; top: {touchState.startY - 16}px;"
		></div>
	{/if}
</div>

<style>
	canvas {
		touch-action: none;
	}
</style>
