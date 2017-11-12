const attributeEntries = [
	{attribute: "From"},
	{attribute: "To"},
	{attribute: "CC"},
	{attribute: "BCC"}
];

const personsEntries = [];
for (let i = 0; i < 50; i++) {
	const firstName = DemoUtils.randomFirstName();
	const lastName = DemoUtils.randomLastName();
	personsEntries.push({
		person: {
			firstName: firstName,
			lastName: lastName,
			email: firstName + '.' + lastName + '@' + DemoUtils.randomWords(1) + '.com',
			imageUrl: DemoUtils.randomImageUrl()
		}
	});
}

let entryRenderingFunction = function (entry, isSelectedEntry) {
	if (entry == null) {
		return '<div>';
	} else if (entry.attribute != null && entry.person == null) {
		return `<div class="composite-demo-entry ${isSelectedEntry ? 'tag' : 'list-entry'}">
					<div class="attribute">${entry.attribute}</div>
					<div class="value free-text-value"><span class="tr-editor"></span></div>
				</div>`;
	} else if (entry.attribute != null && entry.person != null) {
		return `<div class="composite-demo-entry ${isSelectedEntry ? 'tag' : 'list-entry'}">
					<div class="attribute">${entry.attribute}</div>
					<div class="value person">
						${entry.person.lastName ? entry.person.firstName + ' ' + entry.person.lastName : entry.person.email}
					</div>
				</div>`;
	} else if (entry.person != null) {
		return `<div class="composite-demo-entry ${isSelectedEntry ? 'tag' : 'list-entry'}">
					<div class="value person">
						<div class="profile-picture" style="background-image: url(${entry.person.imageUrl})"></div>
						${entry.person.lastName ? entry.person.firstName + ' ' + entry.person.lastName : entry.person.email}
					</div>
				</div>`;
	}
};
let tagComboBox = new TrivialComponents.TrivialTagComboBox<any>('#originalInput', {
	queryFunction: function (searchString, resultCallback) {
		searchString = searchString || "";
		let matchingAttributeEntries: { attribute: string }[];
		matchingAttributeEntries = tagComboBox.getCurrentPartialTag() == null ? attributeEntries.filter(function (e) {
			return TrivialComponents.trivialMatch(e.attribute, searchString).length > 0;
		}) : [];
		const matchingPersons = personsEntries.filter(function (e) {
			let textMatches = TrivialComponents.trivialMatch(e.person.firstName, searchString).length > 0
				|| TrivialComponents.trivialMatch(e.person.lastName, searchString).length > 0;
			return matchingAttributeEntries.length == 0 && textMatches;
		});
		resultCallback([...matchingAttributeEntries, ...matchingPersons]);
	},
	entryRenderingFunction: (e) => entryRenderingFunction(e, false),
	selectedEntryRenderingFunction: (e) => entryRenderingFunction(e, true),
	tagCompleteDecider: (entry: any) => {
		return entry.person;
	},
	entryMerger: function (partialEntry, newEntry) {
		return {
			... newEntry,
			... partialEntry
		};
	},
	selectedEntries: [
		{
			... attributeEntries[0],
			... personsEntries[0]
		}
	],
	freeTextEntryFactory: (s) => {
		return {
			person: {
				email: s
			}
		}
	},
	selectionAcceptor: (entry) => entry.attribute != null || entry.person && entry.person.email && entry.person.email.indexOf("@") !== -1,
	valueFunction: (entries) => entries.map(entry => `${entry.attribute || "any"}:${entry.person && entry.person.email}`).join(',')
});



// ---------------------------- demo boilerplate ----------------------------
function updateValueDisplay() {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(tagComboBox.getSelectedEntries(), null, 2));
}

tagComboBox.onSelectedEntryChanged.addListener(updateValueDisplay);
updateValueDisplay();