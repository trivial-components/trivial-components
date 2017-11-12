let entries = DemoUtils.createEntries(10);

let combobox = new TrivialComponents.TrivialComboBox("#originalInput", {
	entries: entries,
	selectedEntry: DemoUtils.createEntries(1)[0],
	queryFunction: (queryString, resultCallback) => {
		setTimeout(() => { // make the results arrive asynchronous (just for demonstration purposes...)
			resultCallback(entries.filter(e => e.displayValue.indexOf(queryString) !== -1));
		});
		// No return statement here. Always use the resultCallback!
	}
});



// ---------------------------- demo boilerplate ----------------------------
function updateValueDisplay() {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(combobox.getSelectedEntry(), null, 2));
}

combobox.onSelectedEntryChanged.addListener(updateValueDisplay);
updateValueDisplay();
