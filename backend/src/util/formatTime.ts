import { WAR_START_INTERVAL } from '../common/constant';

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'June',
	'July',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];
export const formatTime = (date: Date): string => {
	const hours = date.getHours().toString().length === 1 ? '0' + date.getHours() : date.getHours();
	const minutes =
		date.getMinutes().toString().length === 1 ? '0' + date.getMinutes() : date.getMinutes();
	const day = date.getDate();
	const month = MONTHS[date.getMonth()];

	return hours + ':' + minutes + ' ' + month + ' ' + day;
};
export const roundUptoInterval = (unixTimeStamp: number, intervalMinutes: number): number => {
	const remainder = unixTimeStamp % (intervalMinutes * 60);
	return remainder === 0 ? unixTimeStamp : unixTimeStamp + (intervalMinutes * 60 - remainder);
};
