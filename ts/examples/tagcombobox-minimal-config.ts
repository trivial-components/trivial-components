let entries = DemoUtils.createEntries(10);
let tagComboBox = new TrivialComponents.TrivialTagComboBox("#originalInput", {
	entries: entries,
	selectedEntries: [entries[0], entries[5]]
});

function updateValueDisplay() {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(tagComboBox.getSelectedEntries(), null, 2));
}

tagComboBox.onSelectedEntryChanged.addListener(updateValueDisplay);
updateValueDisplay();
