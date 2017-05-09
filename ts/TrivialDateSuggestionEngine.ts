/*
 *
 *  Copyright 2016 Yann Massard (https://github.com/yamass) and other contributors
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 */

import Moment = moment.Moment;

import * as moment from 'moment';

export interface DateSuggestion {
	moment: Moment;
	ymdOrder: string;
}
export type YearMonthDayOrder = "YMD" | "YDM" | "MDY" | "MYD" | "DMY" | "DYM";

export class TrivialDateSuggestionEngine {

	constructor(private dateFormat: string) {
	}

	public generateSuggestions(searchString: string, now: Moment | Date): DateSuggestion[] {
		now = moment(now);
		let suggestions: DateSuggestion[];
		if (searchString.match(/[^\d]/)) {
			let fragments = searchString.split(/[^\d]/).filter(f => !!f);
			suggestions = TrivialDateSuggestionEngine.createSuggestionsForFragments(fragments, now);
		} else {
			suggestions = TrivialDateSuggestionEngine.generateSuggestionsForDigitsOnlyInput(searchString, now);
		}

		suggestions = this.removeDuplicates(suggestions);

		// sort by relevance
		let preferredYmdOrder: YearMonthDayOrder = TrivialDateSuggestionEngine.dateFormatToYmdOrder(this.dateFormat);
		suggestions.sort(function (a, b) {
			if (preferredYmdOrder.indexOf(a.ymdOrder) === -1 && preferredYmdOrder.indexOf(b.ymdOrder) !== -1) {
				return 1;
			} else if (preferredYmdOrder.indexOf(a.ymdOrder) !== -1 && preferredYmdOrder.indexOf(b.ymdOrder) === -1) {
				return -1;
			} else if (a.ymdOrder.length != b.ymdOrder.length) { // D < DM < DMY
				return a.ymdOrder.length - b.ymdOrder.length;
			} else {
				return a.moment.diff(now, 'days') - b.moment.diff(now, 'days'); // nearer is better
			}
		});

		return suggestions;
	}

	private removeDuplicates(suggestions: DateSuggestion[]) {
		let seenDates: Moment[] = [];
		return suggestions.filter(s => {
			let dateAlreadyContained = seenDates.filter(seenDate => s.moment.isSame(seenDate, 'day')).length > 0;
			if (dateAlreadyContained) {
				return false;
			} else {
				seenDates.push(s.moment);
				return true;
			}
		});
	}

	public static dateFormatToYmdOrder(dateFormat: string): YearMonthDayOrder {
		let ymdIndexes: { [key: string]: number } = {
			D: dateFormat.indexOf("D"),
			M: dateFormat.indexOf("M"),
			Y: dateFormat.indexOf("Y")
		};
		return <YearMonthDayOrder> (["D", "M", "Y"].sort((a, b) => ymdIndexes[a] - ymdIndexes[b]).join(""));
	}

	private static createDateParts(moment: Moment, ymdOrder: string): DateSuggestion {
		return {moment, ymdOrder};
	}

	public static generateSuggestionsForDigitsOnlyInput(input: string, today: Moment): DateSuggestion[] {
		if (!input) {
			let result = [];
			for (let i = 0; i < 7; i++) {
				result.push(TrivialDateSuggestionEngine.createDateParts(moment(today).add(i, "day"), ""));
			}
			return result;
		} else if (input.length > 8) {
			return [];
		}

		let suggestions: DateSuggestion[] = [];
		for (let i = 1; i <= input.length; i++) {
			for (let j = Math.min(input.length, i + 1); j <= input.length && j - i <= 4; j - i === 2 ? j += 2 : j++) {
				suggestions = suggestions.concat(TrivialDateSuggestionEngine.createSuggestionsForFragments([input.substring(0, i), input.substring(i, j), input.substring(j, input.length)], today));
			}
		}
		return suggestions;
	}

	private static createSuggestionsForFragments(fragments: string[], today: Moment): DateSuggestion[] {
		function todayOrFuture(m: Moment): boolean {
			return today.isBefore(m, 'day') || today.isSame(m, 'day');
		}

		function numberToYear(n: number): number {
			let shortYear = today.year() % 100;
			let yearSuggestionBoundary = (shortYear + 20) % 100; // suggest 20 years into the future and 80 year backwards
			let currentCentury = Math.floor(today.year() / 100) * 100;
			if (n < yearSuggestionBoundary) {
				return currentCentury + n;
			} else if (n < 100) {
				return currentCentury - 100 + n;
			} else if (n > today.year() - 100 && n < today.year() + 100) {
				return n;
			} else {
				return null;
			}
		}

		let [s1, s2, s3] = fragments;
		let [n1, n2, n3] = [parseInt(s1), parseInt(s2), parseInt(s3)];
		let suggestions = [];

		if (s1 && !s2 && !s3) {
			let momentInCurrentMonth = moment([today.year(), today.month(), s1]);
			if (momentInCurrentMonth.isValid() && todayOrFuture(momentInCurrentMonth)) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(momentInCurrentMonth, "D"));
			} else {
				let momentInNextMonth = moment([today.year() + (today.month() == 11 ? 1 : 0), (today.month() + 1) % 12, s1]);
				if (momentInNextMonth.isValid()) {
					suggestions.push(TrivialDateSuggestionEngine.createDateParts(momentInNextMonth, "D"));
				}
			}
		} else if (s1 && s2 && !s3) {
			let mom;
			mom = moment([today.year(), n1 - 1, s2]);
			if (mom.isValid() && todayOrFuture(mom)) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "MD"));
			} else {
				mom = moment([today.year() + 1, n1 - 1, s2]);
				if (mom.isValid()) {
					suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "MD"));
				}
			}
			mom = moment([today.year(), n2 - 1, s1]);
			if (mom.isValid() && todayOrFuture(mom)) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "DM"));
			} else {
				mom = moment([today.year() + 1, n2 - 1, s1]);
				if (mom.isValid()) {
					suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "DM"));
				}
			}
		} else { // s1 && s2 && s3
			let mom;
			mom = moment([numberToYear(n1), n2 - 1, s3]);
			if (mom.isValid()) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "YMD"));
			}
			mom = moment([numberToYear(n1), n3 - 1, s2]);
			if (mom.isValid()) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "YDM"));
			}
			mom = moment([numberToYear(n2), n1 - 1, s3]);
			if (mom.isValid()) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "MYD"));
			}
			mom = moment([numberToYear(n2), n3 - 1, s1]);
			if (mom.isValid()) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "DYM"));
			}
			mom = moment([numberToYear(n3), n1 - 1, s2]);
			if (mom.isValid()) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "MDY"));
			}
			mom = moment([numberToYear(n3), n2 - 1, s1]);
			if (mom.isValid()) {
				suggestions.push(TrivialDateSuggestionEngine.createDateParts(mom, "DMY"));
			}
		}

		return suggestions;
	};
}