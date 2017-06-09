var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
$(function () {
    var demo = window.demo = {};
    demo.defaultFilteringCombobox = new TrivialComponents.TrivialComboBox("#defaultFilteringComboBox", {
        entries: createEntries(),
        showClearButton: true
    });
    demo.defaultFilteringCombobox.onSelectedEntryChanged.addListener(function (entry) {
        console.log("defaultFilteringCombobox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"));
    });
    demo.defaultFilteringCombobox.onFocus.addListener(function () {
        console.log("defaultFilteringCombobox focus");
    });
    demo.defaultFilteringCombobox.onBlur.addListener(function () {
        console.log("defaultFilteringCombobox blur");
    });
    demo.freeTextComboBox = new TrivialComponents.TrivialComboBox('#freeTextComboBox', {
        entries: createEntries(),
        allowFreeText: true
    });
    demo.freeTextComboBox.onSelectedEntryChanged.addListener(function (entry) {
        console.log("freeTextComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"));
    });
    demo.noAutoCompleteComboBox = new TrivialComponents.TrivialComboBox('#noAutoCompleteComboBox', {
        entries: createEntries(),
        autoComplete: false
    });
    demo.iconSingleLineComboBox = new TrivialComponents.TrivialComboBox('#iconSingleLineComboBox', {
        entries: createEntries(),
    });
    demo.customFilteringComboBox = new TrivialComponents.TrivialComboBox('#customFilteringComboBox', {
        entries: createEntries(),
        queryFunction: function (queryString, resultCallback) {
            setTimeout(function () {
                resultCallback(createEntries().filter(function (entry) {
                    return entry.displayValue.toLowerCase().indexOf(queryString.toLowerCase()) != -1 || entry.additionalInfo.toLowerCase().indexOf(queryString.toLowerCase()) != -1;
                }));
            }, 500);
        }
    });
    demo.valueFunctionComboBox = new TrivialComponents.TrivialComboBox('#valueFunctionComboBox', {
        entries: createEntries(),
        valueFunction: function (entry) {
            return entry ? entry.additionalInfo : null;
        }
    });
    demo.noTriggerComboBox = new TrivialComponents.TrivialComboBox('#noTriggerComboBox', {
        entries: createEntries(),
        showTrigger: false
    });
    var showDropDownOnResultsOnlyComboBoxEntries = createEntries();
    demo.showDropDownOnResultsOnlyComboBox = new TrivialComponents.TrivialComboBox('#showDropDownOnResultsOnlyComboBox', {
        entries: showDropDownOnResultsOnlyComboBoxEntries,
        queryFunction: function (queryString, resultCallback) {
            setTimeout(function () {
                resultCallback(showDropDownOnResultsOnlyComboBoxEntries.filter(function (entry) {
                    return entry.displayValue.toLowerCase().indexOf(queryString.toLowerCase()) != -1 || entry.additionalInfo.toLowerCase().indexOf(queryString.toLowerCase()) != -1;
                }));
            }, 500);
        },
        showDropDownOnResultsOnly: true
    });
    demo.disabledComboBox = new TrivialComponents.TrivialComboBox('#disabledComboBox', {
        selectedEntry: createEntries(1)[0],
        editingMode: 'disabled'
    });
    demo.readonlyComboBox = new TrivialComponents.TrivialComboBox('#readonlyComboBox', {
        selectedEntry: createEntries(1)[0],
        editingMode: 'readonly'
    });
    var listBoxEntries = createEntries(10);
    listBoxEntries[1].template = "<div>custom template for entry {{id}}</div>";
    demo.listBox = new TrivialComponents.TrivialListBox('#listBox', {
        entries: listBoxEntries
    });
    demo.zeroConfigTagBox = new TrivialComponents.TrivialTagComboBox('#zeroConfigTagBox', {
        entries: createEntries()
    });
    demo.zeroConfigTagBox.onSelectedEntryChanged.addListener(function (entries) {
        console.log("zeroConfigTagBox onSelectedEntryChanged " + entries.map(function (e) { return e.displayValue; }).join(", "));
    });
    demo.zeroConfigTagBox.onFocus.addListener(function () {
        console.log("zeroConfigTagBox focus");
    });
    demo.zeroConfigTagBox.onBlur.addListener(function () {
        console.log("zeroConfigTagBox blur");
    });
    $(demo.zeroConfigTagBox.getMainDomElement()).change(function () {
        console.log("#zeroConfigTagBox change");
    });
    demo.customTemplateTagBox = new TrivialComponents.TrivialTagComboBox('#customTemplateTagBox1', {
        entries: createEntries(),
        selectedEntries: createEntries(2),
        showTrigger: false
    });
    demo.customTemplateTagBox2 = new TrivialComponents.TrivialTagComboBox('#customTemplateTagBox2', {
        entries: createEntries(),
        showTrigger: false,
        distinct: false
    });
    var partialEntries = [
        { attribute: "From" },
        { attribute: "To" },
        { attribute: "CC" },
        { attribute: "Message Text" },
        { attribute: "Attachments" }
    ];
    var persons = [];
    for (var i = 0; i < 50; i++) {
        var firstName = randomOf(firstNames);
        var lastName = randomOf(lastNames);
        persons.push({
            firstName: firstName,
            lastName: lastName,
            email: firstName + '.' + lastName + '@' + randomOf(words) + '.com',
            imageUrl: randomImageUrl()
        });
    }
    var entryRenderingFunction = function (entry) {
        if (entry == null) {
            return '<div>';
        }
        else if (entry.attribute != null && entry.lastName == null) {
            return "<div class=\"search-tag\"><div class=\"attribute\">" + entry.attribute + "</div><div class=\"value free-text-value\"><span class=\"tr-editor\"></span></div></div>";
        }
        else if (entry.attribute != null && entry != null && entry.isFreeTextValue) {
            return "<div class=\"search-tag\"><div class=\"attribute\">" + (entry.attribute || '*') + "</div><div class=\"value free-text-value\">" + entry.value + "</div></div>";
        }
        else if (entry.attribute != null && entry.lastName != null) {
            return "<div class=\"search-tag\"><div class=\"attribute\">" + entry.attribute + "</div><div class=\"value person\"><div class=\"profile-picture\" style=\"background-image: url(" + entry.imageUrl + ")\"></div> " + entry.firstName + " " + entry.lastName + "</div></div>";
        }
        else if (entry.lastName != null) {
            return "<div class=\"search-tag\"><div class=\"value person\"><div class=\"profile-picture\" style=\"background-image: url(" + entry.imageUrl + ")\"></div> " + entry.firstName + " " + entry.lastName + "</div></div>";
        }
    };
    demo.compositeTagBox = new TrivialComponents.TrivialTagComboBox('#compositeTagBox', {
        queryFunction: function (searchString, resultCallback) {
            if (!searchString) {
                resultCallback(partialEntries);
            }
            else {
                var matchingPartials = partialEntries.filter(function (e) {
                    return TrivialComponents.trivialMatch(e.attribute, searchString).length > 0;
                });
                var matchingPersons = persons.filter(function (e) {
                    return TrivialComponents.trivialMatch(e.firstName, searchString).length > 0
                        || TrivialComponents.trivialMatch(e.lastName, searchString).length > 0
                        || TrivialComponents.trivialMatch(e.email, searchString).length > 0;
                });
                resultCallback(matchingPartials.concat(matchingPersons));
            }
        },
        entryRenderingFunction: entryRenderingFunction,
        selectedEntryRenderingFunction: entryRenderingFunction,
        tagCompleteDecider: function (entry) {
            return entry.lastName != null;
        },
        entryMerger: function (partialEntry, newEntry) {
            return __assign({}, newEntry, partialEntry);
        }
    });
    demo.maxSelectedEntriesTagBox = new TrivialComponents.TrivialTagComboBox('#maxSelectedEntriesTagBox', {
        entries: createEntries(),
        maxSelectedEntries: 2,
        allowFreeText: true
    });
    demo.noDropdownTagBox = new TrivialComponents.TrivialTagComboBox('#noDropdownTagBox', {
        allowFreeText: true,
        showTrigger: false
    });
    var showDropDownOnResultsOnlyTagBoxEntries = createEntries();
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
                callback(createDemoTreeNodes());
            }, 1000);
        }
    });
    demo.singleSelectionTreeBoxContainer = new TrivialComponents.TrivialTreeBox('#singleSelectionTreeBoxContainer', {
        entries: createDemoTreeNodes(),
        selectedEntryId: 2,
        lazyChildrenQueryFunction: function (node, callback) {
            setTimeout(function () {
                callback(createDemoTreeNodes());
            }, 1000);
        },
        showExpanders: false,
        openOnSelection: true,
        enforceSingleExpandedPath: true
    });
    var $treeComboBox = $('#treeComboBox');
    demo.treeComboBox = new TrivialComponents.TrivialTreeComboBox($treeComboBox, {
        entries: createDemoTreeNodes(),
        selectedEntry: createDemoTreeNodes()[0],
        lazyChildrenQueryFunction: function (node, callback) {
            setTimeout(function () {
                callback(createDemoTreeNodes());
            }, 1000);
        },
        animationDuration: 200,
        showClearButton: true
    });
    demo.treeComboBox.onSelectedEntryChanged.addListener(function (entry) {
        console.log("treeComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"));
    });
    demo.treeComboBox.onFocus.addListener(function () {
        console.log("treeComboBox focus");
    });
    demo.treeComboBox.onBlur.addListener(function () {
        console.log("treeComboBox blur");
    });
    demo.freeTextTreeComboBox = new TrivialComponents.TrivialTreeComboBox('#freeTextTreeComboBox', {
        entries: createDemoTreeNodes(),
        selectedEntry: createDemoTreeNodes()[0],
        lazyChildrenQueryFunction: function (node, callback) {
            setTimeout(function () {
                callback(createDemoTreeNodes());
            }, 1000);
        },
        allowFreeText: true,
        animationDuration: 0
    });
    demo.freeTextTreeComboBox.onSelectedEntryChanged.addListener(function (entry) {
        console.log("freeTextTreeComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"));
    });
    demo.disabledTreeComboBox = new TrivialComponents.TrivialTreeComboBox('#disabledTreeComboBox', {
        entries: createDemoTreeNodes(),
        selectedEntry: createDemoTreeNodes()[1],
        editingMode: 'disabled'
    });
    demo.readonlyTreeComboBox = new TrivialComponents.TrivialTreeComboBox('#readonlyTreeComboBox', {
        entries: createDemoTreeNodes(),
        selectedEntry: createDemoTreeNodes()[2],
        editingMode: 'readonly'
    });
    demo.lazyChildLoadingTreeComboBox = new TrivialComponents.TrivialTreeComboBox('#lazyChildLoadingTreeComboBox', {
        entries: createDemoTreeNodes(),
        lazyChildrenQueryFunction: function (node, callback) {
            setTimeout(function () {
                callback(createDemoTreeNodes());
            }, 1000);
        },
        animationDuration: 200
    });
    demo.lazyChildLoadingTreeComboBox.onSelectedEntryChanged.addListener(function (entry) {
        console.log("lazyChildLoadingTreeComboBox onSelectedEntryChanged " + (entry ? entry.displayValue : "null"));
    });
    demo.zeroConfigTree = new TrivialComponents.TrivialTree('#zeroConfigTree', {
        entries: createDemoTreeNodes(),
        lazyChildrenQueryFunction: function (node, callback) {
            setTimeout(function () {
                callback(createDemoTreeNodes());
            }, 1000);
        },
        searchBarMode: 'always-visible'
    });
    demo.zeroConfigTree.onSelectedEntryChanged.addListener(function (node) {
        console.log("onSelectedEntryChanged " + (node ? node.id : "null"));
    });
    demo.zeroConfigTree.onNodeExpansionStateChanged.addListener(function (node) {
        console.log("onNodeExpansionStateChanged " + node.id);
    });
    demo.onDemandSearchFieldTree = new TrivialComponents.TrivialTree('#onDemandSearchFieldTree', {
        entries: createDemoTreeNodes(),
        directSelectionViaArrowKeys: true,
        selectedEntryId: 2,
        lazyChildrenQueryFunction: function (node, callback) {
            setTimeout(function () {
                callback(createDemoTreeNodes());
            }, 1000);
        },
        searchBarMode: "show-if-filled"
    });
    demo.noSearchFieldTree = new TrivialComponents.TrivialTree('#noSearchFieldTree', {
        entries: createDemoTreeNodes(),
        selectedEntryId: 2,
        lazyChildrenQueryFunction: function (node, callback) {
            setTimeout(function () {
                callback(createDemoTreeNodes());
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
    demo.unitBox.onChange.addListener(function (data) {
        console.log("trivialUnitBox.amount: " + data.amount);
        console.log("trivialUnitBox.unit: " + data.unit);
    });
    demo.unitBox.onFocus.addListener(function (data) {
        console.log("unitbox focus");
    });
    demo.unitBox.onBlur.addListener(function (data) {
        console.log("unitbox blur");
    });
    demo.unitBox.getEditor().addEventListener("unit box editor keyup", function (e) { console.log("keyup: " + demo.unitBox.getAmount() + " " + demo.unitBox.getSelectedEntry().code); });
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
        selectedDate: moment(),
        firstDayOfWeek: 1
    });
    demo.dateTimeField = new TrivialComponents.TrivialDateTimeField('#dateTimeField', {});
    var $destroyAllButton = $('#destroyAllButton').click(function () {
        Object.keys(demo).forEach(function (key) {
            demo[key].destroy();
        });
    });
});

//# sourceMappingURL=demo.js.map
