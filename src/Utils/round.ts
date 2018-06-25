export default function round(num: number, digits = 0) {
	const exp = Math.pow(10, digits);
	return Math.round(num * exp) / exp;
}
