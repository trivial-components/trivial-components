///<reference path="../../dist/tsd/index.d.ts"/>
///<reference types="moment"/>
///<reference path="demo-util.ts"/>

window.onload = (function () {

	// setInterval(() => console.log(document.activeElement), 1000);
	// setInterval(() => console.log(window.getSelection().focusNode), 1000);


	let demo: any = (window as any).demo = {};

	demo.zeroConfigTagBox = new TrivialComponents.TrivialTagComboBox('#zeroConfigTagBox', {
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

	demo.customTemplateTagBox = new TrivialComponents.TrivialTagComboBox('#customTemplateTagBox1', {
		entries: createEntries(),
		selectedEntries: createEntries(2),
		showTrigger: false
	});

	demo.customTemplateTagBox2 = new TrivialComponents.TrivialTagComboBox('#customTemplateTagBox2', {
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
	demo.compositeTagBox = new TrivialComponents.TrivialTagComboBox<any>('#compositeTagBox', {
		queryFunction: function (searchString, resultCallback) {
			searchString = searchString || "";
			let matchingAttributeEntries: { attribute: string }[];
			matchingAttributeEntries = demo.compositeTagBox.getCurrentPartialTag() == null ? attributeEntries.filter(function (e) {
					return TrivialComponents.trivialMatch(e.attribute, searchString).length > 0;
			}) : [];
			const matchingPersons = personsEntries.filter(function (e) {
				let textMatches = TrivialComponents.trivialMatch(e.person.firstName, searchString).length > 0
					|| TrivialComponents.trivialMatch(e.person.lastName, searchString).length > 0;
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

	demo.maxSelectedEntriesTagBox = new TrivialComponents.TrivialTagComboBox('#maxSelectedEntriesTagBox', {
		entries: createEntries(),
	});

	demo.noDropdownTagBox = new TrivialComponents.TrivialTagComboBox('#noDropdownTagBox', {
		showTrigger: false
	});

	const showDropDownOnResultsOnlyTagBoxEntries = createEntries();
	demo.showDropDownOnResultsOnlyTagBox = new TrivialComponents.TrivialTagComboBox('#showDropDownOnResultsOnlyTagBox', {
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

	demo.disabledTagBox = new TrivialComponents.TrivialTagComboBox('#disabledTagBox', {
		selectedEntries: createEntries(2),
		editingMode: 'disabled'
	});

	demo.readonlyTagBox = new TrivialComponents.TrivialTagComboBox('#readonlyTagBox', {
		selectedEntries: createEntries(2),
		editingMode: 'readonly'
	});

	demo.treeBoxContaine = new TrivialComponents.TrivialTreeBox('#treeBoxContainer', {
		entries: createDemoTreeNodes(),
		selectedEntryId: 2,
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		}
	});
	demo.singleSelectionTreeBoxContainer = new TrivialComponents.TrivialTreeBox('#singleSelectionTreeBoxContainer', {
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

	const $comboBox = $('#comboBox');
	demo.comboBox = new TrivialComponents.TrivialComboBox($comboBox, {
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
	demo.comboBox.onSelectedEntryChanged.addListener(function(entry: any) {
		console.log("comboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"))
	});
	demo.comboBox.onFocus.addListener(function() {
		console.log("comboBox focus");
	});
	demo.comboBox.onBlur.addListener(function() {
		console.log("comboBox blur");
	});

	demo.freeTextComboBox = new TrivialComponents.TrivialComboBox('#freeTextComboBox', {
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
	demo.freeTextComboBox.onSelectedEntryChanged.addListener(function(entry: any) {
		console.log("freeTextComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"))
	});

	demo.disabledComboBox = new TrivialComponents.TrivialComboBox('#disabledComboBox', {
		entries: createDemoTreeNodes(),
		selectedEntry: createDemoTreeNodes()[1],
		editingMode: 'disabled'
	});

	demo.readonlyComboBox = new TrivialComponents.TrivialComboBox('#readonlyComboBox', {
		entries: createDemoTreeNodes(),
		selectedEntry: createDemoTreeNodes()[2],
		editingMode: 'readonly'
	});

	demo.lazyChildLoadingComboBox =  new TrivialComponents.TrivialComboBox('#lazyChildLoadingComboBox', {
		entries: createDemoTreeNodes(),
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		animationDuration: 200
	});
	demo.lazyChildLoadingComboBox.onSelectedEntryChanged.addListener(function(entry: any) {
		console.log("lazyChildLoadingComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"))
	});

	demo.zeroConfigTree = new TrivialComponents.TrivialTree('#zeroConfigTree', {
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

	demo.onDemandSearchFieldTree = new TrivialComponents.TrivialTree('#onDemandSearchFieldTree', {
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

	demo.noSearchFieldTree = new TrivialComponents.TrivialTree('#noSearchFieldTree', {
		entries: createDemoTreeNodes(),
		selectedEntryId: 2,
		lazyChildrenQueryFunction: function (node, callback) {
			setTimeout(function () {
				callback(createDemoTreeNodes())
			}, 1000);
		},
		searchBarMode: 'none'
	});

	demo.unitBox = new TrivialComponents.TrivialUnitBox('#unitBox', {
		entries: createCurrencyEntries(),
		selectedEntry: {
			code: 'EUR'
		}, decimalPrecision: 3,
		decimalSeparator: ',',
		thousandsSeparator: '.',
		allowNullAmount: true
	});
	demo.unitBox.onChange.addListener(function (data: { value: any, timeUnitEdited: TrivialComponents.TimeUnit}) {
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


	demo.unitBoxLeft = new TrivialComponents.TrivialUnitBox('#unitBoxLeft', {
		entries: createCurrencyEntries(),
		unitDisplayPosition: 'left'
	});
	demo.unitBoxSingleLineTemplate = new TrivialComponents.TrivialUnitBox('#unitBoxSingleLineTemplate', {
		entries: createCurrencyEntries()
	});
	demo.readonlyUnitBox = new TrivialComponents.TrivialUnitBox('#readonlyUnitBox', {
		entries: createCurrencyEntries(),
		editingMode: 'readonly',
		amount: 123456789,
		selectedEntry: createCurrencyEntries()[0]
	});
	demo.disabledUnitBox = new TrivialComponents.TrivialUnitBox('#disabledUnitBox', {
		entries: createCurrencyEntries(),
		editingMode: 'disabled',
		amount: 123456789,
		selectedEntry: createCurrencyEntries()[0]
	});

	demo.calendarBox = new TrivialComponents.TrivialCalendarBox('#calendarBox', {
		firstDayOfWeek: 1
	});

	demo.dateTimeField = new TrivialComponents.TrivialDateTimeField('#dateTimeField', {});

	let $destroyAllButton = $('#destroyAllButton').click(function() {
		Object.keys(demo).forEach(function(key) {
			demo[key].destroy();
		})
	});
});
