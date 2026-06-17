// Dollar One Gesture Recognizer (modified for orientation-sensitivity)

const NumPoints = 64;
const SquareSize = 250.0;
const Origin = { x: 0, y: 0 };
const AngleRange = 0.6; // ~35 degrees limit for tilt (orientation-sensitive)
const AnglePrecision = 2.0 * Math.PI / 180.0; // ~2 degrees
const Phi = 0.5 * (Math.sqrt(5.0) - 1.0); // Golden Ratio

export class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

export class Template {
	constructor(name, points) {
		this.name = name;
		// Preprocess the template points
		let resampled = resample(points, NumPoints);
		let scaled = scaleTo(resampled, SquareSize);
		this.points = translateTo(scaled, Origin);
	}
}

export class Recognizer {
	constructor(templates = []) {
		this.templates = templates;
	}

	addTemplate(name, points) {
		this.templates.push(new Template(name, points));
	}

	recognize(points) {
		if (points.length < 2) {
			return { name: 'None', score: 0 };
		}

		// Preprocess candidate points
		let resampled = resample(points, NumPoints);
		let scaled = scaleTo(resampled, SquareSize);
		let translated = translateTo(scaled, Origin);

		let bestDistance = Infinity;
		let bestTemplate = null;

		for (let i = 0; i < this.templates.length; i++) {
			let t = this.templates[i];
			// Search for best angle within the allowed tilt range
			let d = distanceAtBestAngle(translated, t, -AngleRange, AngleRange, AnglePrecision);
			if (d < bestDistance) {
				bestDistance = d;
				bestTemplate = t;
			}
		}

		if (bestTemplate === null) {
			return { name: 'None', score: 0 };
		}

		// Calculate similarity score: 1.0 - (d / (0.5 * Math.sqrt(2 * SquareSize^2)))
		let halfDiagonal = 0.5 * Math.sqrt(2.0 * SquareSize * SquareSize);
		let score = Math.max(0.0, 1.0 - bestDistance / halfDiagonal);

		return {
			name: bestTemplate.name,
			score: score
		};
	}
}

// Preprocessing Helper Functions

function resample(points, n) {
	let I = pathLength(points) / (n - 1);
	let D = 0.0;
	let newPoints = [{ x: points[0].x, y: points[0].y }];
	let pts = points.map(p => ({ x: p.x, y: p.y }));

	for (let i = 1; i < pts.length; i++) {
		let d = distance(pts[i - 1], pts[i]);
		if ((D + d) >= I) {
			let qx = pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x);
			let qy = pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y);
			let q = { x: qx, y: qy };
			newPoints.push(q);
			pts.splice(i, 0, q); // insert q as the next point
			D = 0.0;
		} else {
			D += d;
		}
	}

	// Safety adjustments
	while (newPoints.length < n) {
		newPoints.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
	}
	if (newPoints.length > n) {
		newPoints = newPoints.slice(0, n);
	}

	return newPoints;
}

function scaleTo(points, size) {
	let B = boundingBox(points);
	let newPoints = [];

	let maxDim = Math.max(B.width, B.height);
	if (maxDim === 0) maxDim = 1.0;

	// Hybrid scaling: if shape is extremely thin (like a line),
	// scale uniformly to prevent division by zero or extreme distortion.
	let isThin = (B.width / maxDim < 0.15) || (B.height / maxDim < 0.15);

	for (let i = 0; i < points.length; i++) {
		let qx, qy;
		if (isThin) {
			let scale = size / maxDim;
			qx = points[i].x * scale;
			qy = points[i].y * scale;
		} else {
			let w = B.width === 0 ? 1.0 : B.width;
			let h = B.height === 0 ? 1.0 : B.height;
			qx = points[i].x * (size / w);
			qy = points[i].y * (size / h);
		}
		newPoints.push({ x: qx, y: qy });
	}
	return newPoints;
}

function translateTo(points, pt) {
	let c = centroid(points);
	let newPoints = [];
	for (let i = 0; i < points.length; i++) {
		let qx = points[i].x + pt.x - c.x;
		let qy = points[i].y + pt.y - c.y;
		newPoints.push({ x: qx, y: qy });
	}
	return newPoints;
}

function distanceAtBestAngle(points, T, a, b, threshold) {
	let x1 = Phi * a + (1.0 - Phi) * b;
	let f1 = distanceAtAngle(points, T, x1);
	let x2 = (1.0 - Phi) * a + Phi * b;
	let f2 = distanceAtAngle(points, T, x2);

	while (Math.abs(b - a) > threshold) {
		if (f1 < f2) {
			b = x2;
			x2 = x1;
			f2 = f1;
			x1 = Phi * a + (1.0 - Phi) * b;
			f1 = distanceAtAngle(points, T, x1);
		} else {
			a = x1;
			x1 = x2;
			f1 = f2;
			x2 = (1.0 - Phi) * a + Phi * b;
			f2 = distanceAtAngle(points, T, x2);
		}
	}
	return Math.min(f1, f2);
}

function distanceAtAngle(points, T, radians) {
	let newPoints = rotateBy(points, radians);
	return pathDistance(newPoints, T.points);
}

function rotateBy(points, radians) {
	let c = centroid(points);
	let cos = Math.cos(radians);
	let sin = Math.sin(radians);
	let newPoints = [];
	for (let i = 0; i < points.length; i++) {
		let qx = (points[i].x - c.x) * cos - (points[i].y - c.y) * sin + c.x;
		let qy = (points[i].x - c.x) * sin + (points[i].y - c.y) * cos + c.y;
		newPoints.push({ x: qx, y: qy });
	}
	return newPoints;
}

// Distance & Path Helpers

function pathLength(points) {
	let d = 0.0;
	for (let i = 1; i < points.length; i++) {
		d += distance(points[i - 1], points[i]);
	}
	return d;
}

function distance(p1, p2) {
	let dx = p2.x - p1.x;
	let dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

function centroid(points) {
	let x = 0.0, y = 0.0;
	for (let i = 0; i < points.length; i++) {
		x += points[i].x;
		y += points[i].y;
	}
	return { x: x / points.length, y: y / points.length };
}

function boundingBox(points) {
	let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
	for (let i = 0; i < points.length; i++) {
		minX = Math.min(minX, points[i].x);
		maxX = Math.max(maxX, points[i].x);
		minY = Math.min(minY, points[i].y);
		maxY = Math.max(maxY, points[i].y);
	}
	return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function pathDistance(pts1, pts2) {
	let d = 0.0;
	for (let i = 0; i < pts1.length; i++) {
		d += distance(pts1[i], pts2[i]);
	}
	return d / pts1.length;
}
