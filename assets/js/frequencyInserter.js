class FrequencyInserter {
    ankiConnectVersion = 6;
    responseBox;
    noChangesBox;
    noChangesBoxHeader;

    FrequencyInserter() {

    }

    setupHtmlElements() {
        const connectBtn = document.getElementById("connectBtn");
        const self = this;
        this.responseBox = document.getElementById("ankiConnectResponseBox");
        this.noChangesBox = document.getElementById("noChangesBox");
        this.noChangesBoxHeader = document.getElementById("noChangesBoxHeader");
        connectBtn.onclick = async function() {
            const promise = self.apiRequest("deckNamesAndIds");
            promise.then(response => {
                const decks = Object.keys(response);
                console.dir(decks);
                self.responseBox.innerText = JSON.stringify(response, null, 2);
            }, err => console.log(err));
            // self.apiRequest("findCards", {"query": "deck:Yomichan FrequencyInnocent:____"})
            //     .then(response => {
            //         self.noChangesBox.innerText = JSON.stringify(response, null, 2);
            //     });
            const noteIds = await self.findNotes("FrequencyInnocent:_*");
            //self.noChangesBox.innerText = noteIds.toString();
            console.log("noteIds: ");
            console.dir(noteIds);
            const notes = await self.notesInfo(noteIds);
            console.log("notes:");
            console.dir(notes);
            let alreadyFieldText = "";
            let totalNotesWithFrequencyExisting = 0;
            for (const note of notes) {
                const fields = note.fields;
                if (note.fields) {
                    alreadyFieldText +=
                        "Front: " + fields?.Front.value + "\t" +
                        "FrequencyInnocent: " + fields?.FrequencyInnocent.value +
                        "\n";
                    totalNotesWithFrequencyExisting++;
                } else {
                    console.log("incomplete note:");
                    console.dir(note);
                }
                self.noChangesBoxHeader.innerText = "Cards that already have a frequency " +
                    "(" + totalNotesWithFrequencyExisting + " total)";
            }
            self.noChangesBox.innerText = alreadyFieldText;
            self.noChangesBox.classList.add("filled");
        };
    }

    async findNotes(query) {
        const response = await this.apiRequest("findCards", {"query": query});
        return response.result; // list of ids
    }

    async notesInfo(noteIds) {
        const response = await this.apiRequest("notesInfo", {"notes": noteIds});
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
            xhr.addEventListener('error', () => reject('failed to issue request'));
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
}

document.addEventListener("DOMContentLoaded", function(event) { 
    const inserter = new FrequencyInserter();
    inserter.setupHtmlElements();
});
