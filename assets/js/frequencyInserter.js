class FrequencyInserter {
    ankiConnectVersion = 6;
    frequencyFieldName = "FrequencyInnocent";
    ankiConnectUrl = "http://localhost:8765";
    ankiQueryAddition = ""; // modifies the anki query, e.g. this could be "deck:MyJPDeck".
    notesToChange = [];
    notesNoChanges = [];
    notesWithoutFreq = [];
    notesWithChanges = [];
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

    FrequencyInserter() {}

    setupHtmlElements() {
        const connectBtn = document.getElementById("connectBtn");
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
        connectBtn.onclick = async function() {
            await self.connectClick();
            //await self.testEmptyCardsError();
        };
    }

    async connectClick() {
        const noteIds = await this.findNotes(`${this.ankiQueryAddition.trim()} ${this.frequencyFieldName}:*`);
        const notes = await this.notesInfo(noteIds);
        console.log("total notes found: " + notes.length);
        this.processNotes(notes);
    }

    processNotes(notes) {
        let noChangesNotes = [];
        this.notesWithChanges = [];
        this.notesWithoutFreq = [];
        let totalNotesWithFrequencyExisting = 0;
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
            totalNotesWithFrequencyExisting++;

            const freqExisting = fields[this.frequencyFieldName].value;
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
                    const noteToChange = {
                        front: front,
                        freqOld: freqOld,
                        freqNew: freqInnocent
                    };
                    tableHtmlChanges += "<tr>" +
                        `<td>${front}</td>` +
                        `<td>${noteToChange.freqNew}</td>` +
                        `<td>${noteToChange.freqOld}</td>` +
                        "</tr>";
                    
                    this.notesWithChanges.push(noteToChange);
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
                    "\n Also, have you allowed the source (e.g. localhost:8000) in the AnkiConnect config?";
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
