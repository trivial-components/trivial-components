import {TrivialComboBox} from "../../ts/TrivialComboBox";
import {createCurrencyEntries, createDemoTreeNodes, createEntries, DemoEntry, firstNames, lastNames, randomImageUrl, randomOf, words} from "./demo-util";
import {TrivialListBox} from "../../ts/TrivialListBox";
import {TrivialTagComboBox} from "../../ts/TrivialTagComboBox";
import {TrivialTreeBox} from "../../ts/TrivialTreeBox";
import {TrivialTreeComboBox} from "../../ts/TrivialTreeComboBox";
import {TrivialTree} from "../../ts/TrivialTree";
import {TrivialUnitBox} from "../../ts/TrivialUnitBox";
import {TimeUnit, TrivialCalendarBox} from "../../ts/TrivialCalendarBox";
import moment = require("moment");
import {TrivialDateTimeField} from "../../ts/TrivialDateTimeField";

import Moment = moment.Moment;
import {trivialMatch} from "../../ts/TrivialCore";

$(function () {

	// setInterval(() => console.log(document.activeElement), 1000);
	// setInterval(() => console.log(window.getSelection().focusNode), 1000);


	let demo: any = (window as any).demo = {};

	demo.defaultFilteringCombobox = new TrivialComboBox("#defaultFilteringComboBox", {
		entries: createEntries(),
		showClearButton: true
	});
	demo.defaultFilteringCombobox.onSelectedEntryChanged.addListener(function(entry: any) {   
		console.log("defaultFilteringCombobox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"))
	});
	demo.defaultFilteringCombobox.onFocus.addListener(function() {
		console.log("defaultFilteringCombobox focus");
	});
	demo.defaultFilteringCombobox.onBlur.addListener(function() {
		console.log("defaultFilteringCombobox blur");
	});

	demo.freeTextComboBox = new TrivialComboBox('#freeTextComboBox', {
		entries: createEntries(),
		allowFreeText: true
	});
	demo.freeTextComboBox.onSelectedEntryChanged.addListener(function(entry: any) {
		console.log("freeTextComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"))
	});

	demo.noAutoCompleteComboBox = new TrivialComboBox('#noAutoCompleteComboBox', {
		entries: createEntries(),
		autoComplete: false
	});

	demo.iconSingleLineComboBox = new TrivialComboBox('#iconSingleLineComboBox', {
		entries: createEntries(),
	});

	demo.customFilteringComboBox = new TrivialComboBox('#customFilteringComboBox', {
		entries: createEntries(),
		queryFunction: function (queryString, resultCallback) {
			setTimeout(function () {
				resultCallback(createEntries().filter(function (entry: any) {
					return entry.displayValue.toLowerCase().indexOf(queryString.toLowerCase()) != -1 || entry.additionalInfo.toLowerCase().indexOf(queryString.toLowerCase()) != -1;
				}));
			}, 500);
		}
	});

	demo.valueFunctionComboBox = new TrivialComboBox('#valueFunctionComboBox', {
		entries: createEntries(),
		valueFunction: function(entry: any) {
			return entry ? entry.additionalInfo : null;
		}
	});

	demo.noTriggerComboBox = new TrivialComboBox('#noTriggerComboBox', {
		entries: createEntries(),
		showTrigger: false
	});

	const showDropDownOnResultsOnlyComboBoxEntries = createEntries();
	demo.showDropDownOnResultsOnlyComboBox = new TrivialComboBox('#showDropDownOnResultsOnlyComboBox', {
		entries: showDropDownOnResultsOnlyComboBoxEntries,
		queryFunction: function (queryString, resultCallback) {
			setTimeout(function () {
				resultCallback(showDropDownOnResultsOnlyComboBoxEntries.filter(function (entry: any) {
					return entry.displayValue.toLowerCase().indexOf(queryString.toLowerCase()) != -1 || entry.additionalInfo.toLowerCase().indexOf(queryString.toLowerCase()) != -1;
				}));
			}, 500);
		},
		showDropDownOnResultsOnly: true
	});

	demo.disabledComboBox = new TrivialComboBox('#disabledComboBox', {
		selectedEntry: createEntries(1)[0],
		editingMode: 'disabled'
	});

	demo.readonlyComboBox = new TrivialComboBox('#readonlyComboBox', {
		selectedEntry: createEntries(1)[0],
		editingMode: 'readonly'
	});

	const listBoxEntries = createEntries(10);
	(listBoxEntries[1] as any).template = "<div>custom template for entry {{id}}</div>";
	demo.listBox = new TrivialListBox('#listBox', {
		entries: listBoxEntries
	});

	demo.zeroConfigTagBox = new TrivialTagComboBox('#zeroConfigTagBox', {
		entries: createEntries()
	});
	demo.zeroConfigTagBox.onSelectedEntryChanged.addListener(function(entries: any[]) {
		console.log("zeroConfigTagBox onSelectedEntryChanged " + entries.map(function(e){return e.displayValue}).join(", "))
	});
	demo.zeroConfigTagBox.onFocus.addListener(function() {
		console.log("zeroConfigTagBox focus");
	});
	demo.zeroConfigTagBox.onBlur.addListener(function() {
		console.log("zeroConfigTagBox blur");
	});
	$(demo.zeroConfigTagBox.getMainDomElement()).change(function() {
		console.log("#zeroConfigTagBox change")
	});

	demo.customTemplateTagBox = new TrivialTagComboBox('#customTemplateTagBox1', {
		entries: createEntries(),
		selectedEntries: createEntries(2),
		showTrigger: false
	});

	demo.customTemplateTagBox2 = new TrivialTagComboBox('#customTemplateTagBox2', {
		entries: createEntries(),
		showTrigger: false
	});

	const attributeEntries = [
		{attribute: "From"},
		{attribute: "To"},
		{attribute: "CC"},
		{attribute: "BCC"},
		{attribute: "Message Text"},
		{attribute: "Attachments"}
	];

	const personsEntries: any[] = [];
	for (let i = 0; i < 50; i++) {
		const firstName = randomOf(firstNames);
		const lastName = randomOf(lastNames);
		personsEntries.push({
			person: {
				firstName: firstName,
				lastName: lastName,
				email: firstName + '.' + lastName + '@' + randomOf(words) + '.com',
				imageUrl: randomImageUrl()
			}
		});
	}

	let entryRenderingFunction = function (selectedDisplay: boolean, entry: any) {
		if (entry == null) {
			return '<div>';
		} else if (entry.attribute != null && entry.person == null) {
			return `<div class="entry ${selectedDisplay ? 'tag' : ''}"><div class="attribute">${entry.attribute}</div><div class="value free-text-value"><span class="tr-editor"></span></div></div>`;
		} else if (entry.attribute != null && entry.person != null) {
			return `<div class="entry ${selectedDisplay ? 'tag' : ''}"><div class="attribute">${entry.attribute}</div><div class="value person"><div class="profile-picture" style="background-image: url(${entry.person.imageUrl})"></div> ${entry.person.lastName ? entry.person.firstName + ' ' + entry.person.lastName : entry.person.email}</div></div>`;
		} else if (entry.person != null) {
			return `<div class="entry ${selectedDisplay ? 'tag' : ''}"><div class="value person"><div class="profile-picture" style="background-image: url(${entry.person.imageUrl})"></div> ${entry.person.lastName ? entry.person.firstName + ' ' + entry.person.lastName : entry.person.email}</div></div>`;
		}
	};
	demo.compositeTagBox = new TrivialTagComboBox<any>('#compositeTagBox', {
		queryFunction: function (searchString, resultCallback) {
			searchString = searchString || "";
			let matchingAttributeEntries: { attribute: string }[];
			matchingAttributeEntries = demo.compositeTagBox.getCurrentPartialTag() == null ? attributeEntries.filter(function (e) {
					return trivialMatch(e.attribute, searchString).length > 0;
			}) : [];
			const matchingPersons = personsEntries.filter(function (e) {
				let textMatches = trivialMatch(e.person.firstName, searchString).length > 0
					|| trivialMatch(e.person.lastName, searchString).length > 0;
				return matchingAttributeEntries.length == 0 && textMatches;
			});
			resultCallback([...matchingAttributeEntries, ...matchingPersons]);
		},
		entryRenderingFunction: (e) => entryRenderingFunction(false, e),
		selectedEntryRenderingFunction: (e) => entryRenderingFunction(true, e),
		tagCompleteDecider: (entry) => {
			return entry.person;
		},
		entryMerger: function (partialEntry, newEntry) {
			return {
				... newEntry,
				... partialEntry
			};
		},
		freeTextEntryFactory: (s) => {
			return {
				person: {
					email: s
				}
			}
		},
		selectionAcceptor: (e) => e.attribute != null || e.email && e.email.indexOf("@") !== -1    
	});

	demo.maxSelectedEntriesTagBox = new TrivialTagComboBox('#maxSelectedEntriesTagBox', {
		entries: createEntries(),
	});

	demo.noDropdownTagBox = new TrivialTagComboBox('#noDropdownTagBox', {
		showTrigger: false
	});

	const showDropDownOnResultsOnlyTagBoxEntries = createEntries();
	demo.showDropDownOnResultsOnlyTagBox = new TrivialTagComboBox('#showDropDownOnResultsOnlyTagBox', {
		entries: showDropDownOnResultsOnlyTagBoxEntries,
		queryFunction: function (queryString, resultCallback) {
			setTimeout(function () {
				resultCallback(showDropDownOnResultsOnlyTagBoxEntries.filter(function (entry) {
					return entry.displayValue.toLowerCase().indexOf(queryString.toLowerCase()) != -1 || entry.additionalInfo.toLowerCase().indexOf(queryString.toLowerCase()) != -1;
				}));
			}, 500);
		},
		showDropDownOnResultsOnly: true
	});

	demo.disabledTagBox = new TrivialTagComboBox('#disabledTagBox', {
		selectedEntries: createEntries(2),
		editingMode: 'disabled'
	});

	demo.readonlyTagBox = new TrivialTagComboBox('#readonlyTagBox', {
		selectedEntries: createEntries(2),
		editingMode: 'readonly'
	});

	demo.treeBoxContaine = new TrivialTreeBox('#treeBoxContainer', {
		entries: createDemoTreeNodes(),
		selectedEntryId: 2,
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		}
	});
	demo.singleSelectionTreeBoxContainer = new TrivialTreeBox('#singleSelectionTreeBoxContainer', {
		entries: createDemoTreeNodes(),
		selectedEntryId: 2,
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		showExpanders                 : false,
		enforceSingleExpandedPath     : true
	});

	const $treeComboBox = $('#treeComboBox');
	demo.treeComboBox = new TrivialTreeComboBox($treeComboBox, {
		entries: createDemoTreeNodes(),
		selectedEntry: createDemoTreeNodes()[0],
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		animationDuration: 200,
		showClearButton: true
	});
	demo.treeComboBox.onSelectedEntryChanged.addListener(function(entry: any) {
		console.log("treeComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"))
	});
	demo.treeComboBox.onFocus.addListener(function() {
		console.log("treeComboBox focus");
	});
	demo.treeComboBox.onBlur.addListener(function() {
		console.log("treeComboBox blur");
	});

	demo.freeTextTreeComboBox = new TrivialTreeComboBox('#freeTextTreeComboBox', {
		entries: createDemoTreeNodes(),
		selectedEntry: createDemoTreeNodes()[0],
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		allowFreeText: true,
		animationDuration: 0
	});
	demo.freeTextTreeComboBox.onSelectedEntryChanged.addListener(function(entry: any) {
		console.log("freeTextTreeComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"))
	});

	demo.disabledTreeComboBox = new TrivialTreeComboBox('#disabledTreeComboBox', {
		entries: createDemoTreeNodes(),
		selectedEntry: createDemoTreeNodes()[1],
		editingMode: 'disabled'
	});

	demo.readonlyTreeComboBox = new TrivialTreeComboBox('#readonlyTreeComboBox', {
		entries: createDemoTreeNodes(),
		selectedEntry: createDemoTreeNodes()[2],
		editingMode: 'readonly'
	});

	demo.lazyChildLoadingTreeComboBox =  new TrivialTreeComboBox('#lazyChildLoadingTreeComboBox', {
		entries: createDemoTreeNodes(),
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		animationDuration: 200
	});
	demo.lazyChildLoadingTreeComboBox.onSelectedEntryChanged.addListener(function(entry: any) {
		console.log("lazyChildLoadingTreeComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"))
	});

	demo.zeroConfigTree = new TrivialTree('#zeroConfigTree', {
		entries: createDemoTreeNodes(),
//            selectedEntryId: 2,
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		searchBarMode: 'always-visible'
	});
	demo.zeroConfigTree.onSelectedEntryChanged.addListener(function(node: any) {
		console.log("onSelectedEntryChanged " + (node ? node.id : "null"))
	});
	demo.zeroConfigTree.onNodeExpansionStateChanged.addListener(function(node: any) {
		console.log("onNodeExpansionStateChanged " + node.id)
	});

	demo.onDemandSearchFieldTree = new TrivialTree('#onDemandSearchFieldTree', {
		entries: createDemoTreeNodes(),
		directSelectionViaArrowKeys: true,
		selectedEntryId: 2,
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		searchBarMode: "show-if-filled"
	});

	demo.noSearchFieldTree = new TrivialTree('#noSearchFieldTree', {
		entries: createDemoTreeNodes(),
		selectedEntryId: 2,
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		searchBarMode: 'none'
	});

	demo.unitBox = new TrivialUnitBox('#unitBox', {
		entries: createCurrencyEntries(),
		selectedEntry: {
			code: 'EUR'
		}, decimalPrecision: 3,
		decimalSeparator: ',',
		thousandsSeparator: '.',
		allowNullAmount: true
	});
	demo.unitBox.onChange.addListener(function (data: { value: Moment, timeUnitEdited: TimeUnit}) {
		console.log("trivialUnitBox.amount: " + data.value);
		console.log("trivialUnitBox.unit: " + data.timeUnitEdited);
	});
	demo.unitBox.onFocus.addListener(function () {
		console.log("unitbox focus");
	});
	demo.unitBox.onBlur.addListener(function () {
		console.log("unitbox blur");
	});
	demo.unitBox.getEditor().addEventListener("unit box editor keyup", function() {console.log("keyup: " + demo.unitBox.getAmount() + " " + demo.unitBox.getSelectedEntry().code)});


	demo.unitBoxLeft = new TrivialUnitBox('#unitBoxLeft', {
		entries: createCurrencyEntries(),
		unitDisplayPosition: 'left'
	});
	demo.unitBoxSingleLineTemplate = new TrivialUnitBox('#unitBoxSingleLineTemplate', {
		entries: createCurrencyEntries()
	});
	demo.readonlyUnitBox = new TrivialUnitBox('#readonlyUnitBox', {
		entries: createCurrencyEntries(),
		editingMode: 'readonly',
		amount: 123456789,
		selectedEntry: createCurrencyEntries()[0]
	});
	demo.disabledUnitBox = new TrivialUnitBox('#disabledUnitBox', {
		entries: createCurrencyEntries(),
		editingMode: 'disabled',
		amount: 123456789,
		selectedEntry: createCurrencyEntries()[0]
	});

	demo.calendarBox = new TrivialCalendarBox('#calendarBox', {
		selectedDate: moment(),
		firstDayOfWeek: 1
	});

	demo.dateTimeField = new TrivialDateTimeField('#dateTimeField', {});

	let $destroyAllButton = $('#destroyAllButton').click(function() {
		Object.keys(demo).forEach(function(key) {
			demo[key].destroy();
		})
	});
});
