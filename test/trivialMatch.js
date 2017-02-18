/*!
 *
 *  Copyright 2016 Yann Massard (https://github.com/yamass) and other contributors
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *  
 */

'use strict';
describe('trivialMatch', function() {

    it('must escape all regex special chars', function() {
        var text = 'backslash\\parentheses()brackets[]pipe|slash/';

        expect(TrivialComponents.trivialMatch(text, '\\')[0].start).toBe(9);
        expect(TrivialComponents.trivialMatch(text, '(')[0].start).toBe(21);
        expect(TrivialComponents.trivialMatch(text, '[')[0].start).toBe(31);
        expect(TrivialComponents.trivialMatch(text, '|')[0].start).toBe(37);
        expect(TrivialComponents.trivialMatch(text, '/')[0].start).toBe(43);
    });

    it('finds all matches for "contains" mode', function() {
        var text = 'hello this is hello ...';
        var searchString = 'hello';
        var result = TrivialComponents.trivialMatch(text, searchString, {
            matchingMode: 'contains'
        });

        expect(result.length).toBe(2);
        expect(result[0].start).toBe(0);
        expect(result[0].length).toBe(5);
        expect(result[1].start).toBe(14);
        expect(result[1].length).toBe(5);
    });

    it('finds all matches for "prefix" mode', function() {
        expect(TrivialComponents.trivialMatch('Sebastian Heinrichs', 'seb', {
            matchingMode: 'prefix'
        })).toEqual([{
            start: 0,
            length: 3
        }]);
        expect(TrivialComponents.trivialMatch('Sebastian Heinrichs', 'Hein', {
            matchingMode: 'prefix'
        })).toEqual([]);
    });

    it('finds all matches for "prefix-word" mode', function() {
        expect(TrivialComponents.trivialMatch('Sebastian Heinrichs', 'seb', {
            matchingMode: 'prefix-word'
        })).toEqual([{
            start: 0,
            length: 3
        }]);
        expect(TrivialComponents.trivialMatch('Sebastian Heinrichs', 'Hein', {
            matchingMode: 'prefix-word'
        })).toEqual([{
            start: 10,
            length: 4
        }]);
    });

    it('will, in "prefix-word" mode, find matches to the beginning of the string, even if there is no word boundary (\\b)', function() {
        expect(TrivialComponents.trivialMatch('$123', '$', {
            matchingMode: 'prefix-word'
        })).toEqual([{
            start: 0,
            length: 1
        }]);
        expect(TrivialComponents.trivialMatch('... and so on', '..', {
            matchingMode: 'prefix-word'
        })).toEqual([{
            start: 0,
            length: 2
        }]);
        expect(TrivialComponents.trivialMatch('Non-word character € with space in front...', '€', {
            matchingMode: 'prefix-word'
        })).toEqual([{
            start: 19,
            length: 1
        }]);
    });

    it('matches correctly with "prefix-levenshtein"', function() {
        expect(TrivialComponents.trivialMatch('Stephan Riesenhof', 'Steffan', {
            matchingMode: 'prefix-levenshtein'
        })).toEqual([{
            start: 0,
            length: 7,
            distance: 2
        }]);

        expect(TrivialComponents.trivialMatch('Stephan Riesenhof', 'Stefan', {
            matchingMode: 'prefix-levenshtein'
        })).toEqual([{
            start: 0,
            length: 6,
            distance: 3 // !!
        }]);

        expect(TrivialComponents.trivialMatch('Stephan Riesenhof', 'Steffanie', {
            matchingMode: 'prefix-levenshtein'
        })).toEqual([]); // distance: 4
    });

    it('matches correctly with "levenshtein"', function() {
        expect(TrivialComponents.trivialMatch('continuous', 'continuous', {
            matchingMode: 'levenshtein'
        })).toEqual([{
            start: 0,
            length: 10,
            distance: 0
        }]);

        expect(TrivialComponents.trivialMatch('continuous', 'continus', {
            matchingMode: 'levenshtein'
        })).toEqual([{
            start: 0,
            length: 8,
            distance: 2
        }]);

        expect(TrivialComponents.trivialMatch('continuous', 'contiinus', {
            matchingMode: 'levenshtein'
        })).toEqual([{
            start: 0,
            length: 9,
            distance: 3
        }]);

        expect(TrivialComponents.trivialMatch('continuous', 'Kontiinus', {
            matchingMode: 'levenshtein'
        })).toEqual([]); // distance is 4
    });

    it('honours ignoreCase option', function() {
        expect(TrivialComponents.trivialMatch('aabbcc', 'BB', {
            matchingMode: 'contains',
            ignoreCase: true
        })).toEqual([{
            start: 2,
            length: 2
        }]);
        expect(TrivialComponents.trivialMatch('aabbcc', 'BB', {
            matchingMode: 'contains',
            ignoreCase: false
        })).toEqual([]);

        expect(TrivialComponents.trivialMatch('aabbcc', 'AA', {
            matchingMode: 'prefix',
            ignoreCase: true
        })).toEqual([{
            start: 0,
            length: 2
        }]);
        expect(TrivialComponents.trivialMatch('aabbcc', 'AA', {
            matchingMode: 'prefix',
            ignoreCase: false
        })).toEqual([]);

        expect(TrivialComponents.trivialMatch('aa bb cc', 'BB', {
            matchingMode: 'prefix-word',
            ignoreCase: true
        })).toEqual([{
            start: 3,
            length: 2
        }]);
        expect(TrivialComponents.trivialMatch('aa bb cc', 'BB', {
            matchingMode: 'prefix-word',
            ignoreCase: false
        })).toEqual([]);

        expect(TrivialComponents.trivialMatch('aaaabbcc', 'AAAA', {
            matchingMode: 'prefix-levenshtein',
            ignoreCase: true
        })).toEqual([{
            start: 0,
            length: 4,
            distance: 0
        }]);
        expect(TrivialComponents.trivialMatch('aaaabbcc', 'AAAA', {
            matchingMode: 'prefix-levenshtein',
            ignoreCase: false
        })).toEqual([]);

        expect(TrivialComponents.trivialMatch('aaaabbcc', 'AAAABBCC', {
            matchingMode: 'levenshtein',
            ignoreCase: true
        })).toEqual([{
            start: 0,
            length: 8,
            distance: 0
        }]);
        expect(TrivialComponents.trivialMatch('aaaabbcc', 'AAAABBCC', {
            matchingMode: 'levenshtein',
            ignoreCase: false
        })).toEqual([]);
    });


});

