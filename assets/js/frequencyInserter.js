class FrequencyInserter {
    CorpusEnum = {
        Innocent: 0,
        BCCWJ: 1
    };
    CorpusInfo = {
        Innocent: {
            name: "InnocentCorpus",
            display_name: "InnocentCorpus",
            lowerIsMoreFrequent: false
        },
        BCCWJ: {
            name: "BCCWJ corpus",
            display_name: "BCCWJ corpus",
            lowerIsMoreFrequent: true
        }
    };
    corpusDict = {}; // e.g. corpusDict["古い"] = 794. (loaded in checkCorpus())
    ankiConnectVersion = 6;
    ankiConnectUrl = "http://localhost:8765";
    /** name of the field in Anki that's used to look up the frequency.
     * "expression" is more precise than "word".
     */
    ankiExpressionFieldName = "Front"; // could also be "Expression" etc., depending on your Anki deck setup
    ankiFrequencyFieldName = "FrequencyInnocent"; // see setFrequencyFieldName()
    ankiFuriganaFieldName = "Furigana";
    ankiReadingFieldName = "Reading";
    ankiSearchQuery = `"${this.ankiFrequencyFieldName}:*"`; // can be modified by user.
    ankiQueryAddition = ""; // extends the anki query, e.g. this could be "deck:MyJPDeck".
    corpusUsed = this.CorpusEnum.Innocent; // will be updated/checked later
    corpusUsedInfo = this.CorpusInfo.Innocent;
    tryReadingFieldAsKey = false;
    tryFuriganaFieldAsKey = true;
    tryStrippingHtml = true;
    tryConvertingHiraganaToKatakanaOrOpposite = true;
    takeMostFrequentOfAllForms = true; // take most frequent frequency from all forms that are enabled: expression, reading, furigana, hiragana/katakana, etc
    removeInvalidEntries = false;
    updateIncorrectFrequencies = true;
    connectPermissionGranted = false;
    notesWithChanges = [];
    notesNoChanges = [];
    notesWithoutFreq = [];
    notesWithRemoval = [];
    // HTML stuff:
    expressionInput;
    freqNameInput;
    tryReadingCheckbox;
    removeInvalidEntriesCheckbox;
    updateIncorrectFrequenciesCheckbox;
    takeMostFrequentCheckbox;
    infoBox;
    freqNewBox;
    freqNewBoxHeader;
    changesBox;
    changesBoxHeader;
    removalsBox;
    removalsBoxHeader;
    noFreqFoundBox;
    noFreqFoundBoxHeader;
    noChangesBox;
    noChangesBoxHeader;
    updatedBox;
    updatedBoxHeader;
    missingWordsBox;

    constructor() {
        this.checkCorpus();
    }

    checkCorpus() {
        if (window.innocent_terms_complete) { // loaded via script in index.html. if not checked via window, throws null error if null
            this.corpusUsed = this.CorpusEnum.Innocent;
            this.corpusUsedInfo = this.CorpusInfo.Innocent;
            this.ankiFrequencyFieldName = "FrequencyInnocent"; // may be overwritten later
            this.corpusDict = window.innocent_terms_complete;
        } else if (window.terms_BCCWJ) { // loaded via script in index_BCCWJ.html
            this.corpusUsed = this.CorpusEnum.BCCWJ;
            this.corpusUsedInfo = this.CorpusInfo.BCCWJ;
            this.ankiFrequencyFieldName = "FrequencyBCCWJ"; // may be overwritten later
            this.corpusDict = window.terms_BCCWJ;
        }
    }

    /** Executes the changes (after a click on 'Update cards') that were found after the 'Connect' click. */
    async executeChanges() {
        if (!this.connectPermissionGranted) {
            this.infoBox.innerText = "Please connect to AnkiConnect first :)";
            return;
        }
        if (this.notesWithChanges.length === 0 && this.notesWithoutFreq.length === 0 && this.notesWithRemoval.length === 0) {
            this.infoBox.innerText = `There were no notes with the given frequency and expression fields found that need changes.\n` +
                "Maybe you need to add the frequency field to your note types, see Usage information above.";
            return;
        }

        console.log("notesWithoutFreq:");
        console.dir(this.notesWithoutFreq);
        console.log("notesWithChanges");
        console.dir(this.notesWithChanges);

        let tableHtml = "<table><tbody><tr class='trHeader'>" +
            "<td>" + this.ankiExpressionFieldName + "</td>" +
            "<td>NoteId</td>" +
            "<td>New Frequency</td>" +
            "<td>Old Frequency</td>" +
            "</tr>";

        const actions = [];
        this.notesWithChanges.forEach((note) => tableHtml += this.addActionFromNote(note, actions, this));
        this.notesWithoutFreq.forEach((note) => tableHtml += this.addActionFromNote(note, actions, this));
        this.notesWithRemoval.forEach((note) => tableHtml += this.addActionFromNote(note, actions, this));
        tableHtml += "</trbody></table>";
        const totalUpdated = actions.length;
        this.updatedBoxHeader.innerText = `Updated: (${totalUpdated} total)`;
        this.updatedBox.innerHTML = tableHtml;
        if (totalUpdated > 0) {
            this.updatedBox.classList.add("expand");
        } else {
            this.updatedBox.classList.remove("expand");
        }
        const params = {
            "actions": actions
        };
        console.log("params being sent to AnkiConnect: ");
        console.dir(params);

        const response = await this.apiRequest("multi", params);
        console.log("AnkiConnect response to updating cards: ");
        console.dir(response);

        // TODO check response for error
        this.infoBox.innerText = "Your changes were successfully sent to AnkiConnect!\n" +
            "You can now open the Browse window again and test a few of the changes.\n\n" +
            "You can also click 'Connect to AnkiConnect' again to re-check your cards.";
        this.infoBox.classList.add("expandInfobox");
    }

    addActionFromNote(note, actions) {
        const expression = note.fields[this.ankiExpressionFieldName].value;
        let freqNew = note.newFrequency;
        if (!(freqNew >= 0)) {
            // shouldn't happen, just testing to make sure
            console.log(`note ${expression} has an invalid frequency found: ${freqNew}. Skipping.`);
            return;
        }
        let freqOld = note.fields[this.ankiFrequencyFieldName].value;
        freqOld = freqOld.replaceAll("&","&amp;").replaceAll("<","&lt;");
        const id = note.noteId;

        const fields = {};
        fields[this.ankiFrequencyFieldName] = freqNew.toString() // without toString API gives error (int)
        const noteParam = {
            "note": {
                "id": id,
                "fields": fields
            }
        }
        actions.push({
            "action": "updateNoteFields",
            "params": noteParam
        });
        const freqNewDisplayed = freqNew === "" ? "(removed/empty)" : freqNew;
        return `<tr><td><div>${expression}</div></td>` +
            `<td><div class="longDiv">${id}</div></td>` + // without longDiv this gets cramped
            `<td><div>${freqNewDisplayed}</div></td>` +
            `<td><div class="lastDiv">${freqOld}</div></td>` + // without longDiv/lastDiv this gets cramped
            "</tr>";
    }

    async connectClick() {
        const response = await this.apiRequest("requestPermission");
        console.log("AnkiConnect Response to requestPermission:");
        console.dir(response);

        if (response?.result?.permission !== "granted") {
            this.infoBox.innerText = "AnkiConnect permission denied after requestPermission request was sent.\n" +
            "Did you deny permission in Anki? Please try again.\n" +
            "Otherwise, you can also go to Tools -> Addons -> AnkiConnect->Config and add" +
            "https://sschmidtu.github.io/ to webCorsOriginList."
            this.infoBox.classList.add("expandInfobox");
            this.connectPermissionGranted = false;
            return;
        }
        this.connectPermissionGranted = true;
        console.log("AnkiConnect permission granted. Finding notes.");
        this.clearResultsBoxes();
        const noteIds = await this.findNotes(`${this.ankiSearchQuery} ${this.ankiQueryAddition}`);
        const notes = await this.notesInfo(noteIds);

        console.log("Total notes found: " + notes.length);
        this.processNotes(notes);
        this.infoBox.innerText = "";
        this.infoBox.classList.remove("expandInfobox");
        if (!this.ankiSearchQuery.includes(this.ankiFrequencyFieldName)) {
            this.infoBox.innerText += "Warning: ankiInserter.ankiSearchQuery doesn't include ankiInserter.ankiFrequencyFieldName.\n" +
            "You probably forgot to adjust the query or the frequency field name :)\n" + this.infoBox.innerText;
        } if (this.notesWithChanges.length === 0 && this.notesWithoutFreq.length === 0) {
            if (this.infoBox.innerText !== "") {
                this.infoBox.innerText += "\n";
                this.infoBox.classList.add("expandInfobox");
            }
            this.infoBox.innerText += `There were no notes with the given expression and frequency field names found that need changes.\n` +
                "Maybe you need to add the field to your note types, see Usage information above.";
        }  else {
            if (this.infoBox.innerText !== "") {
                this.infoBox.innerText += "\n";
                this.infoBox.classList.add("expandInfobox");
            }
            this.infoBox.innerHTML += "Review the changes below and click 'Update cards' to execute them.<br>";
            if (this.corpusUsed === this.CorpusEnum.Innocent) {
                this.infoBox.innerHTML += "(higher frequency = more common within <i>InnocentCorpus</i>, ~5000 books)";
            } else if (this.corpusUsed === this.CorpusEnum.BCCWJ) {
                this.infoBox.innerHTML += "(frequency 100 = 100th most common word within <i>BCCWJ Corpus</i> of Contemporary Written Japanese)";
            }
        }
    }

    processNotes(notes) {
        const corpusTerms = this.corpusDict;
        if (!corpusTerms) {
            console.log("error: no corpus loaded (ankiInserter.corpusDict)");
        }
        let noChangesNotes = [];
        this.notesWithChanges = [];
        this.notesWithoutFreq = [];
        this.notesWithRemoval = [];
        let noFreqFoundCount = 0;
        const correctFrequencyRegex = /^[0-9]+$/;
        const expressionFieldName = this.ankiExpressionFieldName;
        const frequencyFieldName = this.ankiFrequencyFieldName;
        let tableHtmlNew = `<table><tbody><tr class='trHeader'><td><div>${expressionFieldName}</div></td><td><div class="frequencyHeader">${frequencyFieldName}</div></td></tr>`;
        let tableHtmlNoChanges = `<table><tbody><tr class='trHeader'><td>${expressionFieldName}</td><td><div class="frequencyHeader">${frequencyFieldName}</div></td></tr>`;
        let tableHtmlChanges = "<table><tbody><tr class='trHeader'>" +
            `<td><div>${expressionFieldName}</div></td>` +
            "<td><div>New Frequency</div></td>" +
            `<td><div class="lastDiv">Old Frequency</div></td>` +
            "</tr>";
        let tableHtmlRemovals = `<table><tbody><tr class='trHeader'><td><div>${expressionFieldName}</div></td>` +
            `<td><div>Old Frequency</div></td></tr>`;
        let tableHtmlNoFreqFound = `<table><tbody><tr class='trHeader'><td>${expressionFieldName}</td></tr>`;
        this.infoBox.innerText = "Processing Notes...";
        for (const note of notes) {
            const fields = note.fields;
            if (!note.fields) {
                console.log("incomplete note:");
                console.dir(note);
                continue;
            }

            let expression = fields[this.ankiExpressionFieldName]?.value;
            if (!expression) {
                console.log (`note missing field '${this.ankiExpressionFieldName}':\n` +
                    JSON.stringify(note, null, 2)); // 2: beautify
                continue;
            }
            if (!fields[this.ankiFrequencyFieldName]) {
                this.infoBox.innerText += `Note ${expression} missing frequency field ${this.ankiFrequencyFieldName} (ankiInserter.ankiFrequencyFieldName)`;
                continue;
            }
            const freqExisting = fields[this.ankiFrequencyFieldName].value;
            const reading = fields[this.ankiReadingFieldName]?.value;
            const furigana = fields[this.ankiFuriganaFieldName]?.value;
            const freqCorpus = this.findFrequencyFor(expression, reading, furigana);
            const validFrequency = (frequency) => frequency > 0; // note that Number("") = 0.
            if (!validFrequency(freqCorpus)) {
                noFreqFoundCount++;
                tableHtmlNoFreqFound += "<tr>" +
                    `<td>${expression}</td>` +
                    "</tr>";
            } else {
                note.newFrequency = freqCorpus;
                if (freqExisting === "") {
                    this.notesWithoutFreq.push(note);
                    tableHtmlNew += `<tr><td><div>${expression}</div></td><td><div>${freqCorpus}</div></td></tr>`;
                } else if (!this.updateIncorrectFrequencies || correctFrequencyRegex.test(freqExisting) && Number(freqExisting) === freqCorpus && freqCorpus > 0) {
                    noChangesNotes.push(note);
                    tableHtmlNoChanges += `<tr><div><td>${expression}</div></td><td><div>${freqExisting}</div></td></tr>`;
                } else { // old frequency wasn't correct and will be updated
                    let freqOld = fields[this.ankiFrequencyFieldName].value;
                    // escape html
                    freqOld = freqOld.replaceAll("&","&amp;").replaceAll("<","&lt;");
                    tableHtmlChanges += "<tr>" +
                        `<td><div>${expression}</div></td>` +
                        `<td>${freqCorpus}</td>` +
                        `<td>${freqOld}</td>` +
                        "</tr>";
                    this.notesWithChanges.push(note);
                }
            }
            const freqOldToRemove = fields[this.ankiFrequencyFieldName].value;
            if (this.removeInvalidEntries && freqCorpus === undefined && validFrequency(freqOldToRemove)) {
                note.newFrequency = "";
                this.notesWithRemoval.push(note);
                tableHtmlRemovals += `<tr><td><div>${expression}</div></td><td><div>${freqOldToRemove}</div></td></tr>`;
            }
        } // end for notes
        const tableEnd = "</tbody></table>";
        tableHtmlNoChanges += tableEnd;
        tableHtmlChanges += tableEnd;
        tableHtmlNew += tableEnd;
        tableHtmlNoFreqFound += tableEnd;
        tableHtmlRemovals += tableEnd;

        const freqNewlyAddedCount = this.notesWithoutFreq.length;
        this.freqNewBoxHeader.innerText = `Notes where frequency will be newly added: (${freqNewlyAddedCount} total)`;
        if (freqNewlyAddedCount > 0) {
            this.freqNewBox.innerHTML = tableHtmlNew;
            this.freqNewBox.classList.add("expand");
        } else {
            this.freqNewBox.classList.remove("expand");
        }

        const noChangesCount = noChangesNotes.length;
        this.noChangesBoxHeader.innerText = "Notes that already have the correct frequency: " +
            `(${noChangesCount} total)`;
        if (noChangesCount > 0) {
            noChangesBox.innerHTML = tableHtmlNoChanges;
            this.noChangesBox.classList.add("expand");
        } else {
            this.noChangesBox.classList.remove("expand");
        }

        const changesCount = this.notesWithChanges.length;
        this.changesBoxHeader.innerText = "Notes where frequency will be changed: " +
            `(${changesCount} total)`;
        if (changesCount > 0) {
            this.changesBox.innerHTML = tableHtmlChanges;
            this.changesBox.classList.add("expand");
        } else {
            this.changesBox.classList.remove("expand");
        }

        this.noFreqFoundBoxHeader.innerText = `Notes where no frequency was found in ${this.corpusUsedInfo.display_name}: (${noFreqFoundCount} total)`;
        if (noFreqFoundCount > 0) {
            this.noFreqFoundBox.innerHTML = tableHtmlNoFreqFound;
            this.noFreqFoundBox.classList.add("expand");
        } else {
            this.noFreqFoundBox.classList.remove("expand");
        }

        const removalsCount = this.notesWithRemoval.length;
        this.removalsBoxHeader.innerText = "Notes where frequency will be removed: " + `(${removalsCount} total)`;
        if (removalsCount > 0) {
            this.removalsBox.innerHTML = tableHtmlRemovals;
            this.removalsBox.classList.add("expand");
        } else {
            this.removalsBox.classList.remove("expand");
        }

        this.infoBox.innerText += " done."
    }

    findFrequencyFor(expression, reading = undefined, furigana = undefined) {
        const corpusTerms = this.corpusDict;
        let freqExpression = corpusTerms[expression];
        let freqReadingField;
        let freqFurigana;
        let freqOtherKanaVersion;
        let freqStrippedHtml
        if (expression === "如何") {
            console.log("break");
        }
        if (this.tryStrippingHtml) {
            const expressionStripped = this.stripHtml(expression);
            // if (frontStripped !== front) {
            //     console.log("front that had html: " + frontStripped);
            // }
            freqStrippedHtml = corpusTerms[expressionStripped];
        }
        if (furigana && this.tryFuriganaFieldAsKey) {
            const furiganaStripped = this.stripFurigana(furigana);
            // TODO ^ this returns the kanji version, not the reading.
            //   though this does fix cases where the user modified the expression field,
            //   and we don't always want to search by reading, see above.
            freqFurigana = corpusTerms[furiganaStripped];
        }
        if (reading && this.tryReadingFieldAsKey) {
            freqReadingField = corpusTerms[reading];
            // note that this can give some misleading frequencies, e.g. 盗る (とる, "steal" nuance of 取る "to take").
            //   取る is the 2396th most common word in BCCWJ, but saying the same for 盗る would be misleading.
            //   on the other hand, this is not a common case, and it finds a lot of correct frequencies like for といった instead of と言った.
        }
        if (this.tryConvertingHiraganaToKatakanaOrOpposite) {
            // try converting from/to hiragana/katakana. e.g. InnocentCorpus has only ニコニコ, BCCWJ has only にこにこ.
            if (wanakana.isKatakana(expression)) {
                freqOtherKanaVersion = corpusTerms[wanakana.toHiragana(expression)]
            } else if (wanakana.isHiragana(expression)) {
                freqOtherKanaVersion = corpusTerms[wanakana.toKatakana(expression)];
            }
        }
        const frequencies = [freqExpression, freqReadingField, freqFurigana, freqOtherKanaVersion, freqStrippedHtml];
        if (this.takeMostFrequentOfAllForms) {
            let mostFrequentFrequency = freqExpression;
            let minOrMax = Math.max;
            if (this.corpusUsedInfo.lowerIsMoreFrequent) {
                minOrMax = Math.min;
            }
            for (const frequency of frequencies) {
                if (!mostFrequentFrequency) {
                    mostFrequentFrequency = frequency
                } else if (frequency) {
                    mostFrequentFrequency = minOrMax(frequency, mostFrequentFrequency);
                }
            }
            return mostFrequentFrequency;
        } else {
            const validFrequency = (frequency) => frequency >= 0;
            for (const frequency in frequencies) {
                if (validFrequency(frequency)) {
                    return frequency;
                }
            }
        }
        return freqExpression; // either undefined or a number >= 0
    }

    setExpressionFieldName(name, updateUI = false) {
        this.ankiExpressionFieldName = name;
        if (updateUI) {
            this.expressionInput.value = name;
        }
    }

    setFrequencyFieldName(name, updateUI = false) {
        this.ankiFrequencyFieldName = name;
        this.ankiSearchQuery = `"${name}:*"`;
        if (updateUI) {
            this.freqNameInput.value = name;
        }
    }

    async findNotes(query) {
        const response = await this.apiRequest("findNotes", {"query": query});
        return response.result; // list of ids
    }

    async notesInfo(noteIds) {
        const response = await this.apiRequest("notesInfo", {"notes": noteIds});
        return response.result; // list of notes with note.fields etc
    }

    /** Sends an HTTPRequest (Post) to the AnkiConnect API.
     * 
     * @param {*} action The action, e.g. 'findNotes', 'notesInfo', 'multi', or 'updateNoteFields'
     * @param {*} params action parameters, e.g. {"notes": listOfNoteIds}
     * @param {*} version AnkiConnect version used
     * @returns 
     */
    apiRequest(action, params={}, version=this.ankiConnectVersion) {
        const self = this;
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('error', () => {
                self.infoBox.innerText = "Connection to AnkiConnect failed. Have you started Anki?" +
                "\n Also, have you installed the addon AnkiConnect? See Usage information above." +
                "\n Also, note that this has stopped working online in recent Chrome versions. Try Firefox, Edge, or Chrome offline (download from Github)."
                self.infoBox.classList.add("expandInfobox");
                reject('failed to issue request');
            });
            xhr.addEventListener('load', () => {
                try {
                    const response = JSON.parse(xhr.responseText);
                    // if (Object.getOwnPropertyNames(response).length != 2) {
                    //     throw 'response has an unexpected number of fields';
                    // }
                    // if (!response.hasOwnProperty('error')) {
                        //     throw 'response is missing required error field';
                        // }
                        // if (!response.hasOwnProperty('result')) {
                            //     throw 'response is missing required result field';
                            // }
                    if (response.error) {
                        throw response.error;
                    }
                    resolve(response);
                } catch (e) {
                    reject(e);
                }
            });
                    
            xhr.open('POST', this.ankiConnectUrl);
            xhr.setRequestHeader('Access-Control-Request-Private-Network', true);
            // if you're running this offline with an URL like file://*, CORS support will be limited.
            //   try adding ,"null" to "webCorsOriginList", e.g.: "webCorsOriginList": ["http:localhost", "null"]
            //   if that doesn't work, if using Chrome, try starting it with the command parameter --allow-file-access-from-files
            // xhr.setRequestHeader('Access-Control-Allow-Origin', "*/*");
            xhr.setRequestHeader('Access-Control-Allow-Origin', "null");
            // xhr.setRequestHeader('Access-Control-Allow-Headers', 'Accept'); // probably unnecessary
            xhr.send(JSON.stringify({action, version, params}));
        });
    }

    clearResultsBoxes() {
        this.changesBox.innerHTML = "";
        this.noFreqFoundBox.innerHTML = "";
        this.freqNewBox.innerHTML = "";
        this.noChangesBox.innerHTML = "";
        this.removalsBox.innerHTML = "";
    }

    stripHtml(htmlString) {
        let tmp = document.createElement("div");
        tmp.innerHTML = htmlString;
        return tmp.textContent || tmp.innerText || "";
    }
    
    getUrlParameters() {
        let params = {};
        let parser = document.createElement('a');
        parser.href = window.location.href;
        const query = parser.search.substring(1);
        const vars = query.split('&');
        for (var i = 0; i < vars.length; i++) {
          const pair = vars[i].split('=');
          params[pair[0]] = decodeURIComponent(pair[1]);
        }
        return params;
    }

    setupHtmlElements() {
        const self = this; // `this` isn't available in anonymous functions.
        this.expressionInput = document.getElementById("expressionFieldName");
        if (this.expressionInput) {
            this.expressionInput.value = this.ankiExpressionFieldName;
            this.expressionInput.oninput = function() {
                self.setExpressionFieldName(self.expressionInput.value);
            }
        }
        this.freqNameInput = document.getElementById("freqFieldName");
        if (this.freqNameInput) {
            this.freqNameInput.value = this.ankiFrequencyFieldName;
            this.freqNameInput.oninput = function() {
                self.setFrequencyFieldName(self.freqNameInput.value);
            }
        }

        const params = this.getUrlParameters();
        if (params.expressionFieldName) {
            this.setExpressionFieldName(params.expressionFieldName, true);
        }
        if (params.frequencyFieldName) {
            this.setFrequencyFieldName(params.frequencyFieldName, true);
        }
        if (params.freqFieldName) {
            this.setFrequencyFieldName(params.freqFieldName, true);
        }

        this.infoBox = document.getElementById("infoBox");
        this.infoBox.innerHTML = "Please click <i>Connect to AnkiConnect</i>. It doesn't update your cards yet, you'll get a preview below.<br>" +
            "Please accept the connection in Anki after clicking (once).";
        this.freqNewBox = document.getElementById("notesFreqNewBox");
        this.freqNewBoxHeader = document.getElementById("notesFreqNewBoxHeader");
        this.changesBox = document.getElementById("changesBox");
        this.changesBoxHeader = document.getElementById("changesBoxHeader");
        this.removalsBox = document.getElementById("removalsBox");
        this.removalsBoxHeader = document.getElementById("removalsBoxHeader");
        this.noFreqFoundBox = document.getElementById("noFreqFoundBox");
        this.noFreqFoundBoxHeader = document.getElementById("noFreqFoundBoxHeader");
        this.noChangesBox = document.getElementById("noChangesBox");
        this.noChangesBoxHeader = document.getElementById("noChangesBoxHeader");
        this.updatedBox = document.getElementById("updatedBox");
        this.updatedBoxHeader = document.getElementById("updatedBoxHeader");
        const connectBtn = document.getElementById("connectBtn");
        connectBtn.onclick = async function() {
            await self.connectClick();
            //await self.testEmptyCardsError();
        };
        const executeBtn = document.getElementById("updateCardsBtn");
        executeBtn.onclick = async function() {
            await self.executeChanges(self);
        }
        this.tryReadingCheckbox = document.getElementById("checkboxTryReading");
        if (this.tryReadingCheckbox) {
            this.tryReadingCheckbox.oninput = function() {
                self.tryReadingFieldAsKey = self.tryReadingCheckbox.checked;
            }
            if (params.tryReadingField && params.tryReadingField !== '0') {
                this.tryReadingCheckbox.checked = true;
            }
            this.tryReadingFieldAsKey = this.tryReadingCheckbox.checked;
        }
        this.removeInvalidEntriesCheckbox = document.getElementById("checkboxRemoveInvalidEntries");
        if (this.removeInvalidEntriesCheckbox) {
            this.removeInvalidEntriesCheckbox.oninput = function() {
                self.removeInvalidEntries = self.removeInvalidEntriesCheckbox.checked;
            }
            if (params.removeInvalidEntries && params.removeInvalidEntries !== '0') {
                this.removeInvalidEntriesCheckbox.checked = true;
            }
            this.removeInvalidEntries = this.removeInvalidEntriesCheckbox.checked;
        }
        this.updateIncorrectFrequenciesCheckbox = document.getElementById("checkboxUpdateIncorrectEntries");
        if (this.updateIncorrectFrequenciesCheckbox) {
            this.updateIncorrectFrequenciesCheckbox.oninput = function() {
                self.updateIncorrectFrequencies = self.updateIncorrectFrequenciesCheckbox.checked;
            }
            if (params.updateIncorrectFrequencies === '0') {
                this.updateIncorrectFrequenciesCheckbox.checked = false;
            }
            this.updateIncorrectFrequencies = this.updateIncorrectFrequenciesCheckbox.checked;
        }
        this.takeMostFrequentCheckbox = document.getElementById("checkboxTakeMostFrequent");
        if (this.takeMostFrequentCheckbox) {
            this.takeMostFrequentCheckbox.oninput = function() {
                self.takeMostFrequentOfAllForms = self.takeMostFrequentCheckbox.checked;
            }
            if (params.takeMostFrequent === '0') {
                this.takeMostFrequentCheckbox.checked = false;
            }
            this.takeMostFrequentOfAllForms = this.takeMostFrequentCheckbox.checked;
        }

        const testFrequencyInput = document.getElementById("testFrequencyFieldName");
        if (testFrequencyInput) {
            this.updateTestFrequencyAnswer();
            testFrequencyInput.oninput = function() {
                self.updateTestFrequencyAnswer();
            }
        }

        this.missingWordsBox = document.getElementById("missingWordsBox");
        const missingWordsBtn = document.getElementById("missingWordsBtn");
        if (missingWordsBtn) {
            missingWordsBtn.onclick = function() {
                self.updateMissingWords();
            }
        }
    }
    
    updateTestFrequencyAnswer() {
        const testFrequencyInput = document.getElementById("testFrequencyFieldName");
        if (testFrequencyInput) {
            let freqInputString = testFrequencyInput.value;

            const testFrequencyAnswerField = document.getElementById("testFrequencyAnswer");
            testFrequencyAnswerField.innerText = this.findFrequencyFor(freqInputString);
        }
    }

    stripFurigana(furigana) {
        return furigana.replaceAll(/<rt>.*?<\/rt>/g, "").replaceAll(/<\/?ruby>/g, ""); // .*? need "lazy" search, not greedy, to find shortest match
    }

    async updateMissingWords() {
        const keys = Object.keys(this.corpusDict);
        const startFreqInput = document.getElementById("missingWordsStartFreqInput");
        const startFreq = Number(startFreqInput.value);
        const endFreqInput = document.getElementById("missingWordsEndFreqInput");
        const endFreq = Number(endFreqInput.value);
        const progressLabel = document.getElementById("missingWordsProgressLabel");

        const filterWKVocab = document.getElementById("filterWKWordsCheckbox").checked;
        const showExistingCards = document.getElementById("showExistingWordsCheckbox").checked;

        const missingWordsBox = document.getElementById("missingWordsBox");
        missingWordsBox.style.height = "400px";
        missingWordsBox.innerHTML = "";
        const table = document.createElement("table");
        const tr = table.insertRow();
        const headers = ["Frequency","Expression"];
        for (const header of headers) {
            const td = tr.insertCell();
            td.innerHTML = `<b>${header}</b>`;
        }
        missingWordsBox.appendChild(table);
        
        let foundByFurigana = 0;
        let foundByKanaConversion = 0;
        let wkWordsFiltered = 0;
        if (!window["wk_vocab"]) {
            window["wk_vocab"] = {};
        }
        for (let i = startFreq; i <= endFreq; i++) {
            const word = keys[i];
            progressLabel.innerText = `${i - startFreq + 1} / ${endFreq - startFreq + 1}`;
            if (filterWKVocab) {
                if (this.isWKWord(word) || this.isWKWord(word.replace("する",""))) {
                    wkWordsFiltered++;
                    continue;
                }
            }
            if (showExistingCards) {
                this.addWordToBonusTable(word, table, i);
                continue;
            }

            let matchingNote;
            const noteIds = await this.findNotes(word);
            if (noteIds.length !== 0) {
                const notes = await this.notesInfo(noteIds);
                for (const note of notes) {
                    const expressionField = note.fields[this.ankiExpressionFieldName].value;
                    let furigana;
                    if (this.tryFuriganaFieldAsKey) {
                        furigana = note.fields["Furigana"]?.value;
                    }
                    if (filterWKVocab && this.isWKWord(word, furigana)) {
                        wkWordsFiltered++;
                        break;
                    }
                    if (expressionField === word) {
                        matchingNote = note;
                        //console.log(`found note ${i}: ${expressionField}`);
                        break;
                    }
                    if (this.tryFuriganaFieldAsKey && furigana) {
                        if (word === this.stripFurigana(furigana)) {
                            matchingNote = note;
                            //console.log(`found note ${i} (by furigana): ${expressionField}`);
                            foundByFurigana++;
                            break;
                        }
                    }
                    if (this.tryConvertingHiraganaToKatakanaOrOpposite) {
                        let converted;
                        if (wanakana.isKatakana(expressionField)) {
                            converted = wanakana.toHiragana(expressionField);
                        } else if (wanakana.isHiragana(expressionField)) {
                            converted = wanakana.toKatakana(expressionField);
                        }
                        if (converted === word) {
                            //console.log(`found note ${i} (by kana conversion): ${expressionField}`);
                            foundByKanaConversion++;
                            break;
                        }
                    }
                }
            }
            if (!matchingNote) {
                this.addWordToBonusTable(word, table, i); // maybe instead of word, take expression field
            }
        }
        console.log("total found by furigana: " + foundByFurigana);
        console.log("total found by kana conversion: " + foundByKanaConversion);
        console.log("total WK words filtered: " + wkWordsFiltered);
    }

    addWordToBonusTable(word, table, frequency) {
        const tr = table.insertRow();
        const tdFreq = tr.insertCell();
        tdFreq.innerText = frequency;
        const tdWord = tr.insertCell();
        tdWord.innerText = word;
    }

    isWKWord(word, furigana = undefined) {
        if (wk_vocab[word]) {
            return true;
        } else if (furigana && wk_vocab[this.stripFurigana(furigana)]) {
            return true;
        }
        return false;
    }
}

// this is like $(document).ready with jquery
document.addEventListener("DOMContentLoaded", function(event) { 
    const inserter = new FrequencyInserter();
    inserter.setupHtmlElements();
    window.ankiInserter = inserter; // for console access like changing AnkiConnect url/port
});
// apparently equivalent:
// document.addEventListener("readystatechange", function(event) { 
//     if (document.readyState === "complete") {
//         // initialize, see above
//     }
// });
