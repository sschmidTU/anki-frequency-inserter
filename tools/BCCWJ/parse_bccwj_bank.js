const FS = require("fs");
const termsObject = {};
const bccwj_string = FS.readFileSync(`./term_meta_bank_1.json`);
const bccwj_array = JSON.parse(bccwj_string);
for (const kanjiData of bccwj_array) {
    termsObject[kanjiData[0]] = kanjiData[2];
}
console.log("array[0]: " + bccwj_array[0][0]);
console.log(termsObject["の"]);
const outputString = JSON.stringify(termsObject);
FS.writeFileSync(`./bccwj_terms_hashmap.json`, outputString);
