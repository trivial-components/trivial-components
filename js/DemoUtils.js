var DemoUtils;
(function (DemoUtils) {
    DemoUtils.firstNames = ['Mary', 'Patricia', 'Linda', 'Barbara', 'Elizabeth', 'Jennifer', 'Maria', 'Susan', 'Margaret', 'Dorothy', 'Lisa', 'Nancy', 'Karen', 'Betty', 'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Michelle', 'Laura', 'Sarah', 'Kimberly', 'Deborah', 'Jessica', 'Shirley', 'Cynthia', 'Angela', 'Melissa', 'Brenda', 'Amy', 'Anna', 'Rebecca', 'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Charles', 'Joseph', 'Thomas', 'Christopher', 'Daniel', 'Paul', 'Mark', 'Donald', 'George', 'Kenneth', 'Steven', 'Edward', 'Brian', 'Ronald', 'Anthony', 'Kevin', 'Jason', 'Matthew', 'Gary', 'Timothy', 'Jose', 'Larry', 'Jeffrey', 'Frank', 'Scott', 'Eric', 'Stephen', 'Andrew', 'Raymond', 'Gregory'];
    DemoUtils.lastNames = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris'];
    DemoUtils.words = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consetetur', 'sadipscing', 'elitr', 'sed', 'diam', 'nonumy', 'eirmod', 'tempor', 'invidunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliquyam', 'erat', 'sed', 'diam', 'voluptua', 'at', 'vero', 'eos', 'et', 'accusam', 'et', 'justo', 'duo', 'dolores', 'et', 'ea', 'rebum', 'stet', 'clita', 'kasd', 'gubergren', 'no', 'sea', 'takimata', 'sanctus', 'est', 'lorem', 'ipsum', 'dolor', 'sit', 'amet'];
    DemoUtils.colors = ['#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#34495e', '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50', '#f1c40f', '#e67e22', '#e74c3c', '#f39c12', '#d35400', '#c0392b'];
    DemoUtils.countryExtensions = ["ad", "af", "ai", "al", "am", "ao", "aq", "ar", "as", "at", "au", "aw", "az", "bb", "bd", "be", "bf", "bg", "bh", "bi", "bj", "bm", "bo", "br", "bs", "bt", "bv", "bw", "by", "bz", "ca", "cg", "ch", "ck", "cl", "cm", "cn", "co", "co", "cr", "cu", "cv", "cx", "cy", "cz", "de", "dj", "dk", "dm", "dz", "ec", "ed", "ee", "eg", "eh", "er", "es"];
    function randomInt(max) {
        return Math.floor(Math.random() * max);
    }
    DemoUtils.randomInt = randomInt;
    function randomOf(array) {
        return array[randomInt(array.length)];
    }
    DemoUtils.randomOf = randomOf;
    function randomFirstName() {
        return randomOf(DemoUtils.firstNames);
    }
    DemoUtils.randomFirstName = randomFirstName;
    function randomLastName() {
        return randomOf(DemoUtils.lastNames);
    }
    DemoUtils.randomLastName = randomLastName;
    function randomWords(count) {
        var sentence = "";
        for (var i = 0; i < count; i++) {
            sentence += DemoUtils.words[randomInt(DemoUtils.words.length)];
            if (i < count - 1) {
                sentence += " ";
            }
        }
        return sentence;
    }
    DemoUtils.randomWords = randomWords;
    function randomImageUrl() {
        return "https://avatars1.githubusercontent.com/u/" + (10000 + randomInt(1000)) + "?v=3&s=30";
    }
    DemoUtils.randomImageUrl = randomImageUrl;
    function randomColor() {
        return DemoUtils.colors[randomInt(DemoUtils.colors.length)];
    }
    function randomEmail() {
        return randomOf(DemoUtils.firstNames);
    }
    DemoUtils.randomEmail = randomEmail;
    function createEntries(count) {
        count = count || 100;
        var entries = [];
        for (var i = 1; i <= count; i++) {
            var firstName = randomOf(DemoUtils.firstNames);
            var lastName = randomOf(DemoUtils.lastNames);
            entries.push({
                id: i,
                displayValue: firstName + ' ' + lastName,
                additionalInfo: randomWords(3),
                additionalInfo2: firstName.toLowerCase() + '.' + lastName.toLowerCase() + '@' + randomOf(DemoUtils.words) + '.' + randomOf(DemoUtils.countryExtensions),
                imageUrl: randomImageUrl(),
                statusColor: randomColor()
            });
        }
        return entries;
    }
    DemoUtils.createEntries = createEntries;
    function createCurrencyEntries() {
        return [{
                "code": "AED",
                "shortName": "Dirhams",
                "name": "United Arab Emirates Dirhams",
                "exchangeRate": 3.672998,
                "exchangeRateBase": "USD"
            }, {
                "code": "AFN",
                "shortName": "Afghanis",
                "name": "Afghan Afghanis",
                "symbol": "؋",
                "exchangeRate": 62.04,
                "exchangeRateBase": "USD"
            }, {
                "code": "ALL",
                "shortName": "Leke",
                "name": "Albanian Lek",
                "symbol": "LEK",
                "exchangeRate": 127.989,
                "exchangeRateBase": "USD"
            }, {
                "code": "AMD",
                "shortName": "Drams",
                "name": "Armenian Drams",
                "exchangeRate": 478.4025,
                "exchangeRateBase": "USD"
            }, {
                "code": "ANG",
                "shortName": "Guilders",
                "name": "Netherlands Antillean Guilders",
                "symbol": "ƒ",
                "exchangeRate": 1.7887,
                "exchangeRateBase": "USD"
            }, {
                "code": "AOA",
                "shortName": "Kwanza",
                "name": "Angolan Kwanza",
                "exchangeRate": 125.905334,
                "exchangeRateBase": "USD"
            }, {
                "code": "ARS",
                "shortName": "Pesos",
                "name": "Argentine Pesos",
                "symbol": "$",
                "exchangeRate": 9.207371,
                "exchangeRateBase": "USD"
            }, {
                "code": "AUD",
                "shortName": "Dollars",
                "name": "Australian Dollars",
                "symbol": "$",
                "exchangeRate": 1.362025,
                "exchangeRateBase": "USD"
            }, {
                "alt_name": "Florins",
                "code": "AWG",
                "shortName": "Guilders",
                "name": "Aruban Guilders",
                "symbol": "ƒ",
                "exchangeRate": 1.793333,
                "exchangeRateBase": "USD"
            }, {
                "code": "AZN",
                "shortName": "New Manats",
                "name": "Azerbaijan New Manats",
                "symbol": "ман",
                "exchangeRate": 1.051475,
                "exchangeRateBase": "USD"
            }, {
                "code": "BAM",
                "shortName": "Convertible Marka",
                "name": "Convertible Marka",
                "symbol": "KM",
                "exchangeRate": 1.791789,
                "exchangeRateBase": "USD"
            }, {
                "code": "BBD",
                "shortName": "Dollars",
                "name": "Barbados Dollars",
                "symbol": "$",
                "exchangeRate": 2,
                "exchangeRateBase": "USD"
            }, {
                "code": "BDT",
                "shortName": "Taka",
                "name": "Bangladeshi Taka",
                "exchangeRate": 77.91867,
                "exchangeRateBase": "USD"
            }, {
                "code": "BGN",
                "shortName": "Leva",
                "name": "Bulgarian Leva",
                "symbol": "лв",
                "exchangeRate": 1.792014,
                "exchangeRateBase": "USD"
            }, {
                "code": "BHD",
                "shortName": "Dinars",
                "name": "Bahraini Dinars",
                "exchangeRate": 0.377048,
                "exchangeRateBase": "USD"
            }, {
                "code": "BIF",
                "shortName": "Francs",
                "name": "Burundi Francs",
                "exchangeRate": 1562.46,
                "exchangeRateBase": "USD"
            }, {
                "code": "BMD",
                "shortName": "Dollars",
                "name": "Bermudian Dollars",
                "symbol": "$",
                "exchangeRate": 1,
                "exchangeRateBase": "USD"
            }, {
                "code": "BND",
                "shortName": "Dollars",
                "name": "Brunei Dollars",
                "symbol": "$",
                "exchangeRate": 1.384586,
                "exchangeRateBase": "USD"
            }, {
                "code": "BOB",
                "shortName": "Bolivianos",
                "name": "Bolivianos",
                "symbol": "$b",
                "exchangeRate": 6.895817,
                "exchangeRateBase": "USD"
            }, {
                "code": "BRL",
                "shortName": "Real",
                "name": "Brazilian Real",
                "symbol": "R$",
                "exchangeRate": 3.52976,
                "exchangeRateBase": "USD"
            }, {
                "code": "BSD",
                "shortName": "Dollars",
                "name": "Bahamian Dollars",
                "symbol": "$",
                "exchangeRate": 1,
                "exchangeRateBase": "USD"
            }, {
                "code": "BTN",
                "shortName": "Ngultrum",
                "name": "Bhutan Ngultrum",
                "exchangeRate": 63.778234,
                "exchangeRateBase": "USD"
            }, {
                "code": "BWP",
                "shortName": "Pulas",
                "name": "Botswana Pulas",
                "symbol": "P",
                "exchangeRate": 10.160388,
                "exchangeRateBase": "USD"
            }, {
                "code": "BYR",
                "shortName": "Rubles",
                "name": "Belarussian Rubles",
                "symbol": "p.",
                "exchangeRate": 15663.45,
                "exchangeRateBase": "USD"
            }, {
                "code": "BZD",
                "shortName": "Dollars",
                "name": "Belize Dollars",
                "symbol": "BZ$",
                "exchangeRate": 2.017106,
                "exchangeRateBase": "USD"
            }, {
                "code": "CAD",
                "shortName": "Dollars",
                "name": "Canadian Dollars",
                "symbol": "$",
                "exchangeRate": 1.313358,
                "exchangeRateBase": "USD"
            }, {
                "code": "CDF",
                "shortName": "Franc",
                "name": "Franc",
                "exchangeRate": 925.62,
                "exchangeRateBase": "USD"
            }, {
                "code": "CHF",
                "shortName": "Switzerland Francs",
                "name": "Switzerland Francs",
                "symbol": "CHF",
                "exchangeRate": 0.980512,
                "exchangeRateBase": "USD"
            }, {
                "code": "CLP",
                "shortName": "Pesos",
                "name": "Chilean Pesos",
                "symbol": "$",
                "exchangeRate": 679.991804,
                "exchangeRateBase": "USD"
            }, {
                "code": "CNY",
                "shortName": "Yuan Renminbi",
                "name": "Yuan Renminbi",
                "symbol": "¥",
                "exchangeRate": 6.210352,
                "exchangeRateBase": "USD"
            }, {
                "code": "COP",
                "shortName": "Pesos",
                "name": "Colombian Pesos",
                "symbol": "$",
                "exchangeRate": 2940.543298,
                "exchangeRateBase": "USD"
            }, {
                "code": "CRC",
                "shortName": "Colones",
                "name": "Costa Rican Colones",
                "symbol": "₡",
                "exchangeRate": 534.3371,
                "exchangeRateBase": "USD"
            }, {
                "code": "CUP",
                "shortName": "Pesos",
                "name": "Cuban Pesos",
                "symbol": "₱",
                "exchangeRate": 1.000125,
                "exchangeRateBase": "USD"
            }, {
                "code": "CVE",
                "shortName": "Escudos",
                "name": "Cape Verde Escudos",
                "exchangeRate": 100.94871015,
                "exchangeRateBase": "USD"
            }, {
                "code": "CZK",
                "shortName": "Koruny",
                "name": "Czech Koruny",
                "symbol": "Kč",
                "exchangeRate": 24.76326,
                "exchangeRateBase": "USD"
            }, {
                "code": "DJF",
                "shortName": "Francs",
                "name": "Djibouti Francs",
                "exchangeRate": 177.745,
                "exchangeRateBase": "USD"
            }, {
                "code": "DKK",
                "shortName": "Kroner",
                "name": "Danish Kroner",
                "symbol": "kr",
                "exchangeRate": 6.836773,
                "exchangeRateBase": "USD"
            }, {
                "code": "DOP",
                "shortName": "Pesos",
                "name": "Dominican Pesos",
                "symbol": "RD$",
                "exchangeRate": 45.12285,
                "exchangeRateBase": "USD"
            }, {
                "code": "DZD",
                "shortName": "Dinars",
                "name": "Algerian Dinar",
                "exchangeRate": 100.64819,
                "exchangeRateBase": "USD"
            }, {
                "code": "ECS",
                "shortName": "Sucre",
                "name": "Ecuador Sucre"
            }, {
                "code": "EEK",
                "shortName": "Krooni",
                "name": "Krooni",
                "symbol": "kr",
                "exchangeRate": 14.35595,
                "exchangeRateBase": "USD"
            }, {
                "code": "EGP",
                "shortName": "Pounds",
                "name": "Egyptian Pounds",
                "symbol": "£",
                "exchangeRate": 7.829297,
                "exchangeRateBase": "USD"
            }, {
                "code": "ETB",
                "shortName": "Ethopia Birr",
                "name": "Ethopia Birr",
                "exchangeRate": 20.81261,
                "exchangeRateBase": "USD"
            }, {
                "code": "EUR",
                "shortName": "Euro",
                "name": "Euro",
                "symbol": "€",
                "exchangeRate": 0.91551,
                "exchangeRateBase": "USD"
            }, {
                "code": "FJD",
                "shortName": "Dollar",
                "name": "Fiji Dollar",
                "exchangeRate": 2.127617,
                "exchangeRateBase": "USD"
            }, {
                "code": "FKP",
                "shortName": "Pounds",
                "name": "Falkland Islands Pounds",
                "symbol": "£",
                "exchangeRate": 0.644618,
                "exchangeRateBase": "USD"
            }, {
                "code": "GBP",
                "shortName": "Pounds",
                "name": "Pound Sterling",
                "symbol": "£",
                "exchangeRate": 0.644618,
                "exchangeRateBase": "USD"
            }, {
                "code": "GEL",
                "shortName": "Lari",
                "name": "Lari",
                "exchangeRate": 2.3023,
                "exchangeRateBase": "USD"
            }, {
                "code": "GGP",
                "shortName": "Pounds",
                "name": "Pound Sterling",
                "symbol": "£",
                "exchangeRate": 0.644618,
                "exchangeRateBase": "USD"
            }, {
                "code": "GHS",
                "shortName": "Cedis",
                "name": "Ghanaian Cedis",
                "symbol": "¢",
                "exchangeRate": 3.803585,
                "exchangeRateBase": "USD"
            }, {
                "code": "GIP",
                "shortName": "Pounds",
                "name": "Gibraltar Pounds",
                "symbol": "£",
                "exchangeRate": 0.644618,
                "exchangeRateBase": "USD"
            }, {
                "code": "GMD",
                "shortName": "Lari",
                "name": "Gambian Dalasi",
                "exchangeRate": 39.635,
                "exchangeRateBase": "USD"
            }, {
                "code": "GNF",
                "shortName": "Francs",
                "name": "Guinea Francs",
                "exchangeRate": 7319.670098,
                "exchangeRateBase": "USD"
            }, {
                "code": "GTQ",
                "shortName": "Quetzales",
                "name": "Quetzales",
                "symbol": "Q",
                "exchangeRate": 7.650102,
                "exchangeRateBase": "USD"
            }, {
                "code": "GYD",
                "shortName": "Dollars",
                "name": "Guyana Dollars",
                "exchangeRate": 206.375669,
                "exchangeRateBase": "USD"
            }, {
                "code": "HKD",
                "shortName": "Dollars",
                "name": "Hong Kong Dollars",
                "symbol": "$",
                "exchangeRate": 7.751245,
                "exchangeRateBase": "USD"
            }, {
                "code": "HNL",
                "shortName": "Lempiras",
                "name": "Honduaran Lempiras",
                "symbol": "L",
                "exchangeRate": 21.93778,
                "exchangeRateBase": "USD"
            }, {
                "code": "HRK",
                "shortName": "Kuna",
                "name": "Croatian Kuna",
                "symbol": "kn",
                "exchangeRate": 6.932519,
                "exchangeRateBase": "USD"
            }, {
                "code": "HTG",
                "shortName": "Haitian Gourde",
                "name": "Haitian Gourde",
                "exchangeRate": 54.9016,
                "exchangeRateBase": "USD"
            }, {
                "code": "HUF",
                "shortName": "Forint",
                "name": "Hungarian Forint",
                "symbol": "Ft",
                "exchangeRate": 284.709001,
                "exchangeRateBase": "USD"
            }, {
                "code": "IDR",
                "shortName": "Indonesian Rupiahs",
                "name": "Indonesian Rupiahs",
                "symbol": "Rp",
                "exchangeRate": 13518.05,
                "exchangeRateBase": "USD"
            }, {
                "code": "ILS",
                "shortName": "New Shekels",
                "name": "New Shekels",
                "symbol": "₪",
                "exchangeRate": 3.801332,
                "exchangeRateBase": "USD"
            }, {
                "code": "IMP",
                "shortName": "Pounds",
                "name": "Pounds",
                "symbol": "£",
                "exchangeRate": 0.644618,
                "exchangeRateBase": "USD"
            }, {
                "code": "INR",
                "shortName": "Rupees",
                "name": "Indian Rupees",
                "symbol": "₨",
                "exchangeRate": 63.74111,
                "exchangeRateBase": "USD"
            }, {
                "code": "IQD",
                "shortName": "Dinars",
                "name": "Iraqi Dinars",
                "exchangeRate": 1163.144976,
                "exchangeRateBase": "USD"
            }, {
                "code": "IRR",
                "shortName": "Riais",
                "name": "Iranian Riais",
                "symbol": "﷼",
                "exchangeRate": 29667,
                "exchangeRateBase": "USD"
            }, {
                "code": "ISK",
                "shortName": "Kronur",
                "name": "Iceland Kronur",
                "symbol": "kr",
                "exchangeRate": 134.641,
                "exchangeRateBase": "USD"
            }, {
                "code": "JEP",
                "shortName": "Pounds",
                "name": "Pounds",
                "symbol": "£",
                "exchangeRate": 0.644618,
                "exchangeRateBase": "USD"
            }, {
                "code": "JMD",
                "shortName": "Dollars",
                "name": "Jamaican Dollars",
                "exchangeRate": 117.0699,
                "exchangeRateBase": "USD"
            }, {
                "code": "JOD",
                "shortName": "Dinars",
                "name": "Jordanian Dinar",
                "exchangeRate": 0.708408,
                "exchangeRateBase": "USD"
            }, {
                "code": "JPY",
                "shortName": "Yen",
                "name": "Japanese Yen",
                "symbol": "¥",
                "exchangeRate": 124.6868,
                "exchangeRateBase": "USD"
            }, {
                "code": "KES",
                "shortName": "Shillings",
                "name": "Kenyan Shillings",
                "exchangeRate": 101.0816,
                "exchangeRateBase": "USD"
            }, {
                "code": "KGS",
                "shortName": "Soms",
                "name": "Soms",
                "symbol": "лв",
                "exchangeRate": 61.6539,
                "exchangeRateBase": "USD"
            }, {
                "code": "KHR",
                "shortName": "Rieis",
                "name": "Kampuchean Rieis",
                "exchangeRate": 4081.747598,
                "exchangeRateBase": "USD"
            }, {
                "code": "KMF",
                "shortName": "Francs",
                "name": "Comoros Francs",
                "exchangeRate": 451.207547,
                "exchangeRateBase": "USD"
            }, {
                "code": "KPW",
                "shortName": "Won",
                "name": "North Korean Won",
                "symbol": "₩",
                "exchangeRate": 899.91,
                "exchangeRateBase": "USD"
            }, {
                "code": "KRW",
                "shortName": "Won",
                "name": "Korean Won",
                "symbol": "₩",
                "exchangeRate": 1167.246649,
                "exchangeRateBase": "USD"
            }, {
                "code": "KWD",
                "shortName": "Dinars",
                "name": "Kuwaiti Dinars",
                "exchangeRate": 0.303259,
                "exchangeRateBase": "USD"
            }, {
                "code": "KYD",
                "shortName": "Dollars",
                "name": "Cayman Islands Dollars",
                "symbol": "$",
                "exchangeRate": 0.82671,
                "exchangeRateBase": "USD"
            }, {
                "code": "KZT",
                "shortName": "Tenege",
                "name": "Kazhakstan Tenege",
                "symbol": "лв",
                "exchangeRate": 187.815799,
                "exchangeRateBase": "USD"
            }, {
                "code": "LAK",
                "shortName": "Kips",
                "name": "Lao Kips",
                "symbol": "₭",
                "exchangeRate": 8226.772598,
                "exchangeRateBase": "USD"
            }, {
                "code": "LBP",
                "shortName": "Pounds",
                "name": "Lebanese Pounds",
                "symbol": "£",
                "exchangeRate": 1509.19835,
                "exchangeRateBase": "USD"
            }, {
                "code": "LKR",
                "shortName": "Rupees",
                "name": "Sri Lanka Rupees",
                "symbol": "₨",
                "exchangeRate": 133.8827,
                "exchangeRateBase": "USD"
            }, {
                "code": "LRD",
                "shortName": "Dollars",
                "name": "Liberian Dollars",
                "symbol": "$",
                "exchangeRate": 84.580002,
                "exchangeRateBase": "USD"
            }, {
                "code": "LSL",
                "shortName": "Maloti",
                "name": "Lesotho Maloti",
                "exchangeRate": 12.741438,
                "exchangeRateBase": "USD"
            }, {
                "code": "LTL",
                "shortName": "Litai",
                "name": "Lithuanian Litai",
                "symbol": "Lt",
                "exchangeRate": 3.108123,
                "exchangeRateBase": "USD"
            }, {
                "code": "LVL",
                "shortName": "Lati",
                "name": "Latvian Lati",
                "symbol": "Ls",
                "exchangeRate": 0.636738,
                "exchangeRateBase": "USD"
            }, {
                "code": "LYD",
                "shortName": "Dinars",
                "name": "Libyan Dinars",
                "exchangeRate": 1.370369,
                "exchangeRateBase": "USD"
            }, {
                "code": "MAD",
                "shortName": "Dirhams",
                "name": "Moroccan Dirhams",
                "exchangeRate": 9.869969,
                "exchangeRateBase": "USD"
            }, {
                "code": "MDL",
                "shortName": "Lei",
                "name": "Moldovan Lei",
                "exchangeRate": 19.0416,
                "exchangeRateBase": "USD"
            }, {
                "code": "MKD",
                "shortName": "Macedonian Denar",
                "name": "Macedonian Denar",
                "exchangeRate": 56.38747,
                "exchangeRateBase": "USD"
            }, {
                "code": "MGA",
                "shortName": "Ariary",
                "name": "Ariary",
                "exchangeRate": 3308.551683,
                "exchangeRateBase": "USD"
            }, {
                "code": "MMK",
                "shortName": "Kyat",
                "name": "Myanmar Kyat",
                "exchangeRate": 1080.8919,
                "exchangeRateBase": "USD"
            }, {
                "code": "MNK",
                "shortName": "Kyats",
                "name": "Kyats"
            }, {
                "code": "MNT",
                "shortName": "Tugriks",
                "name": "Mongolian Tugriks",
                "symbol": "₮",
                "exchangeRate": 1981.833333,
                "exchangeRateBase": "USD"
            }, {
                "code": "MRO",
                "shortName": "Ouguiyas",
                "name": "Mauritanian Ouguiyas",
                "exchangeRate": 326.474,
                "exchangeRateBase": "USD"
            }, {
                "code": "MUR",
                "shortName": "Rupees",
                "name": "Mauritius Rupees",
                "symbol": "₨",
                "exchangeRate": 35.39115,
                "exchangeRateBase": "USD"
            }, {
                "code": "MVR",
                "shortName": "Rufiyaa",
                "name": "Maldive Rufiyaa",
                "exchangeRate": 15.308333,
                "exchangeRateBase": "USD"
            }, {
                "code": "MWK",
                "shortName": "Kwachas",
                "name": "Malawi Kwachas",
                "exchangeRate": 519.066629,
                "exchangeRateBase": "USD"
            }, {
                "code": "MXN",
                "shortName": "Pesos",
                "name": "Mexican Nuevo Pesos",
                "symbol": "$",
                "exchangeRate": 16.33074,
                "exchangeRateBase": "USD"
            }, {
                "code": "MYR",
                "shortName": "Ringgits",
                "name": "Malaysian Ringgits",
                "symbol": "RM",
                "exchangeRate": 3.90559,
                "exchangeRateBase": "USD"
            }, {
                "code": "MZN",
                "shortName": "Meticals",
                "name": "Mozambique Meticals",
                "symbol": "MT",
                "exchangeRate": 38.362501,
                "exchangeRateBase": "USD"
            }, {
                "code": "NAD",
                "shortName": "Dollars",
                "name": "Namibian Dollars",
                "symbol": "$",
                "exchangeRate": 12.74015,
                "exchangeRateBase": "USD"
            }, {
                "code": "NGN",
                "shortName": "Nairas",
                "name": "Nigerian Nairas",
                "symbol": "₦",
                "exchangeRate": 199.045,
                "exchangeRateBase": "USD"
            }, {
                "code": "NIO",
                "shortName": "Cordobas",
                "name": "Nicaraguan Cordobas Oro",
                "symbol": "C$",
                "exchangeRate": 27.2719,
                "exchangeRateBase": "USD"
            }, {
                "code": "NOK",
                "shortName": "Kroner",
                "name": "Norwegian Kroner",
                "symbol": "kr",
                "exchangeRate": 8.282989,
                "exchangeRateBase": "USD"
            }, {
                "code": "NPR",
                "shortName": "Rupees",
                "name": "Nepalese Rupees",
                "symbol": "₨",
                "exchangeRate": 102.09432,
                "exchangeRateBase": "USD"
            }, {
                "code": "NZD",
                "shortName": "New Zealand Dollars",
                "name": "New Zealand Dollars",
                "symbol": "$",
                "exchangeRate": 1.52718,
                "exchangeRateBase": "USD"
            }, {
                "code": "OMR",
                "shortName": "Riais",
                "name": "Riais",
                "symbol": "﷼",
                "exchangeRate": 0.384886,
                "exchangeRateBase": "USD"
            }, {
                "code": "PAB",
                "shortName": "Balboa",
                "name": "Balboa",
                "symbol": "B/.",
                "exchangeRate": 1,
                "exchangeRateBase": "USD"
            }, {
                "code": "PEN",
                "shortName": "Nuevos Soles",
                "name": "Peru Nuevos Soles",
                "symbol": "S/.",
                "exchangeRate": 3.20443,
                "exchangeRateBase": "USD"
            }, {
                "code": "PGK",
                "shortName": "Kina",
                "name": "Kina",
                "exchangeRate": 2.7677,
                "exchangeRateBase": "USD"
            }, {
                "code": "PHP",
                "shortName": "Pesos",
                "name": "Phillippines Pesos",
                "symbol": "Php",
                "exchangeRate": 45.75705,
                "exchangeRateBase": "USD"
            }, {
                "code": "PKR",
                "shortName": "Rupees",
                "name": "Pakistani Rupees",
                "symbol": "₨",
                "exchangeRate": 101.902,
                "exchangeRateBase": "USD"
            }, {
                "code": "PLN",
                "shortName": "Zlotych",
                "name": "Poland Zlotych",
                "symbol": "zł",
                "exchangeRate": 3.836042,
                "exchangeRateBase": "USD"
            }, {
                "code": "PYG",
                "shortName": "Guarani",
                "name": "Paraguay Guarani",
                "symbol": "Gs",
                "exchangeRate": 5203.808288,
                "exchangeRateBase": "USD"
            }, {
                "code": "QAR",
                "shortName": "Rials",
                "name": "Qatar Rials",
                "symbol": "﷼",
                "exchangeRate": 3.641038,
                "exchangeRateBase": "USD"
            }, {
                "code": "RON",
                "shortName": "New Lei",
                "name": "Romanian New Lei",
                "symbol": "lei",
                "exchangeRate": 4.041195,
                "exchangeRateBase": "USD"
            }, {
                "code": "RSD",
                "shortName": "Dinars",
                "name": "Serbia Dinars",
                "symbol": "Дин.",
                "exchangeRate": 110.1125,
                "exchangeRateBase": "USD"
            }, {
                "code": "RUB",
                "shortName": "Rubles",
                "name": "Russia Rubles",
                "symbol": "руб",
                "exchangeRate": 63.96831,
                "exchangeRateBase": "USD"
            }, {
                "code": "RWF",
                "shortName": "Francs",
                "name": "Francs",
                "exchangeRate": 718.918504,
                "exchangeRateBase": "USD"
            }, {
                "code": "SAR",
                "shortName": "Riyals",
                "name": "Saudi Arabia Riyals",
                "symbol": "﷼",
                "exchangeRate": 3.7501,
                "exchangeRateBase": "USD"
            }, {
                "code": "SBD",
                "shortName": "Dollars",
                "name": "Solomon Islands Dollars",
                "symbol": "$",
                "exchangeRate": 7.975786,
                "exchangeRateBase": "USD"
            }, {
                "code": "SCR",
                "shortName": "Rupees",
                "name": "Seychelles Rupees",
                "symbol": "₨",
                "exchangeRate": 13.065163,
                "exchangeRateBase": "USD"
            }, {
                "code": "SDG",
                "shortName": "Pounds",
                "name": "Pounds",
                "exchangeRate": 6.049138,
                "exchangeRateBase": "USD"
            }, {
                "code": "SEK",
                "shortName": "Kronor",
                "name": "Sweden Kronor",
                "symbol": "kr",
                "exchangeRate": 8.738658,
                "exchangeRateBase": "USD"
            }, {
                "code": "SGD",
                "shortName": "Dollars",
                "name": "Singapore Dollars",
                "symbol": "$",
                "exchangeRate": 1.383663,
                "exchangeRateBase": "USD"
            }, {
                "code": "SHP",
                "shortName": "Pounds",
                "name": "Saint Helena Pounds",
                "symbol": "£",
                "exchangeRate": 0.644618,
                "exchangeRateBase": "USD"
            }, {
                "code": "SLL",
                "shortName": "Leones",
                "name": "Leones",
                "exchangeRate": 3862.502442,
                "exchangeRateBase": "USD"
            }, {
                "code": "SOS",
                "shortName": "Shillings",
                "name": "Somalia Shillings",
                "symbol": "S",
                "exchangeRate": 671.877503,
                "exchangeRateBase": "USD"
            }, {
                "code": "SRD",
                "shortName": "Dollars",
                "name": "SurifullName Dollars",
                "symbol": "$",
                "exchangeRate": 3.2825,
                "exchangeRateBase": "USD"
            }, {
                "code": "STD",
                "shortName": "Dobras",
                "name": "Dobras",
                "exchangeRate": 22474.675,
                "exchangeRateBase": "USD"
            }, {
                "code": "SVC",
                "shortName": "Salvadoran Colón",
                "name": "Salvadoran Colón",
                "exchangeRate": 8.757081,
                "exchangeRateBase": "USD"
            }, {
                "code": "SYP",
                "shortName": "Pounds",
                "name": "Syria Pounds",
                "symbol": "£",
                "exchangeRate": 188.811003,
                "exchangeRateBase": "USD"
            }, {
                "code": "SZL",
                "shortName": "Emalangeni",
                "name": "Emalangeni",
                "exchangeRate": 12.74115,
                "exchangeRateBase": "USD"
            }, {
                "code": "THB",
                "shortName": "Baht",
                "name": "Thaliand Baht",
                "symbol": "฿",
                "exchangeRate": 35.11533,
                "exchangeRateBase": "USD"
            }, {
                "code": "TJS",
                "shortName": "Somoni",
                "name": "Somoni",
                "exchangeRate": 6.2602,
                "exchangeRateBase": "USD"
            }, {
                "code": "TMM",
                "shortName": "Manat",
                "name": "Manat"
            }, {
                "code": "TND",
                "shortName": "Dinars",
                "name": "Tunisian Dinars",
                "exchangeRate": 1.976391,
                "exchangeRateBase": "USD"
            }, {
                "code": "TOP",
                "shortName": "Pa'anga",
                "name": "Pa'anga",
                "exchangeRate": 2.221422,
                "exchangeRateBase": "USD"
            }, {
                "code": "TRY",
                "shortName": "Lira",
                "name": "Turkey Lira",
                "symbol": "TL",
                "exchangeRate": 2.78038,
                "exchangeRateBase": "USD"
            }, {
                "code": "TTD",
                "shortName": "Dollars",
                "name": "Trinidad and Tobago Dollars",
                "symbol": "$",
                "exchangeRate": 6.338274,
                "exchangeRateBase": "USD"
            }, {
                "code": "TVD",
                "shortName": "Tuvalu Dollars",
                "name": "Tuvalu Dollars"
            }, {
                "code": "TWD",
                "shortName": "New Dollars",
                "name": "Taiwan New Dollars",
                "symbol": "NT$",
                "exchangeRate": 31.54928,
                "exchangeRateBase": "USD"
            }, {
                "code": "TZS",
                "shortName": "Shillings",
                "name": "Shillings",
                "exchangeRate": 2110.270016,
                "exchangeRateBase": "USD"
            }, {
                "code": "UAH",
                "shortName": "Hryvnia",
                "name": "Ukraine Hryvnia",
                "symbol": "₴",
                "exchangeRate": 21.39064,
                "exchangeRateBase": "USD"
            }, {
                "code": "UGX",
                "shortName": "Shillings",
                "name": "Shillings",
                "exchangeRate": 3502.603333,
                "exchangeRateBase": "USD"
            }, {
                "code": "USD",
                "shortName": "Dollars",
                "name": "United States Dollars",
                "symbol": "$",
                "exchangeRate": 1,
                "exchangeRateBase": "USD"
            }, {
                "code": "UYU",
                "shortName": "Pesos",
                "name": "Uruguay Pesos",
                "symbol": "$U",
                "exchangeRate": 28.51899,
                "exchangeRateBase": "USD"
            }, {
                "code": "UZS",
                "shortName": "Sums",
                "name": "Uzbekistan Sums",
                "symbol": "лв",
                "exchangeRate": 2577.594971,
                "exchangeRateBase": "USD"
            }, {
                "code": "VEF",
                "shortName": "Bolivares Fuertes",
                "name": "Venezuela Bolivares Fuertes",
                "symbol": "Bs",
                "exchangeRate": 6.32062,
                "exchangeRateBase": "USD"
            }, {
                "code": "VND",
                "shortName": "Dong",
                "name": "Viet Nam Dong",
                "symbol": "₫",
                "exchangeRate": 21835.883333,
                "exchangeRateBase": "USD"
            }, {
                "code": "XAF",
                "shortName": "Communauté Financière Africaine Francs",
                "name": "Communauté Financière Africaine Francs",
                "exchangeRate": 601.718676,
                "exchangeRateBase": "USD"
            }, {
                "code": "XCD",
                "shortName": "East Caribbean Dollars",
                "name": "East Caribbean Dollars",
                "symbol": "$",
                "exchangeRate": 2.70102,
                "exchangeRateBase": "USD"
            }, {
                "code": "XOF",
                "shortName": "Communauté Financière Africaine Francs",
                "name": "Communauté Financière Africaine Francs",
                "exchangeRate": 601.016776,
                "exchangeRateBase": "USD"
            }, {
                "code": "XPF",
                "shortName": "Comptoirs Français du Pacifique Francs",
                "name": "Comptoirs Français du Pacifique Francs",
                "exchangeRate": 109.417649,
                "exchangeRateBase": "USD"
            }, {
                "code": "YER",
                "shortName": "Rials",
                "name": "Yemen Rials",
                "symbol": "﷼",
                "exchangeRate": 215.138999,
                "exchangeRateBase": "USD"
            }, {
                "code": "ZAR",
                "shortName": "Rand",
                "name": "South Africa Rand",
                "symbol": "R",
                "exchangeRate": 12.73661,
                "exchangeRateBase": "USD"
            }, {
                "code": "ZMK",
                "shortName": "Kwacha",
                "name": "Kwacha",
                "exchangeRate": 5252.024745,
                "exchangeRateBase": "USD"
            }, {
                "code": "ZWD",
                "shortName": "Zimbabwe Dollars",
                "name": "Zimbabwe Dollars",
                "symbol": "Z$"
            }];
    }
    DemoUtils.createCurrencyEntries = createCurrencyEntries;
    function createDemoTreeNodes() {
        return [{
                id: 1, displayValue: "Mail",
                additionalInfo: "43 unread",
                imageUrl: "img/icons/mail.png",
                isLeaf: false,
                expanded: true,
                children: [{
                        id: 11, displayValue: "Inbox",
                        additionalInfo: "21 unread",
                        imageUrl: "img/icons/arrow-down.png",
                        isLeaf: true
                    }, {
                        id: 12, displayValue: "Drafts",
                        additionalInfo: "5",
                        imageUrl: "img/icons/compose.png",
                        isLeaf: true
                    }, {
                        id: 13, displayValue: "Sent",
                        additionalInfo: "529 sent, 1 sending",
                        imageUrl: "img/icons/arrow-up.png",
                        isLeaf: true
                    }, {
                        id: 14, displayValue: "Tagged",
                        additionalInfo: "9 unread",
                        imageUrl: "img/icons/shop.png",
                        isLeaf: false,
                        children: [{
                                id: 141, displayValue: "Important",
                                additionalInfo: "5 unread",
                                imageUrl: "img/icons/shop.png",
                                isLeaf: true
                            }, {
                                id: 142, displayValue: "Private",
                                additionalInfo: "4 unread",
                                imageUrl: "img/icons/shop.png",
                                isLeaf: true
                            }]
                    }, {
                        id: 15, displayValue: "Folders",
                        additionalInfo: "22 unread",
                        imageUrl: "img/icons/folder.png",
                        isLeaf: false,
                        children: [{
                                id: 151, displayValue: "Project X",
                                additionalInfo: "4 unread",
                                imageUrl: "img/icons/folder.png",
                                isLeaf: true
                            }, {
                                id: 152, displayValue: "Bills",
                                additionalInfo: "18 unread",
                                imageUrl: "img/icons/folder.png",
                                isLeaf: true
                            }]
                    }, {
                        id: 16, displayValue: "Trash",
                        additionalInfo: "7293 kB",
                        imageUrl: "img/icons/recycle.png",
                        isLeaf: true
                    }]
            }, {
                id: 2, displayValue: "Notes",
                imageUrl: "img/icons/booklet.png",
                isLeaf: false,
                children: [{
                        id: 21, displayValue: "Product Management 2.0",
                        imageUrl: "img/icons/folder.png",
                        isLeaf: false,
                        children: [{
                                id: 211, displayValue: "Brainstorming",
                                additionalInfo: "Yesterday",
                                imageUrl: "img/icons/document.png",
                                isLeaf: true
                            }, {
                                id: 212, displayValue: "Presentation Notes",
                                additionalInfo: "5 minutes ago",
                                imageUrl: "img/icons/document.png",
                                isLeaf: true
                            }, {
                                id: 213, displayValue: "Concept",
                                additionalInfo: "2015-05-28",
                                imageUrl: "img/icons/document.png",
                                isLeaf: true
                            }]
                    }, {
                        id: 22, displayValue: "Marketing",
                        imageUrl: "img/icons/folder.png",
                        isLeaf: false,
                        children: [{
                                id: 221, displayValue: "Promotions 2015",
                                additionalInfo: "2015-01-23",
                                imageUrl: "img/icons/document.png",
                                isLeaf: true
                            }]
                    }]
            }, {
                id: 3, displayValue: "Calendar",
                imageUrl: "img/icons/calendar.png",
                isLeaf: true,
                statusColor: "#ee4400",
                additionalInfo: "2 overdue"
            }, {
                id: 4, displayValue: "Contacts",
                imageUrl: "img/icons/contacts.png",
                isLeaf: true
            }];
    }
    DemoUtils.createDemoTreeNodes = createDemoTreeNodes;
    var DebounceMode;
    (function (DebounceMode) {
        DebounceMode[DebounceMode["IMMEDIATE"] = 0] = "IMMEDIATE";
        DebounceMode[DebounceMode["LATER"] = 1] = "LATER";
        DebounceMode[DebounceMode["BOTH"] = 2] = "BOTH";
    })(DebounceMode = DemoUtils.DebounceMode || (DemoUtils.DebounceMode = {}));
    function debounce(func, delay, mode) {
        if (mode === void 0) { mode = DebounceMode.LATER; }
        var timeout;
        var needsToBeCalledLater;
        return function () {
            var context = this, args = arguments;
            var later = function () {
                timeout = null;
                if (needsToBeCalledLater)
                    func.apply(context, args);
                needsToBeCalledLater = false;
            };
            var callNow = (mode === DebounceMode.IMMEDIATE || mode === DebounceMode.BOTH) && !timeout;
            needsToBeCalledLater = (mode === DebounceMode.LATER) || (mode === DebounceMode.BOTH && !!timeout);
            clearTimeout(timeout);
            timeout = window.setTimeout(later, delay);
            if (callNow)
                func.apply(context, args);
        };
    }
    DemoUtils.debounce = debounce;
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    DemoUtils.generateUUID = generateUUID;
})(DemoUtils || (DemoUtils = {}));
//# sourceMappingURL=DemoUtils.js.map