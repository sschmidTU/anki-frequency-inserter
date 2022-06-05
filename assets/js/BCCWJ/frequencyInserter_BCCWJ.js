class FrequencyInserter {
    ankiConnectVersion = 6;
    ankiConnectUrl = "http://localhost:8765";
    ankiFuriganaFieldName = "Furigana";
    ankiFrequencyFieldName = "FrequencyBCCWJ"; // see setFrequencyFieldName()
    /** name of the field in Anki that's used to look up the frequency.
     * "expression" is more precise than "word", but we'll go for the shorter term.
     */
    ankiExpressionFieldName = "Front"; // could also be "Expression" etc., depending on your Anki deck setup
    ankiSearchQuery = `${this.ankiFrequencyFieldName}:*`; // can be modified by user.
    ankiQueryAddition = ""; // extends the anki query, e.g. this could be "deck:MyJPDeck".
    tryFuriganaFieldAsKey = true;
    connectPermissionGranted = false;
    notesWithChanges = [];
    notesNoChanges = [];
    notesWithoutFreq = [];
    // HTML stuff:
    expressionInput;
    freqNameInput;
    optionUpdateButton;
    optionsUpdateToast;
    infoBox;
    freqNewBox;
    freqNewBoxHeader;
    changesBox;
    changesBoxHeader;
    noFreqFoundBox;
    noFreqFoundBoxHeader;
    noChangesBox;
    noChangesBoxHeader;
    updatedBox;
    updatedBoxHeader;

    FrequencyInserter() {}

    setupHtmlElements() {
        this.expressionInput = document.getElementById("expressionFieldName");
        this.expressionInput.value = this.ankiExpressionFieldName;
        this.freqNameInput = document.getElementById("freqFieldName");
        this.freqNameInput.value = this.ankiFrequencyFieldName;
        this.optionUpdateButton = document.getElementById("optionUpdateBtn");
        this.optionsUpdateToast = document.getElementById("optionsUpdateToast");
        const self = this;
        this.optionUpdateButton.onclick = async function() {
            self.updateOptions();
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
        this.infoBox.innerHTML = "Please click <i>Connect to AnkiConnect</i>. Don't worry, it doesn't change your cards yet.<br>" +
            "Please accept the connection in Anki after clicking.";
        this.freqNewBox = document.getElementById("notesFreqNewBox");
        this.freqNewBoxHeader = document.getElementById("notesFreqNewBoxHeader");
        this.changesBox = document.getElementById("changesBox");
        this.changesBoxHeader = document.getElementById("changesBoxHeader");
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
    }

    updateOptions() {
        // TODO validate fields
        this.setExpressionFieldName(this.expressionInput.value);
        this.setFrequencyFieldName(this.freqNameInput.value);
        this.optionsUpdateToast.hidden = false;
        setTimeout(function() {
            this.optionsUpdateToast.hidden = true;
        }, 2000);
        //this.infoBox.innerText = "Options updated!\n" + this.infoBox.innerText;
        //this.infoBox.classList.add("expand");
    }

    /** Executes the changes (after a click on 'Update cards') that were found after the 'Connect' click. */
    async executeChanges() {
        if (!this.connectPermissionGranted) {
            this.infoBox.innerText = "Please connect to AnkiConnect first :)";
            return;
        }
        if (this.notesWithChanges.length === 0 && this.notesWithoutFreq.length === 0) {
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
        return `<tr><td><div>${expression}</div></td>` +
            `<td><div class="longDiv">${id}</div></td>` + // without longDiv this gets cramped
            `<td><div>${freqNew}</div></td>` +
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
            this.infoBox.innerHTML += "Review the changes below and click 'Update cards' to execute them.<br>" +
            "(frequency 100 = 100th most common word within <i>BCCWJ Corpus</i> of Contemporary Written Japanese)";
        }
    }

    processNotes(notes) {
        let noChangesNotes = [];
        this.notesWithChanges = [];
        this.notesWithoutFreq = [];
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
            let freqCorpus = terms_BCCWJ[expression];
            const validFrequency = (frequency) => frequency >= 0;
            const furigana = fields[this.ankiFuriganaFieldName]?.value;
            if (!validFrequency(freqCorpus) && furigana && this.tryFuriganaFieldAsKey) {
                const furiganaStripped = furigana.replaceAll(/<rt>.*<\/rt>/g, "").replaceAll(/<\/?ruby>/g, "");
                freqCorpus = terms_BCCWJ[furiganaStripped];
            }
            if (!validFrequency(freqCorpus)) {
                const expressionStripped = this.stripHtml(expression);
                // if (frontStripped !== front) {
                //     console.log("front that had html: " + frontStripped);
                // }
                freqCorpus = terms_BCCWJ[expressionStripped];
            }
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
                } else if (correctFrequencyRegex.test(freqExisting)) {
                    noChangesNotes.push(note);
                    tableHtmlNoChanges += `<tr><div><td>${expression}</div></td><td><div>${freqExisting}</div></td></tr>`;
                } else { // old frequency wasn't correct
                    let freqOld = fields[this.ankiFrequencyFieldName].value;
                    // escape html
                    freqOld = freqOld.replaceAll("&","&amp;").replaceAll("<","&lt;");
                    tableHtmlChanges += "<tr>" +
                        `<td>${expression}</td>` +
                        `<td>${freqCorpus}</td>` +
                        `<td>${freqOld}</td>` +
                        "</tr>";
                    this.notesWithChanges.push(note);
                }
            }
        } // end for notes
        const tableEnd = "</tbody></table>";
        tableHtmlNoChanges += tableEnd;
        tableHtmlChanges += tableEnd;
        tableHtmlNew += tableEnd;
        tableHtmlNoFreqFound += tableEnd;

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

        this.noFreqFoundBoxHeader.innerText = "Notes where no frequency was found in BCCWJ Corpus: " +
            `(${noFreqFoundCount} total)`;
        if (noFreqFoundCount > 0) {
            this.noFreqFoundBox.innerHTML = tableHtmlNoFreqFound;
            this.noFreqFoundBox.classList.add("expand");
        } else {
            this.noFreqFoundBox.classList.remove("expand");
        }

        this.infoBox.innerText += " done."
    }

    setExpressionFieldName(name, updateUI = false) {
        this.ankiExpressionFieldName = name;
        if (updateUI) {
            this.expressionInput.value = name;
        }
    }

    setFrequencyFieldName(name, updateUI = false) {
        this.ankiFrequencyFieldName = name;
        this.ankiSearchQuery = `${name}:*`;
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
}

// this is like $(document).ready with jquery
document.addEventListener("DOMContentLoaded", function(event) { 
    const inserter = new FrequencyInserter();
    inserter.setupHtmlElements();
    window.ankiInserter = inserter; // for console access like changing AnkiConnect url/port
});
