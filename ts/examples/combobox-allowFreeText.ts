let commits = [];
$.ajax('http://api.github.com/repos/trivial-components/trivial-components/commits').then((data) => {
	commits = data;
});

let combobox = new TrivialComponents.TrivialComboBox("#originalInput", {
	queryFunction: function (queryString, resultCallback) {
		setTimeout(() => { // make it look like a lot of work...
			resultCallback(commits.filter(c => c.commit.message.toLowerCase().indexOf(queryString.toLowerCase()) !== -1 || c.commit.author.name.toLowerCase().indexOf(queryString.toLowerCase()) !== -1));
		}, 1000);
	},
	entryRenderingFunction: entry => {
		if (entry == null) {
			return `<div class="demo-3-line-template">
		      <div class="img-wrapper empty"></div>
		      <div class="content-wrapper tr-editor-area"> 
		        <div class="additional-info">Please select...</div>
		      </div>
		    </div>`;
		} else {
			return `<div class="demo-3-line-template">
		      <div class="img-wrapper" style="background-image: url(${entry.author ? entry.author.avatar_url : 'img/icons/pin2.png'})"></div>
		      <div class="content-wrapper tr-editor-area"> 
		        <div class="main-line">${entry.commit.author.name}</div> 
		        <div class="additional-info">${entry.commit.author.date}</div>
		        <div class="additional-info">${entry.commit.message}</div>
		      </div>
		    </div>`;
		}
	}
});



// ---------------------------- demo boilerplate ----------------------------
function updateValueDisplay() {
	$('#originalInputValue').text($('#originalInput').val());
	$('#selectedEntryDisplay').text(JSON.stringify(combobox.getSelectedEntry(), null, 2));
}

combobox.onSelectedEntryChanged.addListener(updateValueDisplay);
updateValueDisplay();
