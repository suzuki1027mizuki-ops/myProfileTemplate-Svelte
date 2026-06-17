// Pre-defined template shapes generated programmatically

// 1. Horizontal Line (left to right)
const lineH = [];
for (let i = 0; i <= 20; i++) {
	lineH.push({ x: 10 + i * 4, y: 50 });
}

// 2. Vertical Line (bottom to top)
const lineV = [];
for (let i = 0; i <= 20; i++) {
	lineV.push({ x: 50, y: 90 - i * 4 });
}

// 3. V-Shape (∨, left-to-right)
const shapeV = [
	{ x: 15, y: 15 },
	{ x: 25, y: 35 },
	{ x: 35, y: 55 },
	{ x: 50, y: 85 },
	{ x: 65, y: 55 },
	{ x: 75, y: 35 },
	{ x: 85, y: 15 }
];

// 4. Caret (∧, left-to-right)
const caret = [
	{ x: 15, y: 85 },
	{ x: 25, y: 65 },
	{ x: 35, y: 45 },
	{ x: 50, y: 15 },
	{ x: 65, y: 45 },
	{ x: 75, y: 65 },
	{ x: 85, y: 85 }
];

// 5. Triangle (bottom-left -> apex -> bottom-right -> bottom-left)
const triangle = [];
// left leg
for (let i = 0; i <= 10; i++) {
	triangle.push({ x: 15 + i * 3.5, y: 85 - i * 7.0 }); // (15,85) to (50,15)
}
// right leg
for (let i = 1; i <= 10; i++) {
	triangle.push({ x: 50 + i * 3.5, y: 15 + i * 7.0 }); // (50,15) to (85,85)
}
// bottom baseline
for (let i = 1; i <= 10; i++) {
	triangle.push({ x: 85 - i * 7.0, y: 85 }); // (85,85) to (15,85)
}

// 6. Circle (clockwise, start at top)
const circle = [];
for (let i = 0; i <= 36; i++) {
	let angle = (i * 10 * Math.PI) / 180 - Math.PI / 2;
	circle.push({
		x: 50 + 35 * Math.cos(angle),
		y: 50 + 35 * Math.sin(angle)
	});
}

// 7. Square (clockwise, start top-left)
const square = [];
// top side
for (let i = 0; i <= 10; i++) square.push({ x: 20 + i * 6, y: 20 });
// right side
for (let i = 1; i <= 10; i++) square.push({ x: 80, y: 20 + i * 6 });
// bottom side
for (let i = 1; i <= 10; i++) square.push({ x: 80 - i * 6, y: 80 });
// left side
for (let i = 1; i <= 10; i++) square.push({ x: 20, y: 80 - i * 6 });

// 8. Z-Shape (clockwise, start top-left)
const shapeZ = [];
// top bar
for (let i = 0; i <= 10; i++) shapeZ.push({ x: 20 + i * 6, y: 20 });
// diagonal
for (let i = 1; i <= 10; i++) shapeZ.push({ x: 80 - i * 6, y: 20 + i * 6 });
// bottom bar
for (let i = 1; i <= 10; i++) shapeZ.push({ x: 20 + i * 6, y: 80 });

// 9. Heart (start at top center cleft, draw left lobe then right lobe)
const heart = [];
for (let i = 0; i <= 40; i++) {
	let t = (i / 40) * 2 * Math.PI - Math.PI / 2; // start from top cleft
	// parametric equation centered at (50, 45)
	let x = 16 * Math.pow(Math.sin(t), 3);
	let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
	heart.push({
		x: 50 + x * 1.8,
		y: 45 - y * 1.8 // flip y
	});
}

// 10. Spiral (draw from center outwards)
const spiral = [];
for (let i = 0; i <= 50; i++) {
	let r = 0.5 + i * 0.75;
	let angle = (i * 12 * Math.PI) / 180;
	spiral.push({
		x: 50 + r * Math.cos(angle),
		y: 50 + r * Math.sin(angle)
	});
}

export const GestureTemplates = {
	'Horizontal Line': lineH,
	'Vertical Line': lineV,
	'V-Shape': shapeV,
	'Caret': caret,
	'Triangle': triangle,
	'Circle': circle,
	'Square': square,
	'Z-Shape': shapeZ,
	'Heart': heart,
	'Spiral': spiral
};
