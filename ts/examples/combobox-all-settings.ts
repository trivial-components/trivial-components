let combobox = new TrivialComponents.TrivialComboBox("#originalInput", {
	entries: DemoUtils.createEntries(10),
	selectedEntry: {displayValue: "blah"}
});

combobox.onSelectedEntryChanged.addListener(function () {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(combobox.getSelectedEntry(), null, 2));
});