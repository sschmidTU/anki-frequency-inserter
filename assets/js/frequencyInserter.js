class FrequencyInserter {
    ankiConnectVersion = 6;
    ankiFrequencyFieldName = "FrequencyInnocent";
    ankiSearchQuery = `${this.ankiFrequencyFieldName}:*`; // can be modified by user. take care to update frequencyFieldName if necessary though
    ankiQueryAddition = ""; // extends the anki query, e.g. this could be "deck:MyJPDeck".
    ankiConnectUrl = "http://localhost:8765";
    ankiFuriganaFieldName = "Furigana";
    tryFuriganaFieldAsKey = true;
    connectPermissionGranted = false;
    notesWithChanges = [];
    notesNoChanges = [];
    notesWithoutFreq = [];
    // HTML stuff:
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
        const self = this;
        const connectBtn = document.getElementById("connectBtn");
        connectBtn.onclick = async function() {
            await self.connectClick();
            //await self.testEmptyCardsError();
        };
        const executeBtn = document.getElementById("updateCardsBtn");
        executeBtn.onclick = async function() {
            if (!self.connectPermissionGranted) {
                self.infoBox.innerText = "Please connect to AnkiConnect first :)";
                return;
            }
            if (self.notesWithChanges.length === 0 && self.notesWithoutFreq.length === 0) {
                self.infoBox.innerText = `There were no notes with a "${self.ankiFrequencyFieldName}" field name found that need changes.\n` +
                    "Maybe you need to add the field to your note types, see Usage information above.";
                return;
            }
            await self.executeChanges();
        }
    }

    /** Executes the changes (after a click on 'Update cards') that were found after the 'Connect' click. */
    async executeChanges() {
        console.log("notesWithoutFreq:");
        console.dir(this.notesWithoutFreq);
        console.log("notesWithChanges");
        console.dir(this.notesWithChanges);

        let tableHtml = "<table><tbody><tr class='trHeader'>" +
            "<td>Front</td>" +
            "<td>NoteId</td>" +
            "<td>New Frequency</td>" +
            "<td>Old Frequency</td>" +
            "</tr>";

        const actions = [];
        this.notesWithChanges.forEach((note) => tableHtml += this.addActionFromNote(note, actions));
        this.notesWithoutFreq.forEach((note) => tableHtml += this.addActionFromNote(note, actions));
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
        this.infoBox.classList.add("expand");
    }

    addActionFromNote(note, actions) {
        const front = note.fields.Front.value;
        let freqNew = note.newFrequency;
        if (!(freqNew >= 0)) {
            // shouldn't happen, just testing to make sure
            console.log(`note ${front} has an invalid frequency found: ${freqNew}. Skipping.`);
            return;
        }
        let freqOld = note.fields.FrequencyInnocent.value;
        freqOld = freqOld.replaceAll("&","&amp;").replaceAll("<","&lt;");
        const id = note.noteId;

        const fields = {
            "FrequencyInnocent": freqNew.toString() // without toString API gives error (int)
        };
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
        return `<tr><td><div>${front}</div></td>` +
            `<td><div class="longDiv">${id}</div></td>` + // without longDiv this gets cramped
            `<td><div>${freqNew}</div></td>` +
            `<td><div class="lastDiv">${freqOld}</div></td>` + // without longDiv/lastDiv this gets cramped
            "</tr>";
    }

    async connectClick() {
        const response = await this.apiRequest("requestPermission");
        console.log("AnkiConnect Response to requestPermission:");
        console.dir(response);
        this.infoBox.innerText = "Review the changes below and click 'Update cards' to execute them.";
        this.infoBox.classList.remove("expand");

        if (response?.result?.permission !== "granted") {
            this.infoBox.innerText = "AnkiConnect permission denied after requestPermission request was sent.\n" +
            "Did you deny permission in Anki? Please try again.\n" +
            "Otherwise, you can also go to Tools -> Addons -> AnkiConnect->Config and add" +
            "https://sschmidtu.github.io/ to webCorsOriginList."
            this.infoBox.classList.add("expand");
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
        if (this.notesWithChanges.length === 0 && this.notesWithoutFreq.length === 0) {
            this.infoBox.innerText = `There were no notes with a "${this.ankiFrequencyFieldName}" field name found that need changes.\n` +
                "Maybe you need to add the field to your note types, see Usage information above.";
        }
        if (!this.ankiSearchQuery.includes(this.ankiFrequencyFieldName)) {
            this.infoBox.innerText = "Warning: ankiInserter.ankiSearchQuery doesn't include ankiInserter.ankiFrequencyFieldName.\n" +
            "You probably forgot to adjust the query or the frequency field name :)\n" + this.infoBox.innerText;
        }
    }

    processNotes(notes) {
        let noChangesNotes = [];
        this.notesWithChanges = [];
        this.notesWithoutFreq = [];
        let noFreqFoundCount = 0;
        const correctFrequencyRegex = /^[0-9]+$/;
        let tableHtmlNew = "<table><tbody><tr class='trHeader'><td><div>Front</div></td><td><div>Frequency</div></td></tr>";
        let tableHtmlNoChanges = "<table><tbody><tr class='trHeader'><td>Front</td><td>Frequency</td></tr>";
        let tableHtmlChanges = "<table><tbody><tr class='trHeader'>" +
            "<td><div>Front</div></td>" +
            "<td><div>New Frequency</div></td>" +
            `<td><div class="lastDiv">Old Frequency</div></td>` +
            "</tr>";
        let tableHtmlNoFreqFound = "<table><tbody><tr class='trHeader'><td>Front</td></tr>";
        for (const note of notes) {
            const fields = note.fields;
            if (!note.fields) {
                console.log("incomplete note:");
                console.dir(note);
                continue;
            }

            const freqExisting = fields[this.ankiFrequencyFieldName].value;
            let front = fields.Front.value;
            let freqInnocent = innocent_terms_complete[front];
            const validFrequency = (frequency) => frequency >= 0;
            const furigana = fields[this.ankiFuriganaFieldName]?.value;
            if (!validFrequency(freqInnocent) && furigana && this.tryFuriganaFieldAsKey) {
                const furiganaStripped = furigana.replaceAll(/<rt>.*<\/rt>/g, "").replaceAll(/<\/?ruby>/g, "");
                freqInnocent = innocent_terms_complete[furiganaStripped];
            }
            // TODO try stripping the front of HTML and checking again.
            // const frontStripped = this.stripHtml(front);
            if (!validFrequency(freqInnocent)) {
                noFreqFoundCount++;
                tableHtmlNoFreqFound += "<tr>" +
                    `<td>${front}</td>` +
                    "</tr>";
            } else {
                note.newFrequency = freqInnocent;
                if (freqExisting === "") {
                    this.notesWithoutFreq.push(note);
                    tableHtmlNew += `<tr><td><div>${front}</div></td><td><div>${freqInnocent}</div></td></tr>`;
                } else if (correctFrequencyRegex.test(freqExisting)) {
                    noChangesNotes.push(note);
                    tableHtmlNoChanges += `<tr><div><td>${front}</div></td><td><div>${freqExisting}</div></td></tr>`;
                } else { // old frequency wasn't correct
                    let freqOld = fields.FrequencyInnocent.value;
                    // escape html
                    freqOld = freqOld.replaceAll("&","&amp;").replaceAll("<","&lt;");
                    tableHtmlChanges += "<tr>" +
                        `<td>${front}</td>` +
                        `<td>${freqInnocent}</td>` +
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
        this.freqNewBoxHeader.innerText = "Notes where frequency will be newly added: " +
            `(${freqNewlyAddedCount} total)`;
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

        this.noFreqFoundBoxHeader.innerText = "Notes where no frequency was found in InnocentCorpus: " +
            `(${noFreqFoundCount} total)`;
        if (noFreqFoundCount > 0) {
            this.noFreqFoundBox.innerHTML = tableHtmlNoFreqFound;
            this.noFreqFoundBox.classList.add("expand");
        } else {
            this.noFreqFoundBox.classList.remove("expand");
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
                    "\n Also, have you installed the addon AnkiConnect? See Usage information above.";
                self.infoBox.classList.remove("expand");
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
            xhr.send(JSON.stringify({action, version, params}));
        });
    }

    clearResultsBoxes() {
        this.changesBox.innerHTML = "";
        this.noFreqFoundBox.innerHTML = "";
        this.freqNewBox.innerHTML = "";
        this.noChangesBox.innerHTML = "";
    }

    // stripHtml(htmlString) {
    //     let tmp = document.createElement("DIV");
    //     tmp.innerHTML = htmlString;
    //     return tmp.textContent || tmp.innerText || "";
    // }
}

// this is like $(document).ready with jquery
document.addEventListener("DOMContentLoaded", function(event) { 
    const inserter = new FrequencyInserter();
    inserter.setupHtmlElements();
    window.ankiInserter = inserter; // for console access like changing AnkiConnect url/port
});
