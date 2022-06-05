// nodejs script
// usage: node parseCorpus.js
//   in the extracted innocentCorpus zip folder
const FS = require("fs");
const outputFileName = "innocent_terms_complete.js";
const termsObject = {};
let fileContent = "var innocent_terms_complete =";
// need to use var instead of const to be globally available in window object
for (let i=1; i<29; i++) {
    const terms = FS.readFileSync(`./term_meta_bank_${i}.json`);
    const termsJson = JSON.parse(terms);
    for (const termObject of termsJson) {
        const term = termObject[0];
        const freq = termObject[2];
        termsObject[term] = freq;
    }
}
fileContent += `${JSON.stringify(termsObject)};`;
FS.writeFileSync(`./${outputFileName}`, fileContent); // ~4.35MB (all terms)
console.log("done");
