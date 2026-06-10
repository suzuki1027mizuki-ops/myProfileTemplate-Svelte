<script>
	import { onMount } from 'svelte';

	let y = $state(0);
	let smoothedY = $state(0);
	let windowHeight = $state(800);

	onMount(() => {
		windowHeight = window.innerHeight;
		const handleResize = () => {
			windowHeight = window.innerHeight;
		};
		window.addEventListener('resize', handleResize);

		let frame;
		const update = () => {
			// イージングをかけてスクロール追従を滑らかにする
			smoothedY += (y - smoothedY) * 0.08;
			frame = requestAnimationFrame(update);
		};
		update();

		return () => {
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(frame);
		};
	});

	// スクリプト内でスクロールに連動した背景画像の不透明度 (Opacity) とスケール (Scale) を計算
	// セクションの高さ（windowHeight）を基準に正規化して計算します
	
	// 画像1 (コワーキングスペース)
	// 最初は不透明度 1、スクロールが windowHeight に近づくにつれてフェードアウト
	const img0Opacity = $derived(
		smoothedY < windowHeight * 0.5 
			? 1 
			: Math.max(0, 1 - (smoothedY - windowHeight * 0.5) / (windowHeight * 0.8))
	);
	const img0Scale = $derived(1 + (smoothedY / (windowHeight * 4)));

	// 画像2 (カフェエリア)
	// スクロールが 0.5 * windowHeight からフェードインし、1.8 * windowHeight からフェードアウト
	const img1Opacity = $derived(
		smoothedY < windowHeight * 0.5
			? 0
			: smoothedY < windowHeight * 1.2
				? (smoothedY - windowHeight * 0.5) / (windowHeight * 0.7)
				: smoothedY < windowHeight * 1.8
					? 1
					: Math.max(0, 1 - (smoothedY - windowHeight * 1.8) / (windowHeight * 0.8))
	);
	const img1Scale = $derived(1 + (Math.max(0, smoothedY - windowHeight * 0.5) / (windowHeight * 4)));

	// 画像3 (イベントスペース)
	// スクロールが 1.8 * windowHeight からフェードイン
	const img2Opacity = $derived(
		smoothedY < windowHeight * 1.8
			? 0
			: Math.min(1, (smoothedY - windowHeight * 1.8) / (windowHeight * 0.7))
	);
	const img2Scale = $derived(1 + (Math.max(0, smoothedY - windowHeight * 1.8) / (windowHeight * 4)));
</script>

<svelte:window bind:scrollY={y} />

<!-- シネマティック背景画像 (fixed で背面に固定) -->
<div class="fixed inset-0 w-full h-full -z-10 overflow-hidden bg-[#050505]">
	<!-- 背景のオーバーレイ (全体を少し暗くしてテキストを読みやすくし、フューチャリスティックなグラデーションを加える) -->
	<div class="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-[#050505]/60 to-[#050505] z-10 pointer-events-none"></div>
	
	<!-- 画像0: コワーキング -->
	<div 
		class="absolute inset-0 w-full h-full transition-transform duration-75 ease-out"
		style="opacity: {img0Opacity}; transform: scale({img0Scale});"
	>
		<img 
			src="/coworking_hero.png" 
			alt="Coworking Space" 
			class="w-full h-full object-cover filter brightness-90"
		/>
	</div>

	<!-- 画像1: カフェエリア -->
	<div 
		class="absolute inset-0 w-full h-full transition-transform duration-75 ease-out"
		style="opacity: {img1Opacity}; transform: scale({img1Scale});"
	>
		<img 
			src="/cafe_area.png" 
			alt="Cafe Area" 
			class="w-full h-full object-cover filter brightness-75"
		/>
	</div>

	<!-- 画像2: イベントスペース -->
	<div 
		class="absolute inset-0 w-full h-full transition-transform duration-75 ease-out"
		style="opacity: {img2Opacity}; transform: scale({img2Scale});"
	>
		<img 
			src="/event_space.png" 
			alt="Event Space with Huge Display" 
			class="w-full h-full object-cover filter brightness-75"
		/>
	</div>
</div>

<!-- メインコンテンツ (スクロールで流れる要素) -->
<div class="relative w-full z-20">
	<!-- ヘッダーナビゲーション -->
	<header class="fixed top-0 left-0 w-full bg-glass border-b border-white/5 z-50 backdrop-blur-md">
		<div class="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
			<div class="flex items-center gap-3">
				<span class="text-neon font-bold text-2xl tracking-wider font-sans">INNOVATION PARK</span>
				<span class="text-white/40 text-xs px-2 py-1 border border-white/10 rounded-full">OSAKA IZUMI</span>
			</div>
			<nav class="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide text-white/80">
				<a href="#about" class="hover:text-neon transition-colors">ABOUT</a>
				<a href="#coworking" class="hover:text-neon transition-colors">COWORKING</a>
				<a href="#cafe" class="hover:text-neon transition-colors">CAFE</a>
				<a href="#event" class="hover:text-neon transition-colors">EVENT SPACE</a>
				<a href="#access" class="hover:text-neon transition-colors">ACCESS & INFO</a>
			</nav>
			<a href="#line" class="bg-neon-gradient text-[#050505] hover:shadow-[0_0_20px_rgba(142,222,102,0.4)] px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all">
				LINE登録で無料利用
			</a>
		</div>
	</header>

	<!-- ヒーローセクション -->
	<section class="min-h-screen flex flex-col justify-center items-center px-6 text-center pt-20">
		<div class="max-w-4xl mx-auto space-y-6">
			<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70 tracking-wider">
				<span class="w-2 h-2 rounded-full bg-neon-gradient animate-pulse"></span>
				UNOFFICIAL HOMEPAGE
			</div>
			<h1 class="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight font-sans tracking-tight">
				イノパでイベント創る、<br class="hidden md:block" />
				開く、盛り上がる！
			</h1>
			<p class="text-lg md:text-xl text-white/70 font-light max-w-2xl mx-auto leading-relaxed">
				大阪府和泉市・泉中央駅から直結徒歩1分。<br class="hidden sm:block" />
				コワーキングスペース、カフェ、そして大型ディスプレイを備えた次世代の共創・イベントスペース。
			</p>
			<div class="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
				<a href="#line" class="w-full sm:w-auto px-8 py-4 bg-neon-gradient text-[#050505] rounded-full font-bold text-base shadow-[0_0_30px_rgba(142,222,102,0.3)] hover:scale-105 transition-all text-center">
					LINEで友だち追加する
				</a>
				<a href="#about" class="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-medium text-base text-white transition-all text-center">
					詳細を見る
				</a>
			</div>
			<!-- 下スクロールを促すアイコン -->
			<div class="pt-16 animate-bounce text-white/40 flex flex-col items-center gap-2 text-xs tracking-widest">
				<span>SCROLL DOWN</span>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
				</svg>
			</div>
		</div>
	</section>

	<!-- セクション: イノパについて -->
	<section id="about" class="min-h-screen flex flex-col justify-center py-24 px-6 bg-[#0a0a0a]/80 backdrop-blur-sm border-t border-white/5">
		<div class="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
			<div class="space-y-6">
				<h2 class="text-sm font-bold tracking-widest text-neon uppercase">ABOUT INNOVATION PARK</h2>
				<h3 class="text-3xl md:text-5xl font-black text-white leading-tight">
					コワーキングスペースと<br />カフェが融合したイノベーションの場
				</h3>
				<p class="text-white/70 leading-relaxed">
					INNOVATION PARK OSAKA IZUMI（イノパ）は、単なる作業場所ではありません。地域の人々、クリエイター、起業家が集まり、新たなコラボレーションやアイデアが生まれる「共創のプラットフォーム」です。
				</p>
				<p class="text-white/70 leading-relaxed">
					洗練された木目調のインテリアと豊かなインドアグリーンが調和する空間で、日常のワークスペースとしても、大切なビジネスミーティングの場としても、最高の生産性を提供します。
				</p>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div class="p-6 bg-glass rounded-2xl border border-white/5 space-y-3 hover:border-neon/30 transition-all">
					<div class="text-neon text-3xl font-extrabold">1 <span class="text-sm">min</span></div>
					<h4 class="text-white font-bold">和泉中央駅 直結</h4>
					<p class="text-white/50 text-xs">駅からペデストリアンデッキを通り徒歩1〜2分。抜群のアクセス性。</p>
				</div>
				<div class="p-6 bg-glass rounded-2xl border border-white/5 space-y-3 hover:border-neon/30 transition-all">
					<div class="text-neon text-3xl font-extrabold">Free</div>
					<h4 class="text-white font-bold">LINE登録で無料</h4>
					<p class="text-white/50 text-xs">公式LINEを友だち追加するだけでコワーキングスペースを無料で利用可能。</p>
				</div>
				<div class="p-6 bg-glass rounded-2xl border border-white/5 space-y-3 hover:border-neon/30 transition-all">
					<div class="text-neon text-3xl font-extrabold">Wi-Fi</div>
					<h4 class="text-white font-bold">超高速ネット環境</h4>
					<p class="text-white/50 text-xs">全席に電源を完備し、高速Wi-Fiで快適なビジネスワークをサポート。</p>
				</div>
				<div class="p-6 bg-glass rounded-2xl border border-white/5 space-y-3 hover:border-neon/30 transition-all">
					<div class="text-neon text-3xl font-extrabold">LED</div>
					<h4 class="text-white font-bold">大型ディスプレイ</h4>
					<p class="text-white/50 text-xs">プレゼンテーションやイベントの演出に最適な、圧倒的迫力の大型モニター。</p>
				</div>
			</div>
		</div>
	</section>

	<!-- セクション: コワーキングスペース -->
	<section id="coworking" class="min-h-screen flex flex-col justify-center py-24 px-6 bg-transparent">
		<div class="max-w-4xl mx-auto space-y-8 text-right lg:text-left">
			<div class="inline-block px-4 py-1.5 rounded-full bg-[#8ede66]/10 text-neon text-sm font-bold tracking-wider">
				01. COWORKING SPACE
			</div>
			<div class="max-w-2xl bg-glass p-8 md:p-12 rounded-3xl border border-white/10 space-y-6 shadow-2xl">
				<h3 class="text-3xl md:text-4xl font-extrabold text-white">
					あらゆるクリエイティブワークを<br class="hidden sm:block" />加速させるスペース
				</h3>
				<p class="text-white/70 leading-relaxed text-sm md:text-base">
					静かに集中できるパーソナルブースから、アイデアを広げるための共有テーブルまで、目的に応じて選べる座席レイアウト。全席に電源を完備し、ストレスフリーでクリエイティブな時間を過ごすことができます。
				</p>
				<ul class="space-y-3 text-white/80 text-sm">
					<li class="flex items-center gap-3">
						<svg class="w-5 h-5 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
						</svg>
						高速かつセキュリティ万全な専用Wi-Fi
					</li>
					<li class="flex items-center gap-3">
						<svg class="w-5 h-5 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
						</svg>
						全席にコンセント・充電用USBポートを配置
					</li>
					<li class="flex items-center gap-3">
						<svg class="w-5 h-5 text-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
						</svg>
						打ち合わせや商談に最適なフリーミーティングエリア
					</li>
				</ul>
			</div>
		</div>
	</section>

	<!-- セクション: カフェ -->
	<section id="cafe" class="min-h-screen flex flex-col justify-center py-24 px-6 bg-[#050505]/40">
		<div class="max-w-4xl mx-auto flex justify-end">
			<div class="max-w-2xl bg-glass p-8 md:p-12 rounded-3xl border border-white/10 space-y-6 shadow-2xl text-left">
				<div class="inline-block px-4 py-1.5 rounded-full bg-[#8ede66]/10 text-neon text-sm font-bold tracking-wider mb-2">
					02. CAFE EXPERIENCE
				</div>
				<h3 class="text-3xl md:text-4xl font-extrabold text-white">
					上質なコーヒーと、憩いのひととき
				</h3>
				<p class="text-white/70 leading-relaxed text-sm md:text-base">
					イノパの魅力は本格的なカフェサービスにもあります。注文を受けてから一杯ずつ丁寧に抽出するエスプレッソやカプチーノは、仕事の合間のリフレッシュに最適です。
				</p>
				<p class="text-white/70 leading-relaxed text-sm md:text-base">
					お仕事のお供としてはもちろん、カフェのみのカジュアルなご利用も大歓迎。心地よいBGMとコーヒーの香りに包まれて、上質なリラックスタイムをお過ごしください。
				</p>
				<div class="flex gap-4 pt-2">
					<div class="text-xs px-3 py-2 bg-white/5 rounded-lg border border-white/5 text-white/60">
						Espresso & Coffee
					</div>
					<div class="text-xs px-3 py-2 bg-white/5 rounded-lg border border-white/5 text-white/60">
						Soft Drinks
					</div>
					<div class="text-xs px-3 py-2 bg-white/5 rounded-lg border border-white/5 text-white/60">
						Desserts & Snacks
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- セクション: イベントスペース -->
	<section id="event" class="min-h-screen flex flex-col justify-center py-24 px-6 bg-transparent">
		<div class="max-w-4xl mx-auto space-y-8">
			<div class="inline-block px-4 py-1.5 rounded-full bg-[#8ede66]/10 text-neon text-sm font-bold tracking-wider">
				03. EVENT SPACE & DISPLAY
			</div>
			<div class="max-w-2xl bg-glass p-8 md:p-12 rounded-3xl border border-white/10 space-y-6 shadow-2xl">
				<h3 class="text-3xl md:text-4xl font-extrabold text-white">
					大型ディスプレイによる、<br class="hidden sm:block" />
					圧倒的なイベントプレゼンテーション
				</h3>
				<p class="text-white/70 leading-relaxed text-sm md:text-base">
					スペースの前面には、視認性に優れた大型のLEDディスプレイモニターが設置されています。セミナー、新製品発表会、ミートアップ、クリエイティブイベントなど、多様な催し物を華やかに演出します。
				</p>
				<p class="text-white/70 leading-relaxed text-sm md:text-base">
					マイクや音響機材、配信用機材の連携も可能で、ハイブリッド形式のイベントやオンライン配信にも完全に対応。新しいカルチャーやイベントを「創る」「開く」「盛り上げる」最高のプラットフォームです。
				</p>
			</div>
		</div>
	</section>

	<!-- セクション: LINE登録促進 -->
	<section id="line" class="py-24 px-6 bg-gradient-to-b from-transparent to-[#0a0a0a] border-t border-white/5">
		<div class="max-w-4xl mx-auto bg-glass p-8 md:p-16 rounded-3xl border border-neon/30 text-center space-y-8 shadow-[0_0_50px_rgba(142,222,102,0.05)]">
			<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#8ede66]/10 text-xs text-neon tracking-wider font-bold">
				LINE MEMBER EXCLUSIVE
			</div>
			<h2 class="text-3xl md:text-5xl font-black text-white leading-tight">
				公式LINE追加で、<br />
				コワーキングスペース利用が「無料」に。
			</h2>
			<p class="text-white/70 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
				イノパをもっと身近に。公式LINEアカウントを友だち登録していただくだけで、コワーキングスペースや各種サービスが無料でご利用いただけるようになります。
			</p>
			<div class="flex flex-col items-center gap-4 pt-4">
				<a href="https://line.me" target="_blank" rel="noopener noreferrer" class="px-10 py-5 bg-neon-gradient text-[#050505] rounded-full font-black text-lg shadow-[0_0_30px_rgba(142,222,102,0.4)] hover:scale-105 transition-all">
					LINE公式アカウントを登録する
				</a>
				<span class="text-xs text-white/40">※貸切イベントスペースなどの予約利用には別途料金が発生します。</span>
			</div>
		</div>
	</section>

	<!-- セクション: インフォメーション & アクセス -->
	<section id="access" class="py-24 px-6 bg-[#0a0a0a] border-t border-white/5">
		<div class="max-w-5xl mx-auto space-y-16">
			<div class="text-center space-y-4">
				<h2 class="text-sm font-bold tracking-widest text-neon uppercase">ACCESS & INFO</h2>
				<h3 class="text-3xl md:text-4xl font-extrabold text-white">アクセスと施設情報</h3>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
				<!-- 左側: 情報 -->
				<div class="space-y-8">
					<div class="p-8 bg-glass rounded-2xl border border-white/5 space-y-6">
						<h4 class="text-xl font-bold text-white tracking-wide border-l-4 border-neon pl-4">施設概要</h4>
						<dl class="space-y-4 text-sm">
							<div class="grid grid-cols-3 border-b border-white/5 pb-3">
								<dt class="text-white/50 font-medium">名称</dt>
								<dd class="col-span-2 text-white font-semibold">INNOVATION PARK OSAKA IZUMI</dd>
							</div>
							<div class="grid grid-cols-3 border-b border-white/5 pb-3">
								<dt class="text-white/50 font-medium">住所</dt>
								<dd class="col-span-2 text-white">大阪府和泉市いぶき野5丁目1-14 エコール・いずみ東館1階</dd>
							</div>
							<div class="grid grid-cols-3 border-b border-white/5 pb-3">
								<dt class="text-white/50 font-medium">アクセス</dt>
								<dd class="col-span-2 text-white">泉北高速鉄道「和泉中央」駅 徒歩1〜2分（直結ペデストリアンデッキ経由）</dd>
							</div>
							<div class="grid grid-cols-3 border-b border-white/5 pb-3">
								<dt class="text-white/50 font-medium">営業時間</dt>
								<dd class="col-span-2 text-white">10:00 〜 20:00</dd>
							</div>
							<div class="grid grid-cols-3">
								<dt class="text-white/50 font-medium">定休日</dt>
								<dd class="col-span-2 text-white">エコール・いずみの休館日に準じます</dd>
							</div>
						</dl>
					</div>

					<div class="p-8 bg-glass rounded-2xl border border-white/5 space-y-4">
						<h4 class="text-lg font-bold text-white">ご利用にあたって</h4>
						<p class="text-xs text-white/50 leading-relaxed">
							コワーキングスペースおよびカフェはどなたでも自由にご利用いただけます。コワーキングとしての滞在利用は、受付にてLINEの友だち追加画面をご提示ください。
							会議室や貸切イベントのご予約は、事前に外部予約システムより承っております。詳細はお気軽にお問い合わせください。
						</p>
					</div>
				</div>

				<!-- 右側: マップ (エコール・いずみの場所を示すおしゃれな地図やiframe) -->
				<div class="h-full min-h-[400px] bg-glass rounded-3xl overflow-hidden border border-white/10 relative">
					<!-- Google Map iframe (エコール・いずみ) -->
					<iframe 
						title="INNOVATION PARK OSAKA IZUMI Map"
						src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3289.475459345229!2d135.42436157640476!3d34.46545199587425!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6000db4be747db5d%3A0xe5e1281fa0c201df!2z44Ko44Kz44O844Or44O744GE44Ga44G_!5e0!3m2!1sja!2sjp!4v1718000000000!5m2!1sja!2sjp" 
						class="w-full h-full min-h-[400px] border-0 opacity-80 contrast-125 filter grayscale invert"
						allowfullscreen="" 
						loading="lazy" 
						referrerpolicy="no-referrer-when-downgrade"
					></iframe>
				</div>
			</div>
		</div>
	</section>

	<!-- フッター -->
	<footer class="bg-[#050505] text-white/40 text-xs py-12 px-6 border-t border-white/5">
		<div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
			<div>
				<p class="font-bold text-white/60 mb-2">INNOVATION PARK OSAKA IZUMI</p>
				<p>© 2026 INNOVATION PARK OSAKA IZUMI 非公式ファンサイト. All Rights Reserved.</p>
				<p class="text-[10px] text-white/30 mt-1">※本サイトは非公式に作成されたファンメイドのデモページであり、公式サイトではありません。</p>
			</div>
			<div class="flex gap-6 text-white/60">
				<a href="https://izumi.innovation-park.jp/" target="_blank" rel="noopener noreferrer" class="hover:text-neon transition-colors">
					公式サイトはこちら →
				</a>
			</div>
		</div>
	</footer>
</div>
