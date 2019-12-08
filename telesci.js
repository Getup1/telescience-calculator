function visit(target, telepad, error) {
	let rotation = target.bearing + error.bearing;
	let angle = clamp(target.elevation + error.elevation, 1, 90);
	let power = clamp(target.power + error.power, 1, 1000);
	
	let distance = 0.1 * power**2 * Math.sin(angle * Math.PI / 90)

	let targetX = Math.round(telepad.x + distance * Math.sin(rotation * Math.PI / 180));
	let targetY = Math.round(telepad.y + distance * Math.cos(rotation * Math.PI / 180));
	
	return {
		x: targetX,
		y: targetY
	};
}

function triangulate(target, telepad, error, recurse) {
	recurse = typeof recurse == 'undefined';
	const POWERS = [5, 10, 20, 25, 30, 40, 50, 80, 100];

	target.x -= telepad.x;
	target.y -= telepad.y;

	let distance = Math.hypot(target.x, target.y);
	
	//calculate minimum power for minimal electricity losses
	for(P of POWERS) {
		let elevation = 90 / Math.PI * Math.asin(10 * distance / (P + error.power)**2);
		let trueElevation = elevation - error.elevation;
		let invElevation = 90 - elevation - error.elevation;
		let bearing = 180 / Math.PI * Math.atan2(target.x, target.y) + error.bearing;
		bearing = bearing < 0 ? bearing + 360 : bearing;
		let trueGood = (trueElevation > 0 && trueElevation < 90);
		let invGood = (invElevation > 0 && invElevation < 90);
		if(!Number.isNaN(elevation) && (trueGood || invGood)) {
			let hit = {
				bearing: bearing,
				elevation: trueGood ? trueElevation : invElevation,
				power: P
			};

			let miss = visit(hit, telepad, error);
			if(!recurse)
				return hit;
			target.x = (target.x + telepad.x) - (miss.x - target.x - telepad.x);
			target.y = (target.y + telepad.y) - (miss.y - target.y - telepad.y);
			return triangulate(target, telepad, error, false);
		}
	}

	return {
		bearing: NaN,
		elevation: NaN,
		power: NaN
	};
}

function calculateErrors(telepadCoords, coords1, coords2, bearing, elevation, power1, power2) {
	let boff, eoff, poff;

	let delta1 = {
		x: coords1.x - telepadCoords.x,
		y: coords1.y - telepadCoords.y,
	};
	let delta2 = {
		x: coords2.x - telepadCoords.x,
		y: coords2.y - telepadCoords.y,
	};

	let D1 = Math.hypot(delta1.x, delta1.y);
	let D2 = Math.hypot(delta2.x, delta2.y);

	let bearing1 = Math.atan2(delta1.x, delta1.y) * 180 / Math.PI;
	let bearing2 = Math.atan2(delta2.x, delta2.y) * 180 / Math.PI;
	boff = -Math.round((2 * bearing - bearing1 - bearing2) / 2); //average

	poff = clamp(Math.round((Math.sqrt(D2) * power1 - Math.sqrt(D1) * power2) / (Math.sqrt(D1) - Math.sqrt(D2))), -4, 0);

	let elevation1 = Math.asin(10 * D1 / (power1 + poff)**2) * 90 / Math.PI;
	let elevation2 = Math.asin(10 * D2 / (power2 + poff)**2) * 90 / Math.PI;

	if(Math.abs(10 * D1 / (power1 + poff)**2) >= 0.9 || Math.abs(10 * D2 / (power2 + poff)**2) >= 0.9) {
		console.log("Large inaccuracy expected. Recalibration is adviced.");
	}

	if(Number.isNaN(elevation1)) {
		eoff = -Math.round(elevation - elevation2);
	} else if(Number.isNaN(elevation2)) {
		eoff = -Math.round(elevation - elevation1);
	} else {
		eoff = -Math.round((2 * elevation - elevation1 - elevation2) / 2);
	}

	return {
		bearing: boff,
		elevation: eoff,
		power: poff
	};
}

//fixme: make it do stuff
function adjustErrors(coords, telepad, oldErrors) {
	let config = triangulate(coords, telepad, oldErrors);
	let calculated = visit(config, telepad, oldErrors);

	let Dold = Math.hypot(coords.x - telepad.x, coords.y - telepad.y);
	let Dnew = Math.hypot(calculated.x - telepad.x, calculated.y - telepad.y);
	let Bold = Math.atan2(coords.x - telepad.x, coords.y - telepad.y);
	let Bnew = Math.atan2(calculated.x - telepad.x, calculated.y - telepad.y);

	return {
		bearing: oldErrors.bearing + Bnew - Bold,
		elevation: oldErrors.elevation,
		power: oldErrors.power
	};
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
