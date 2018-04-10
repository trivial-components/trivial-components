import {TrivialComboBox} from "trivial-components";
import {createEntries} from "../DemoUtils";

let combobox = new TrivialComboBox("#originalInput", {
	entries: createEntries(10),
	selectedEntry: createEntries(1)[0]
});



// ---------------------------- demo boilerplate ----------------------------
function updateValueDisplay() {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(combobox.getSelectedEntry(), null, 2));
}

combobox.onSelectedEntryChanged.addListener(updateValueDisplay);
updateValueDisplay();
