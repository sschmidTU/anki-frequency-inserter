class FrequencyInserter {
    ankiConnectVersion = 6;
    responseBox;
    notesFreqNewBox;
    notesFreqNewBoxHeader;
    noChangesBox;
    noChangesBoxHeader;
    changesBox;
    changesBoxHeader;
    notesToChange = [];
    notesNoChanges = [];
    notesWithoutFreq = [];
    frequencyFieldName = "FrequencyInnocent";

    notesWithChanges = [];

    FrequencyInserter() {}

    setupHtmlElements() {
        const connectBtn = document.getElementById("connectBtn");
        const self = this;
        this.responseBox = document.getElementById("ankiConnectResponseBox");
        this.notesFreqNewBox = document.getElementById("notesFreqNewBox");
        this.notesFreqNewBoxHeader = document.getElementById("notesFreqNewBoxHeader");
        this.noChangesBox = document.getElementById("noChangesBox");
        this.noChangesBoxHeader = document.getElementById("noChangesBoxHeader");
        this.changesBox = document.getElementById("changesBox");
        this.changesBoxHeader = document.getElementById("changesBoxHeader");
        connectBtn.onclick = async function() {
            await self.connectClick();
            //await self.testEmptyCardsError();
        };
    }

    async testEmptyCardsError() {
        const noteIds = await this.findNotes("負う");
        console.log("noteIds 負う:");
        console.dir(noteIds);
        const notes = await this.notesInfo(noteIds);
        console.log("note 負う:");
        console.dir(notes[0]);
    }

    async connectClick() {
        const promise = this.apiRequest("deckNamesAndIds");
        promise.then(response => {
            const decks = Object.keys(response);
            console.dir(decks);
            //this.responseBox.innerText = JSON.stringify(response, null, 2);
        }, err => console.log(err));
        // self.apiRequest("findCards", {"query": "deck:Yomichan FrequencyInnocent:____"})
        //     .then(response => {
        //         self.noChangesBox.innerText = JSON.stringify(response, null, 2);
        //     });
        const noteIds = await this.findNotes(`${this.frequencyFieldName}:*`);
        //self.noChangesBox.innerText = noteIds.toString();
        console.log("noteIds: ");
        console.dir(noteIds);
        const notes = await this.notesInfo(noteIds);
        console.log("notes:");
        console.dir(notes);
        this.processNotes(notes);
    }

    processNotes(notes) {
        let noChangesNotes = [];
        this.notesWithChanges = [];
        this.notesWithoutFreq = [];
        let totalNotesWithFrequencyExisting = 0;
        const correctFrequencyRegex = /^[0-9]+$/;
        let tableHtmlNew = "<table><tbody><tr class='trHeader'><td><div>Front</div></td><td><div>Frequency</div></td></tr>";
        let tableHtmlNoChanges = "<table><tbody><tr class='trHeader'><td>Front</td><td>Frequency</td></tr>";
        let tableHtmlChanges = "<table><tbody><tr class='trHeader'>" +
            "<td>Front</td>" +
            "<td>FrequencyNew</td>" +
            "<td>FrequencyOld</td>" +
            "</tr>";
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
            //front = front.replaceAll("<","\&lt;");
            //front = front.replaceAll("&","\&amp;");
            if (freqExisting === "") {
                this.notesWithoutFreq.push(note);
                tableHtmlNew += `<tr><td><div>${front}</div></td><td><div>${freqExisting}</div></td></tr>`;
            } else if (correctFrequencyRegex.test(freqExisting)) {
                noChangesNotes.push(note);
                tableHtmlNoChanges += `<tr><div><td>${front}</div></td><td><div>${freqExisting}</div></td></tr>`;
            } else {
                const noteToChange = {
                    front: front,
                    frequencyOld: fields.FrequencyInnocent.value,
                    frequencyNew: fields.FrequencyInnocent.value // TODO import from innocent
                };
                tableHtmlChanges += "<tr>" +
                    `<td>${front}</td>` +
                    `<td>${freqExisting}</td>` +
                    `<td>${noteToChange.frequencyNew}</td>` +
                    "</tr>"
                
                this.notesWithChanges.push(noteToChange);
            }
        }
        tableHtmlNoChanges += "</tbody></table>";
        tableHtmlChanges += "</tbody></table>";
        tableHtmlNew += "</tbody></table>";
        this.notesFreqNewBox.innerHTML = tableHtmlNew;
        this.notesFreqNewBoxHeader.innerText = "Notes where frequency will be newly added: " +
            `(${this.notesWithoutFreq.length} total)`;
        this.notesFreqNewBox.classList.add("filled");

        //this.noChangesBox.innerText = noChangesBoxText;
        noChangesBox.innerHTML = tableHtmlNoChanges;
        this.noChangesBoxHeader.innerText = "Notes that already have the correct frequency: " +
            `(${noChangesNotes.length} total)`;
        this.noChangesBox.classList.add("filled");

        this.changesBox.innerHTML = tableHtmlChanges;
        this.changesBoxHeader.innerText = "Notes where frequency will be changed: " +
            `(${this.notesWithChanges.length} total)`;
        this.changesBox.classList.add("filled");
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
                self.responseBox.innerText = "connection to AnkiConnect failed. Have you started Anki?";
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
    
            xhr.open('POST', 'http://localhost:8765');
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
});
