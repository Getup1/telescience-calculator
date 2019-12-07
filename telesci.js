function visit(target, error) {
	let rotation = target.bearing + error.bearing;
	let angle = clamp(target.elevation + error.elevation, 1, 90);
	let power = clamp(target.power + error.power, 1, 1000);
	
	let distance = 0.1 * power**2 * Math.sin(angle * Math.PI / 90)

	let targetX = Math.round(Telepad.X + distance * Math.sin(rotation * Math.PI / 180));
	let targetY = Math.round(Telepad.Y + distance * Math.cos(rotation * Math.PI / 180));
	
	return {
		x: targetX,
		y: targetY
	};
}

function triangulate(target, telepad, error) {
	const POWERS = [5, 10, 20, 25, 30, 40, 50, 80, 100];

	target.x -= telepad.x;
	target.y -= telepad.y;

	let distance = Math.hypot(target.x, target.y);
	

	//calculate minimum power for minimal electricity losses
	for(P of POWERS) {
		let elevation = 90 / Math.PI * Math.asin(10 * distance / (P + error.power)**2);
		let trueElevation = elevation + error.elevation;
		
		if((!Number.isNaN(trueElevation) && trueElevation > 0 && trueElevation < 90)) {
			return {
				bearing: 180 / Math.PI * Math.atan2(target.x, target.y) + error.bearing,
				elevation: trueElevation,
				power: P
			};
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

	poff = Math.round((Math.sqrt(D2) * power1 - Math.sqrt(D1) * power2) / (Math.sqrt(D1) - Math.sqrt(D2)));	

	let elevation1 = Math.asin(10 * D1 / (power1 + poff)**2) * 90 / Math.PI;
	let elevation2 = Math.asin(10 * D2 / (power2 + poff)**2) * 90 / Math.PI;
	if(Number.isNaN(elevation1))
		eoff = -Math.round(elevation - elevation2);
	else if(Number.isNaN(elevation2))
		eoff = -Math.round(elevation - elevation1);
	else
		eoff = -Math.round(2 * elevation - elevation1 - elevation2);
	
	return {
		bearing: boff,
		elevation: eoff,
		power: poff
	};
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}
