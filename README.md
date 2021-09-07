# Anki Frequency Inserter
Inserts Japanese word frequencies from the InnocentCorpus into your Anki notes/cards.

Live here: https://sschmidtu.github.io/anki-frequency-inserter/

![image](https://user-images.githubusercontent.com/33069673/132144055-5148a73e-eeae-4466-9b20-fb1076d0edb5.png)
[Bigger screenshot without UI elements cut out](https://user-images.githubusercontent.com/33069673/132140807-6a817ef8-d402-4826-9564-1947b5df50b1.png)

## Usage

Have Anki running and the [AnkiConnect Addon](https://ankiweb.net/shared/info/2055492159) installed.<br><br>
**Just click 'Connect to AnkiConnect' (which won't do any changes yet)**, and accept the connection in Anki.<br>
This will show you which notes the script will update, after you **click 'Execute changes'**.

**The frequency field in your Anki notes should be called `FrequencyInnocent`**,<br>
otherwise go into the console and change `ankiInserter.ankiFrequencyFieldName` and `ankiInserter.ankiSearchQuery`.<br>
You can also set `ankiInserter.ankiQueryAddition` e.g. to `Front:私` to limit what cards are updated (e.g. for testing).<br>

## Disclaimer

This script should be very safe, it only updates the frequency field of notes (cards), if it already exists.<br>
**Still, even though this script is safe, please back up your Anki collection via File -> Export beforehand. It's good practice anyways.** Use the script at your own risk, i will not be responsible for changes to your Anki decks.

## Technical information
AnkiConnect API see [here](https://github.com/FooSoft/anki-connect) or [here (in color)](https://foosoft.net/projects/anki-connect/).<br>
The only action this script uses that can change your cards/notes is `updateNoteFields` (technically, also `multi`, which here includes multiple `updateNoteFields` requests). And it only changes the field that's contained in the request, namely the frequency field.

Locally, due to CORS, this only seems to work when hosted on a (local) server, e.g. with python3:<br>
`python -m http.server`<br>
Here, you may have to add `localhost:8000` to the `webCorsOriginList` in the AnkiConnect config,<br>
if `requestPermission` fails (happens on clicking 'Connect').
