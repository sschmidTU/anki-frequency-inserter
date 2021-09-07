class FrequencyInserter {
    ankiConnectVersion = 6;
    ankiFrequencyFieldName = "FrequencyInnocent";
    ankiSearchQuery = `${this.ankiFrequencyFieldName}:*`; // can be modified by user. take care to update frequencyFieldName if necessary though
    ankiQueryAddition = ""; // extends the anki query, e.g. this could be "deck:MyJPDeck".
    ankiConnectUrl = "http://localhost:8765";
    notesWithChanges = [];
    notesNoChanges = [];
    notesWithoutFreq = [];
    // HTML stuff
    responseBox;
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
        const self = this;
        this.responseBox = document.getElementById("ankiConnectResponseBox");
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
        const executeBtn = document.getElementById("executeBtn");
        executeBtn.onclick = async function() {
            await self.executeChanges();
        }
    }

    async executeChanges() {
        console.log("notesWithoutFreq:");
        console.dir(this.notesWithoutFreq);
        console.log("notesWithChanges");
        console.dir(this.notesWithChanges);

        let tableHtml = "<table><tbody><tr class='trHeader'>" +
            "<td>Front</td>" +
            "<td>NoteId</td>" +
            "<td>FrequencyNew</td>" +
            "<td>FrequencyOld</td>" +
            "</tr>";

        const actions = [];
        this.notesWithChanges.forEach((note) => tableHtml += this.addActionFromNote(note, actions));
        this.notesWithoutFreq.forEach((note) => tableHtml += this.addActionFromNote(note, actions));
        tableHtml += "</trbody></table>";
        const totalUpdated = actions.length;
        this.updatedBoxHeader.innerText = `Updated: (${totalUpdated} total)`;
        this.updatedBox.innerHTML = tableHtml;
        if (totalUpdated > 0) {
            this.updatedBox.classList.add("filled");
        } else {
            this.updatedBox.classList.remove("filled");
        }
        const params = {
            "actions": actions
        };
        console.log("params being sent to AnkiConnect: ");
        console.dir(params);
        //this.responseBox.innerText = JSON.stringify(params, null, 1);
        this.responseBox.classList.add("filled");
        const response = await this.apiRequest("multi", params);
        console.log("response: ");
        console.dir(response);
        this.responseBox.innerText = JSON.stringify(response, null, 1); // 1: beautify
        this.responseBox.classList.add("filled");
    }

    addActionFromNote(note, actions) {
        const front = note.fields.Front.value;
        const freqNew = innocent_terms_complete[front];
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
            `<td><div>${id}</div></td>` +
            `<td><div>${freqNew}</div></td>` +
            `<td><div>${freqOld}</div></td>` +
            "</tr>";
    }

    async connectClick() {
        const response = await this.apiRequest("requestPermission");
        this.responseBox.innerText = JSON.stringify(response, null, 1);
        this.responseBox.classList.remove("filled"); // keep the box small. not an error.

        if (response?.result?.permission !== "granted") {
            this.responseBox.innerText = "AnkiConnect permission denied after requestPermission request was sent.\n" +
            "Did you deny permission in Anki? Please try again.\n" +
            "Otherwise, you can also go to Tools -> Addons -> AnkiConnect->Config and add" +
            "https://sschmidtu.github.io/ to webCorsOriginList."
            this.responseBox.classList.add("filled");
            return;
        }
        console.log("AnkiConnect permission granted. Finding notes.");
        const noteIds = await this.findNotes(`${this.ankiSearchQuery} ${this.ankiQueryAddition}`);
        const notes = await this.notesInfo(noteIds);
        console.log("Total notes found: " + notes.length);
        this.processNotes(notes);
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
            "<td>Front</td>" +
            "<td>FrequencyNew</td>" +
            "<td>FrequencyOld</td>" +
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
            const freqInnocent = innocent_terms_complete[front];
            if (!(freqInnocent >= 0)) {
                noFreqFoundCount++;
                tableHtmlNoFreqFound += "<tr>" +
                    `<td>${front}</td>` +
                    "</tr>";
            } else if (freqExisting === "") {
                this.notesWithoutFreq.push(note);
                tableHtmlNew += `<tr><td><div>${front}</div></td><td><div>${freqInnocent}</div></td></tr>`;
            } else if (correctFrequencyRegex.test(freqExisting)) {
                noChangesNotes.push(note);
                tableHtmlNoChanges += `<tr><div><td>${front}</div></td><td><div>${freqExisting}</div></td></tr>`;
            } else {
                if (freqInnocent >= 0) {
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
        }
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
            this.freqNewBox.classList.add("filled");
        } else {
            this.freqNewBox.classList.remove("filled");
        }

        const noChangesCount = noChangesNotes.length;
        this.noChangesBoxHeader.innerText = "Notes that already have the correct frequency: " +
            `(${noChangesCount} total)`;
        if (noChangesCount > 0) {
            noChangesBox.innerHTML = tableHtmlNoChanges;
            this.noChangesBox.classList.add("filled");
        } else {
            this.noChangesBox.classList.remove("filled");
        }

        const changesCount = this.notesWithChanges.length;
        this.changesBoxHeader.innerText = "Notes where frequency will be changed: " +
            `(${changesCount} total)`;
        if (changesCount > 0) {
            this.changesBox.innerHTML = tableHtmlChanges;
            this.changesBox.classList.add("filled");
        } else {
            this.changesBox.classList.remove("filled");
        }

        this.noFreqFoundBoxHeader.innerText = "Notes where no frequency was found in InnocentCorpus:" +
            `(${noFreqFoundCount} total)`;
        if (noFreqFoundCount > 0) {
            this.noFreqFoundBox.innerHTML = tableHtmlNoFreqFound;
            this.noFreqFoundBox.classList.add("filled");
        } else {
            this.noFreqFoundBox.classList.remove("filled");
        }
    }

    async findNotes(query) {
        const response = await this.apiRequest("findNotes", {"query": query});
        return response.result; // list of ids
    }

    async notesInfo(noteIds) {
        const response = await this.apiRequest("notesInfo", {"notes": noteIds});
        // TODO add checkbox to toggle displaying this
        //this.responseBox.innerText = JSON.stringify(response.result, null, 2);
        //this.responseBox.classList.add("filled");
        return response.result;
    }

    /** Sends an API request to AnkiConnect via REST (Post).
     * 
     * @param {*} action The action, e.g. 'createDeck'
     * @param {*} version AnkiConnect version used
     * @param {*} params action parameters
     * @returns 
     */
    apiRequest(action, params={}, version=this.ankiConnectVersion) {
        const self = this;
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.addEventListener('error', () => {
                self.responseBox.innerText = "Connection to AnkiConnect failed. Have you started Anki?" +
                    "\n Also, have you installed the addon AnkiConnect? See Usage information above.";
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

    // stripHtml(htmlString) {
    //     let tmp = document.createElement("DIV");
    //     tmp.innerHTML = htmlString;
    //     return tmp.textContent || tmp.innerText || "";
    // }
}

document.addEventListener("DOMContentLoaded", function(event) { 
    const inserter = new FrequencyInserter();
    inserter.setupHtmlElements();
    window.ankiInserter = inserter; // for console access like changing AnkiConnect url/port
});
