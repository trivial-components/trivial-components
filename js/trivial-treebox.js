(function (factory) {
            "use strict";

            if (typeof define === 'function' && define.amd) {
                // Define as an AMD module if possible
                define('trivial-treebox', ['trivial-core', 'jquery', 'mustache'], factory);
            } else if (typeof exports === 'object') {
                // Node/CommonJS
                module.exports = factory(require('trivial-core'), require('jquery'), require('mustache'));
            } else if (jQuery && !jQuery.fn.TrivialTreeBox) {
                // Define using browser globals otherwise
                // Prevent multiple instantiations if the script is loaded twice
                window.TrivialTreeBox = factory(TrivialComponents, jQuery, Mustache);
            }
        }(function (TrivialComponents, $, Mustache) {

            var keyCodes = TrivialComponents.keyCodes;

            function TrivialTreeBox($container, options) {


                options = options || {};
                var defaultOptions = {
                    valueProperty: options.idProperty || 'id',
                    idProperty: 'id',
                    childrenProperty: "children",
                    lazyChildrenFlagProperty: "hasLazyChildren",
                    expandedProperty: 'expanded',
                    templates: [TrivialComponents.iconSingleLineTemplate],
                    spinnerTemplate: TrivialComponents.defaultSpinnerTemplate,
                    noEntriesTemplate: TrivialComponents.defaultNoEntriesTemplate,
                    entries: null,
                    selectedEntryId: undefined,
                    matchingOptions: {
                        matchingMode: 'contains',
                        ignoreCase: true,
                        maxLevenshteinDistance: 2
                    }
                };
                var config = $.extend(defaultOptions, options);

                var entries = config.entries;
                var selectedEntryId;
                var highlightedEntry = null;
                var blurCausedByClickInsideComponent = false;

                var $componentWrapper = $('<div class="tr-tree"/>').appendTo($container);
                var $tree = $('<div class="tr-tree-entryTree"></div>').appendTo($componentWrapper);

                $tree.mouseout(function() {
                    setHighlightedEntry(null);
                });

                if (entries) { // if config.entries was set...
                    updateTreeEntryElements(entries);
                }

                selectEntry(config.selectedEntryId ? findEntryById(config.selectedEntryId) : null);

                function updateTreeEntryElements(entries) {
                    $tree.empty();

                    function createEntryElement(entry, $parentElement, depth) {
                        var isLeaf = entry[config.childrenProperty] == null && !entry[config.lazyChildrenFlagProperty];
                        var $outerEntryWrapper = $('<div class="tr-tree-entry-outer-wrapper isLeaf-'+ isLeaf +'"></div>')
                                .appendTo($parentElement);
                        var $entryAndExpanderWrapper = $('<div class="tr-tree-entry-and-expander-wrapper"></div>')
                                .appendTo($outerEntryWrapper);
                        for (var k = 0; k<depth; k++) {
                            $entryAndExpanderWrapper.append('<div class="tr-indent-spacer"/>');
                        }
                        var $expander = $('<div class="tr-tree-expander"></div>')
                                .appendTo($entryAndExpanderWrapper);
                        var html = Mustache.render(config.templates[Math.min(config.templates.length - 1, depth)], entry);
                        var $entry = $(html).addClass("tr-tree-entry filterable-item")
                                .appendTo($entryAndExpanderWrapper);
                        entry._trEntryElement = $outerEntryWrapper;
                        $entry
                                .mousedown(function (e) {
                                    $componentWrapper.trigger("mousedown", e);
                                    selectEntry(entry);
                                }).mouseup(function (e) {
                                    $componentWrapper.trigger("mouseup", e);
                                }).mouseout(function (e) {
                                    $componentWrapper.trigger("mouseout", e);
                                }).mouseover(function () {
                                    setHighlightedEntry(entry);
                                });

                        if (entry[config.childrenProperty] && entry[config.childrenProperty].length > 0) {
                            var $childrenWrapper = $('<div class="tr-tree-entry-children-wrapper"></div>')
                                    .appendTo($outerEntryWrapper);
                            setNodeExpanded(entry, entry[config.expandedProperty]);
                            $expander.click(function () {
                                setNodeExpanded(entry, !entry[config.expandedProperty]);
                            });
                            for (var i = 0; i<entry[config.childrenProperty].length; i++) {
                                createEntryElement(entry[config.childrenProperty][i], $childrenWrapper, depth + 1);
                            }
                        }
                    }

                    if (entries.length > 0) {
                        for (var i = 0; i < entries.length; i++) {
                            createEntryElement(entries[i], $tree, 0);
                        }
                    } else {
                        $tree.append(config.noEntriesTemplate);
                    }
                }

                function setNodeExpanded(node, expanded) {
                    node[config.expandedProperty] = !!expanded;
                    node._trEntryElement.toggleClass("expanded", !!expanded);

                    //if (!node.children)
                }

                function updateEntries(newEntries, highlightDirection) {
                    highlightedEntry = null;
                    entries = newEntries;
                    updateTreeEntryElements(entries);

                    if (entries.length > 0) {
                        highlightTextMatches(entries);

                        if (typeof highlightDirection != 'undefined') {
                            selectNextEntry(highlightDirection);
                        }
                    } else {
                        setHighlightedEntry(null);
                    }

                    var selectedEntry = findEntryById(selectedEntryId);
                    if (selectedEntry) {
                        // selected entry in filtered tree? then mark it as selected!
                        markSelectedEntry(selectedEntry);
                    }
                }

                function setHighlightedEntry(entry) {
                    highlightedEntry = entry;
                    $tree.find('.tr-highlighted-entry').removeClass('tr-highlighted-entry');
                    if (entry != null) {
                        var $entry = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                        $entry.addClass('tr-highlighted-entry');
                        $tree.minimallyScrollTo($entry);
                    }
                }

                function findEntries(filterFunction) {
                    function findEntriesInSubTree(node, listOfFoundEntries) {
                        if (filterFunction.call(this, node)) {
                            listOfFoundEntries.push(node);
                        }
                        if (node[config.childrenProperty]) {
                            for (var i = 0; i < node[config.childrenProperty].length; i++) {
                                var child = node[config.childrenProperty][i];
                                findEntriesInSubTree(child, listOfFoundEntries);
                            }
                        }
                    }

                    var matchingEntries = [];
                    for (var i = 0; i < entries.length; i++) {
                        var rootEntry = entries[i];
                        findEntriesInSubTree(rootEntry, matchingEntries);
                    }
                    return matchingEntries;
                }

                function findEntryById(id) {
                    return findEntries(function (entry) {
                        return entry[config.idProperty] == id
                    })[0];
                }

                function selectEntry(entry) {
                    selectedEntryId = entry ?  entry[config.idProperty] : null;
                    markSelectedEntry(entry);
                    fireChangeEvents();
                }

                function markSelectedEntry(entry) {
                    $tree.find(".tr-selected-entry").removeClass("tr-selected-entry");
                    if (entry) {
                        var $entryWrapper = entry._trEntryElement.find('>.tr-tree-entry-and-expander-wrapper');
                        $entryWrapper.addClass("tr-selected-entry");
                        $tree.minimallyScrollTo($entryWrapper);
                    }
                }

                function fireChangeEvents() {
                    $componentWrapper.trigger("change");
                }

                function selectNextEntry(direction) {
                    var nextVisibleEntry = getNextVisibleEntry(direction);
                    if (nextVisibleEntry != null) {
                        selectEntry(nextVisibleEntry);
                    }
                }

                function getNextVisibleEntry(direction) {
                    var newSelectedElementIndex;
                    var selectedEntry = getSelectedEntry();
                    var visibleEntriesAsList = findEntries(function(entry) {return entry._trEntryElement.is(':visible') || entry === selectedEntry});
                    if (visibleEntriesAsList == null || visibleEntriesAsList.length == 0) {
                        return null;
                    } else if (selectedEntry == null && direction > 0) {
                        newSelectedElementIndex = -1 + direction;
                    } else if (selectedEntry == null && direction < 0) {
                        newSelectedElementIndex = visibleEntriesAsList.length + direction;
                    } else {
                        var currentSelectedElementIndex = visibleEntriesAsList.indexOf(selectedEntry);
                        newSelectedElementIndex = (currentSelectedElementIndex + visibleEntriesAsList.length + direction) % visibleEntriesAsList.length;
                    }
                    return visibleEntriesAsList[newSelectedElementIndex];
                }

                function highlightTextMatches(entries, searchString) {
                    for (var i = 0; i < entries.length; i++) {
                        var entry = entries[i];
                        var $entryElement = entry._trEntryElement.find('.tr-tree-entry');
                        $entryElement.trivialHighlight(searchString);
                        if (entry[config.childrenProperty]) {
                            highlightTextMatches(entry[config.childrenProperty]);
                        }
                    }
                }

                function getSelectedEntry() {
                    return selectedEntryId ? findEntryById(selectedEntryId) : null;
                }

                this.$ = $componentWrapper;
                $componentWrapper[0].trivialTreeBox = this;

                this.updateEntries = updateEntries;
                this.getSelectedEntry = getSelectedEntry;


            }

            $.fn.trivialtreebox = function (options) {
                var $trees = [];
                this.each(function () {
                    var existingTreeWrapper = $(this).parents('.tr-tree').addBack('.tr-tree');
                    if (existingTreeWrapper.length > 0 && existingTreeWrapper[0].trivialTreeBox) {
                        $trees.push(existingTreeWrapper[0].trivialTreeBox.$);
                    } else {
                        var tree = new TrivialTreeBox(this, options);
                        $trees.push(tree.$);
                    }
                });
                return $($trees);
            };
            $.fn.TrivialTreeBox = function (options) {
                var trees = [];
                this.each(function () {
                    var existingTreeWrapper = $(this).parents('.tr-tree').addBack('.tr-tree');
                    if (existingTreeWrapper.length > 0 && existingTreeWrapper[0].trivialTreeBox) {
                        trees.push(existingTreeWrapper[0].trivialTreeBox);
                    } else {
                        var tree = new TrivialTreeBox(this, options);
                        trees.push(tree);
                    }
                });
                return trees.length == 1 ? trees[0] : trees;
            };

            return $.fn.TrivialTreeBox;
        })
);
