let combobox = new TrivialComponents.TrivialComboBox("#originalInput", {
	entries: DemoUtils.createEntries(10),
	selectedEntry: DemoUtils.createEntries(1)[0]
});



// ---------------------------- demo boilerplate ----------------------------
function updateValueDisplay() {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(combobox.getSelectedEntry(), null, 2));
}

combobox.onSelectedEntryChanged.addListener(updateValueDisplay);
updateValueDisplay();
