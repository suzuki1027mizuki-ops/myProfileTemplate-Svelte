// Spell database and definitions

export const DefaultSpells = [
	{
		id: 'pyros_blast',
		name: 'Pyros Blast',
		japaneseName: '紅蓮の火矢 (ファイアバーン)',
		shape: 'Triangle',
		color: '#ff4d4d', // neon red
		cost: 100,
		sellCost: 50,
		baseDamage: 25,
		behavior: 'spread',
		description: '三角形を描いて発動。前方に3つの火の球を扇状に放つ。近接で全弾命中させると大ダメージ。'
	},
	{
		id: 'aqua_barrier',
		name: 'Aqua Barrier',
		japaneseName: '水神の結界 (アクアシールド)',
		shape: 'Circle',
		color: '#3399ff', // neon blue
		cost: 150,
		sellCost: 75,
		baseDamage: 5,
		behavior: 'shield',
		description: '円を描いて発動。自機の周りに水のバリアを4秒間展開し、触れた敵の弾幕をかき消す。バリア自体にも少量の攻撃判定あり。'
	},
	{
		id: 'storm_bolt',
		name: 'Storm Bolt',
		japaneseName: '雷神の迅雷 (ライトニング)',
		shape: 'V-Shape',
		color: '#ffcc00', // neon yellow
		cost: 120,
		sellCost: 60,
		baseDamage: 30,
		behavior: 'chain',
		description: '∨を描いて発動。敵に向かって必中の稲妻を落とし、大ダメージを与える。瞬間的に敵の動きを0.5秒停止させる。'
	},
	{
		id: 'aero_slasher',
		name: 'Aero Slasher',
		japaneseName: '烈風の鎌鼬 (カマイタチ)',
		shape: 'Horizontal Line',
		color: '#33ff99', // neon green
		cost: 80,
		sellCost: 40,
		baseDamage: 18,
		behavior: 'pierce',
		description: '横線を左から右に描いて発動。画面全体を横切る巨大な風の刃を放つ。敵の弾を一部相殺しながら貫通する。'
	},
	{
		id: 'ray_lance',
		name: 'Ray Lance',
		japaneseName: '破邪の光槍 (レーザーランス)',
		shape: 'Vertical Line',
		color: '#f0f0f0', // bright white/silver
		cost: 90,
		sellCost: 45,
		baseDamage: 3, // ticks rapidly
		behavior: 'beam',
		description: '縦線を下から上に描いて発動。自機から真上に向かって極太のレーザー光線を1.2秒間照射し、多段ヒットダメージを与える。'
	},
	{
		id: 'volt_thunder',
		name: 'Volt Thunder',
		japaneseName: '双極の電磁弾 (スパークボルト)',
		shape: 'Z-Shape',
		color: '#cc33ff', // neon purple
		cost: 140,
		sellCost: 70,
		baseDamage: 15,
		behavior: 'homing',
		description: 'Zを描いて発動。壁で跳ね返りながら敵を追尾する3つの電磁球を放つ。動き回る敵に対して非常に有効。'
	},
	{
		id: 'gale_shot',
		name: 'Gale Shot',
		japaneseName: '疾風の連矢 (ウィンドシュート)',
		shape: 'Caret',
		color: '#00ffff', // neon cyan
		cost: 110,
		sellCost: 55,
		baseDamage: 6, // 8 needles
		behavior: 'burst',
		description: '∧を描いて発動。前方に鋭い風の針を8連射する。全弾当てることで敵の体力を削る。'
	},
	{
		id: 'geo_bastion',
		name: 'Geo Bastion',
		japaneseName: '大地の咆哮 (グラビトン)',
		shape: 'Square',
		color: '#ff9933', // neon orange
		cost: 160,
		sellCost: 80,
		baseDamage: 40,
		behavior: 'charge',
		description: '四角形を描いて発動。自機の前方に強固な岩の壁を生成し、弾を塞いだあと、巨大な岩石となって敵へ突進する。'
	},
	{
		id: 'life_drain',
		name: 'Life Drain',
		japaneseName: '慈愛の波動 (ハートヒール)',
		shape: 'Heart',
		color: '#ff66b2', // pink
		cost: 200,
		sellCost: 100,
		baseDamage: 15,
		behavior: 'heal',
		description: 'ハートを描いて発動。ピンクの光弾を放ち、敵に当たるとダメージを与えつつ、プレイヤーの体力を1回復させる。'
	},
	{
		id: 'vortex_blackhole',
		name: 'Vortex Blackhole',
		japaneseName: '深淵の暗黒穴 (ブラックホール)',
		shape: 'Spiral',
		color: '#9933ff', // indigo
		cost: 250,
		sellCost: 125,
		baseDamage: 2, // ticks continuous
		behavior: 'vortex',
		description: '渦巻きを描いて発動。敵の近くに吸引空間を生成。敵の弾幕を吸い込んで消滅させつつ、敵を持続的にダメージに巻き込む。'
	}
];

export function getSpellById(id) {
	return DefaultSpells.find(s => s.id === id) || null;
}
