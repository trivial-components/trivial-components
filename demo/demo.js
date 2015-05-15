var firstNames = ['Mary', 'Patricia', 'Linda', 'Barbara', 'Elizabeth', 'Jennifer', 'Maria', 'Susan', 'Margaret', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Deborah', 'Jessica', 'Shirley', 'Cynthia', 'Angela', 'Melissa', 'Brenda', 'Amy', 'Anna', 'Rebecca', 'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Charles', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Paul', 'Mark', 'Donald', 'George', 'Kenneth', 'Steven', 'Edward', 'Brian', 'Ronald', 'Anthony', 'Kevin', 'Jason', 'Matthew', 'Gary', 'Timothy', 'Jose', 'Larry', 'Jeffrey', 'Frank', 'Scott', 'Eric', 'Stephen', 'Andrew', 'Raymond', 'Gregory'];
var lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris'];
var words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consetetur', 'sadipscing', 'elitr', 'sed', 'diam', 'nonumy', 'eirmod', 'tempor', 'invidunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliquyam', 'erat', 'sed', 'diam', 'voluptua', 'at', 'vero', 'eos', 'et', 'accusam', 'et', 'justo', 'duo', 'dolores', 'et', 'ea', 'rebum', 'stet', 'clita', 'kasd', 'gubergren', 'no', 'sea', 'takimata', 'sanctus', 'est', 'lorem', 'ipsum', 'dolor', 'sit', 'amet' ];

function randomInt(max) {
    return Math.floor(Math.random() * max);
}
function randomWords(count) {
    var sentence = "";
    for (var i = 0; i< count; i++) {
        sentence += words[randomInt(words.length)];
        if (i < count -1) {
            sentence += " ";
        }
    }
    return sentence;
}
function randomImageUrl() {
    return "https://avatars1.githubusercontent.com/u/" + (10000 + randomInt(1000)) + "?v=3&s=25";
}

function createEntries(count) {
    count = count || 100;

    var entries = [];
    for (var i = 0; i < count; i++) {
        entries.push({
            id: i,
            displayValue: firstNames[randomInt(firstNames.length)] + ' ' + lastNames[randomInt(lastNames.length)],
            additionalInfo: randomWords(5),
            imageUrl: randomImageUrl()
        });
    }
    return entries;
}
