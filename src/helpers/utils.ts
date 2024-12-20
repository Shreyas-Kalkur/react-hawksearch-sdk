import { FacetType } from 'models/Facets/FacetType';
import { useHawkConfig } from 'components/ConfigProvider';

export const getVisitorExpiry = () => {
	const d = new Date();
	// 1 year
	d.setTime(d.getTime() + 360 * 24 * 60 * 60 * 1000);
	return d.toUTCString();
};

export const getVisitExpiry = () => {
	const d = new Date();
	// 4 hours
	d.setTime(d.getTime() + 4 * 60 * 60 * 1000);
	return d.toUTCString();
};

export const createGuid = () => {
	const s: any[] = [];
	const hexDigits = '0123456789abcdef';
	for (let i = 0; i < 36; i++) {
		s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
	}
	s[14] = '4'; // bits 12-15 of the time_hi_and_version field to 0010
	// tslint:disable-next-line: no-bitwise
	s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
	s[8] = s[13] = s[18] = s[23] = '-';

	const uuid = s.join('');
	return uuid;
};

export const createWidgetId = () => {
	const s: any[] = [];
	const hexDigits = '0123456789abcdef';

	for (let i = 0; i < 16; i++) {
		s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
	}

	const uuid = s.join('');
	return uuid;
};

export const getCookie = name => {
	const nameEQ = name + '=';
	const ca = document.cookie.split(';');
	// tslint:disable-next-line: prefer-for-of
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === ' ') {
			c = c.substring(1, c.length);
		}
		if (c.indexOf(nameEQ) === 0) {
			return c.substring(nameEQ.length, c.length);
		}
	}
	return null;
};

export const setCookie = (name, value, expiry) => {
	let expires;
	if (expiry) {
		expires = '; expires=' + expiry;
	} else {
		expires = '';
	}
	document.cookie = name + '=' + value + expires + '; path=/';
};

function getRecentFacetExpiry() {
	const d = new Date();
	// 12 hours
	d.setTime(d.getTime() + 12 * 60 * 60 * 1000);
	return d.toUTCString();
}

export const getParsedObject = (facetC: string | null, siteDirectory?: string) => {
	if (!facetC) {
		return {};
	}
	const dict = {};
	(facetC || '').split(',').forEach(element => {
		const splitText = element.split('|');
		if (siteDirectory) {
			if (splitText.length > 2) {
				dict[splitText[0]] = dict[splitText[0]] || {};
				dict[splitText[0]][splitText[1]] = splitText[2];
			}
		} else {
			dict[splitText[0]] = splitText[1];
		}
	});
	return dict;
};

function getStringifyObject(obj) {
	const items: string[] = [];
	Object.keys(obj).forEach(element => {
		if (typeof obj[element] === 'object') {
			Object.keys(obj[element]).forEach((key, index) => {
				const item = element + '|' + key + '|' + obj[element][key];
				items.push(item);
			});
		} else {
			const item = element + '|' + obj[element];
			items.push(item);
		}
	});
	return items.join(',');
}

export const setRecentSearch = (siteDirectory: string | undefined, val: string) => {
	const cookie = getCookie(FacetType.RecentSearches);
	if (!cookie) {
		if (siteDirectory) {
			setCookie(FacetType.RecentSearches, `${siteDirectory}|${val}|1`, getRecentFacetExpiry());
		} else {
			setCookie(FacetType.RecentSearches, `${val}|1`, getRecentFacetExpiry());
		}
		return;
	}
	let dict = getParsedObject(cookie, siteDirectory);
	if (siteDirectory) {
		dict[siteDirectory] = dict[siteDirectory] && typeof dict[siteDirectory] === 'object' ? dict[siteDirectory] : {};
		if (dict[siteDirectory][val]) {
			dict[siteDirectory][val] = Number(dict[siteDirectory][val]) + 1;
		} else {
			dict[siteDirectory] = {
				...dict[siteDirectory],
				[val]: 1,
			};
		}
	} else {
		if (dict[val]) {
			dict[val] = Number(dict[val]) + 1;
		} else {
			dict = {
				...dict,
				[val]: 1,
			};
		}
	}
	const str = getStringifyObject(dict);

	setCookie(FacetType.RecentSearches, str, getRecentFacetExpiry());
};

export const deleteCookie = name => {
	document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

export const toBinary = (str: string) => {
	const codeUnits = new Uint16Array(str.length);
	for (let i = 0; i < codeUnits.length; i++) {
		codeUnits[i] = str.charCodeAt(i);
	}
	const charCodes = new Uint8Array(codeUnits.buffer);
	let result = '';
	for (let i = 0; i < charCodes.byteLength; i++) {
		result += String.fromCharCode(charCodes[i]);
	}
	return result;
};

export const fromBinary = binary => {
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	const charCodes = new Uint16Array(bytes.buffer);
	let result = '';
	charCodes.forEach(charCode => {
		result += String.fromCharCode(charCode);
	});
	return result;
};

export const isBase64 = str => {
	if (str === '' || str.trim() === '') {
		return false;
	}
	try {
		return btoa(atob(str)) === str;
	} catch (err) {
		return false;
	}
};
