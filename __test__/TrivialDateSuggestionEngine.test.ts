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

import {TrivialDateSuggestionEngine} from "../src/TrivialDateSuggestionEngine";
import * as moment from "../node_modules/moment/moment.js";


function readableSuggestion(s: any) {
	return s.moment.format('YYYY-MM-DD') + ":" + s.ymdOrder;
}

describe('TeamApps.extractAllPossibleDateFragmentCombinations', function () {
	it('returns suggestions for the next week if the input is empty', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("", moment("2015-01-27")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-01-27"), ymdOrder: ""},
			{moment: moment("2015-01-28"), ymdOrder: ""},
			{moment: moment("2015-01-29"), ymdOrder: ""},
			{moment: moment("2015-01-30"), ymdOrder: ""},
			{moment: moment("2015-01-31"), ymdOrder: ""},
			{moment: moment("2015-02-01"), ymdOrder: ""},
			{moment: moment("2015-02-02"), ymdOrder: ""}
		].map(readableSuggestion));
	});
	it('returns future day suggestions for a single digit input', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("2", moment("2015-01-01")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-01-02"), ymdOrder: "D"}
		].map(readableSuggestion));
	});
	it('returns future day suggestions for a single digit input, jumping into the next month if necessary', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("2", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-02-02"), ymdOrder: "D"}
		].map(readableSuggestion));
	});
	it('returns past day suggestions for a single digit input, if favorPastDates == true', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD", favorPastDates: true}).generateSuggestions("3", moment("2015-01-02")).map(readableSuggestion)).toEqual([
			{moment: moment("2014-12-03"), ymdOrder: "D"}
		].map(readableSuggestion));
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD", favorPastDates: true}).generateSuggestions("4", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-01-04"), ymdOrder: "D"}
		].map(readableSuggestion));
	});
	it('returns day (!) and day-month suggestions if the input has 2 digits and is interpretable as day', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("14", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-01-14"), ymdOrder: "D"},
			{moment: moment("2016-01-04"), ymdOrder: "MD"},
			{moment: moment("2015-04-01"), ymdOrder: "DM"}
		].map(readableSuggestion));
	});
	it('skips months until it finds a valid date in the future for day-only input', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("30", moment("2015-01-31")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-03-30"), ymdOrder: "D"}
		].map(readableSuggestion));
	});
	it('skips months until it finds a valid date in the past for day-only input, if favorPastDates == true', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD", favorPastDates: true}).generateSuggestions("30", moment("2015-03-29")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-01-30"), ymdOrder: "D"}
		].map(readableSuggestion));
	});
	it('returns only day-month suggestions if the input has 2 digits and is NOT interpretable as day', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("94", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-09-04"), ymdOrder: "MD"},
			{moment: moment("2015-04-09"), ymdOrder: "DM"},
		].map(readableSuggestion));
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("94", moment("2015-10-01")).map(readableSuggestion)).toEqual([
			{moment: moment("2016-09-04"), ymdOrder: "MD"},
			{moment: moment("2016-04-09"), ymdOrder: "DM"},
		].map(readableSuggestion));
	});
	it('returns only day-month suggestions if the input has 2 digits and is NOT interpretable as day - in the past, if favorPastDates == true', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD", favorPastDates: true}).generateSuggestions("94", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2014-09-04"), ymdOrder: "MD"},
			{moment: moment("2014-04-09"), ymdOrder: "DM"},
		].map(readableSuggestion));
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD", favorPastDates: true}).generateSuggestions("94", moment("2015-10-01")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-09-04"), ymdOrder: "MD"},
			{moment: moment("2015-04-09"), ymdOrder: "DM"},
		].map(readableSuggestion));
	});
	it('returns day-month and day-month-year suggestions for 3-digit inputs', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("123", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2015-01-23"), ymdOrder: "MD"},
			{moment: moment("2015-12-03"), ymdOrder: "MD"},
			{moment: moment("2001-02-03"), ymdOrder: "YMD"},
			{moment: moment("2015-03-12"), ymdOrder: "DM"},
			{moment: moment("2001-03-02"), ymdOrder: "YDM"},
			{moment: moment("2002-01-03"), ymdOrder: "MYD"},
			{moment: moment("2002-03-01"), ymdOrder: "DYM"},
			{moment: moment("2003-01-02"), ymdOrder: "MDY"},
			{moment: moment("2003-02-01"), ymdOrder: "DMY"},
		].map(readableSuggestion));
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("193", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2001-09-03"), ymdOrder: "YMD"},
			{moment: moment("2015-03-19"), ymdOrder: "DM"},
			{moment: moment("2001-03-09"), ymdOrder: "YDM"},
			{moment: moment("2003-01-09"), ymdOrder: "MDY"},
			{moment: moment("2003-09-01"), ymdOrder: "DMY"},
			{moment: moment("2009-01-03"), ymdOrder: "MYD"},
			{moment: moment("2009-03-01"), ymdOrder: "DYM"},
		].map(readableSuggestion));
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("789", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2007-08-09"), ymdOrder: "YMD"},
			{moment: moment("2007-09-08"), ymdOrder: "YDM"},
			{moment: moment("2008-07-09"), ymdOrder: "MYD"},
			{moment: moment("2008-09-07"), ymdOrder: "DYM"},
			{moment: moment("2009-07-08"), ymdOrder: "MDY"},
			{moment: moment("2009-08-07"), ymdOrder: "DMY"},
		].map(readableSuggestion));
	});
	it('returns day-month and day-month-year suggestions for 4-digit inputs', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("1212", moment("2015-01-05")).map(readableSuggestion))
			.toEqual(["2015-12-12:MD", "2001-02-12:YMD", "2012-01-02:YMD", "2001-02-21:YDM", "2001-12-02:YDM", "2002-01-12:MYD", "2002-01-21:MDY", "2002-12-01:DYM", "2012-02-01:DMY", "2021-01-02:MYD", "2021-02-01:DYM"]);
	});
	it('returns and day-month-year suggestions for 5-digit inputs', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "MM-DD-YYYY"}).generateSuggestions("12123", moment("2015-01-05")).map(readableSuggestion))
			.toEqual(["2003-12-12:MDY", "2023-01-21:MDY", "2023-12-01:MDY", "2001-12-23:MYD", "2012-01-23:YMD", "2012-03-12:YDM", "2012-12-03:MYD", "2021-01-23:MYD", "2023-01-12:DMY"]);
	});
	it('returns and day-month-year suggestions for 6-digit inputs', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("121423", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2014-12-23"), ymdOrder: "MYD"},
			{moment: moment("2023-12-14"), ymdOrder: "MDY"}
		].map(readableSuggestion));
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("129923", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("1999-12-23"), ymdOrder: "MYD"}
		].map(readableSuggestion));
	});
	it('returns and day-month-year suggestions for 7-digit inputs', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("1211123", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2111-01-23"), ymdOrder: "MYD"}
		].map(readableSuggestion));
	});
	it('returns and day-month-year suggestions for 8-digit inputs', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("10211123", moment("2015-01-05")).map(readableSuggestion)).toEqual([
			{moment: moment("2111-10-23"), ymdOrder: "MYD"}
		].map(readableSuggestion));
	});
	it('returns an empty array for 9-digit inputs', function () {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "YYYY-MM-DD"}).generateSuggestions("102111232", moment("2015-01-05"))).toEqual([]);
	});
	it('suggests the right thing for 4417 ;-)', () => {
		expect(new TrivialDateSuggestionEngine({preferredDateFormat: "DD.MM.YYYY"}).generateSuggestions("4417", moment("2017-05-12")).map(readableSuggestion))
			.toEqual(["2017-04-04:DMY", "1941-04-07:MYD", "1941-07-04:DYM", "1944-01-07:YMD", "1944-07-01:YDM", "2004-04-17:YMD"]);
	});

});

describe('TrivialDateSuggestionEngine.dateFormatToYmdOrder', function () {
	it('gets the YMD order right', function () {
		expect(TrivialDateSuggestionEngine.dateFormatToYmdOrder("YYYY-MM-DD")).toEqual("YMD");
		expect(TrivialDateSuggestionEngine.dateFormatToYmdOrder("MM/DD/YYYY")).toEqual("MDY");
		expect(TrivialDateSuggestionEngine.dateFormatToYmdOrder("M/D/Y")).toEqual("MDY");
		expect(TrivialDateSuggestionEngine.dateFormatToYmdOrder("DD.MM.YYYY")).toEqual("DMY");
		expect(TrivialDateSuggestionEngine.dateFormatToYmdOrder("DD.MM.DD.YYYY")).toEqual("DMY");
	});
});