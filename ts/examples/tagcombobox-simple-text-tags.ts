let tagComboBox = new TrivialComponents.TrivialTagComboBox("#originalInput", {
	entries: [],
	selectedEntries: [{
		"displayValue": "some-tag",
		"_isFreeTextEntry": true
	}],
	allowFreeText: true,
	entryRenderingFunction: entry => `<div>${entry.displayValue}</div>`,
	showTrigger: false,
	showDropDownOnResultsOnly: true,
	queryFunction: () => {
		return; // never call the resultCallback
	}
});



// ---------------------------- demo boilerplate ----------------------------
function updateValueDisplay() {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(tagComboBox.getSelectedEntries(), null, 2));
}

tagComboBox.onSelectedEntryChanged.addListener(updateValueDisplay);
updateValueDisplay();
