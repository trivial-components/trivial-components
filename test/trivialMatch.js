'use strict';
describe('trivialMatch', function() {

    it('must escape all regex special chars', function() {
        var text = 'backslash\\parentheses()brackets[]pipe|slash/';

        expect($.trivialMatch(text, '\\')[0].start).toBe(9);
        expect($.trivialMatch(text, '(')[0].start).toBe(21);
        expect($.trivialMatch(text, '[')[0].start).toBe(31);
        expect($.trivialMatch(text, '|')[0].start).toBe(37);
        expect($.trivialMatch(text, '/')[0].start).toBe(43);
    });

    it('finds all matches for "contains" mode', function() {
        var text = 'hello this is hello ...';
        var searchString = 'hello';
        var result = $.trivialMatch(text, searchString, {
            matchingMode: 'contains'
        });

        expect(result.length).toBe(2);
        expect(result[0].start).toBe(0);
        expect(result[0].length).toBe(5);
        expect(result[1].start).toBe(14);
        expect(result[1].length).toBe(5);
    });

    it('finds all matches for "prefix" mode', function() {
        expect($.trivialMatch('Sebastian Heinrichs', 'seb', {
            matchingMode: 'prefix'
        })).toEqual([{
            start: 0,
            length: 3
        }]);
        expect($.trivialMatch('Sebastian Heinrichs', 'Hein', {
            matchingMode: 'prefix'
        })).toEqual([]);
    });

    it('finds all matches for "prefix-word" mode', function() {
        expect($.trivialMatch('Sebastian Heinrichs', 'seb', {
            matchingMode: 'prefix-word'
        })).toEqual([{
            start: 0,
            length: 3
        }]);
        expect($.trivialMatch('Sebastian Heinrichs', 'Hein', {
            matchingMode: 'prefix-word'
        })).toEqual([{
            start: 10,
            length: 4
        }]);
    });

    it('matches correctly with "prefix-levenshtein"', function() {
        expect($.trivialMatch('Stephan Riesenhof', 'Steffan', {
            matchingMode: 'prefix-levenshtein'
        })).toEqual([{
            start: 0,
            length: 7,
            distance: 2
        }]);

        expect($.trivialMatch('Stephan Riesenhof', 'Stefan', {
            matchingMode: 'prefix-levenshtein'
        })).toEqual([{
            start: 0,
            length: 6,
            distance: 3 // !!
        }]);

        expect($.trivialMatch('Stephan Riesenhof', 'Steffanie', {
            matchingMode: 'prefix-levenshtein'
        })).toEqual([]); // distance: 4
    });

    it('matches correctly with "levenshtein"', function() {
        expect($.trivialMatch('continuous', 'continuous', {
            matchingMode: 'levenshtein'
        })).toEqual([{
            start: 0,
            length: 10,
            distance: 0
        }]);

        expect($.trivialMatch('continuous', 'continus', {
            matchingMode: 'levenshtein'
        })).toEqual([{
            start: 0,
            length: 8,
            distance: 2
        }]);

        expect($.trivialMatch('continuous', 'contiinus', {
            matchingMode: 'levenshtein'
        })).toEqual([{
            start: 0,
            length: 9,
            distance: 3
        }]);

        expect($.trivialMatch('continuous', 'Kontiinus', {
            matchingMode: 'levenshtein'
        })).toEqual([]); // distance is 4
    });

    it('honours ignoreCase option', function() {
        expect($.trivialMatch('aabbcc', 'BB', {
            matchingMode: 'contains',
            ignoreCase: true
        })).toEqual([{
            start: 2,
            length: 2
        }]);
        expect($.trivialMatch('aabbcc', 'BB', {
            matchingMode: 'contains',
            ignoreCase: false
        })).toEqual([]);

        expect($.trivialMatch('aabbcc', 'AA', {
            matchingMode: 'prefix',
            ignoreCase: true
        })).toEqual([{
            start: 0,
            length: 2
        }]);
        expect($.trivialMatch('aabbcc', 'AA', {
            matchingMode: 'prefix',
            ignoreCase: false
        })).toEqual([]);

        expect($.trivialMatch('aa bb cc', 'BB', {
            matchingMode: 'prefix-word',
            ignoreCase: true
        })).toEqual([{
            start: 3,
            length: 2
        }]);
        expect($.trivialMatch('aa bb cc', 'BB', {
            matchingMode: 'prefix-word',
            ignoreCase: false
        })).toEqual([]);

        expect($.trivialMatch('aaaabbcc', 'AAAA', {
            matchingMode: 'prefix-levenshtein',
            ignoreCase: true
        })).toEqual([{
            start: 0,
            length: 4,
            distance: 0
        }]);
        expect($.trivialMatch('aaaabbcc', 'AAAA', {
            matchingMode: 'prefix-levenshtein',
            ignoreCase: false
        })).toEqual([]);

        expect($.trivialMatch('aaaabbcc', 'AAAABBCC', {
            matchingMode: 'levenshtein',
            ignoreCase: true
        })).toEqual([{
            start: 0,
            length: 8,
            distance: 0
        }]);
        expect($.trivialMatch('aaaabbcc', 'AAAABBCC', {
            matchingMode: 'levenshtein',
            ignoreCase: false
        })).toEqual([]);
    });


});

