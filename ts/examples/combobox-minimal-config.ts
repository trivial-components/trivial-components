let combobox = new TrivialComponents.TrivialComboBox("#originalInput", {
	entries: DemoUtils.createEntries(10),
	selectedEntry: DemoUtils.createEntries(1)[0]
});

combobox.onSelectedEntryChanged.addListener(function () {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(combobox.getSelectedEntry(), null, 2));
});