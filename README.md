# Anki Frequency Inserter
Inserts Japanese word frequencies into your Anki notes/cards from the [InnocentCorpus](https://foosoft.net/projects/yomichan/), a corpus of 5000+ books.

Live here: https://sschmidtu.github.io/anki-frequency-inserter/

![image](https://user-images.githubusercontent.com/33069673/132389861-aeccf31a-6040-450c-a962-b905f866538e.png)
[Bigger screenshot without UI elements cut out](https://user-images.githubusercontent.com/33069673/132140807-6a817ef8-d402-4826-9564-1947b5df50b1.png)

## Usage

Have Anki running and the [AnkiConnect Addon](https://ankiweb.net/shared/info/2055492159) installed.<br><br>
**Just click 'Connect to AnkiConnect' (which won't do any changes yet)**, and accept the connection in Anki.<br>
This will show you which notes the script will update, after you **click 'Execute changes'**.

## Requirements
* The Anki addon [AnkiConnect](https://ankiweb.net/shared/info/2055492159) needs to be installed (which should already be the case if you use [Yomichan](https://foosoft.net/projects/yomichan/)).
* Anki needs to be running.
* **The Anki browse window should be closed**, as tempting as it is to check the changes immediately.
I think the worst that can happen is that the currently opened card will not be updated. I tested this with ~900 changes and the rest was fine.
* **Your notes need to have a field *FrequencyInnocent***<br>
If your notes don't have that field yet, you can add it in Anki via Tools -> Manage Note Types -> Fields.<br>
*Note that if you use Sync in Anki, adding a field to your notes requires a full upload to AnkiWeb for the next Sync.*
  * You can change the field name if you're technically minded / can use the browser console:<br>
Go into the console and change `ankiInserter.ankiFrequencyFieldName`, and `ankiInserter.ankiSearchQuery` accordingly.<br>
You can also set `ankiInserter.ankiQueryAddition` e.g. to `Front:私` to limit what cards are updated (e.g. for testing).

## Disclaimer

This script should be very safe, it only updates the frequency field of notes (cards), if it already exists.<br>
**Still, even though this script is safe, please back up your Anki collection via File -> Export beforehand. It's good practice anyways.** Use the script at your own risk, i will not be responsible for changes to your Anki decks.

## Using this to sort/search your Anki cards by frequency in *Browse*

You can either use another addon like [Advanced Browser](https://ankiweb.net/shared/info/874215009) to be able to sort by custom fields:
![image](https://user-images.githubusercontent.com/33069673/132285260-3723586f-44a9-4095-8b13-e4e0318c9f53.png)

Or if you just want to search without sorting or addons, you can use a query like `deck:Yomichan FrequencyInnocent:9___` (3 underscores) which will find all cards with frequency 9xxx. (Or for frequency >10k: `_____*` (5 underscores + `*` wildcard)

To learn the most frequent words first, what i do is select some cards -> right click -> Reschedule -> place in review queue (0/0).<br>
*There's probably a smarter way, since this makes the first interval 3 days for me, so i have to mark it 'Again' on the first review*

## The problem with Yomichan's frequency export

First of all, [Yomichan](https://foosoft.net/projects/yomichan/) is great, and i'm very thankful for it. It can show word definitions and export them to Anki cards in the browser.<br>
It can also insert frequencies into your Anki card while exporting, but it'll use some ugly HTML, making sorting difficult.<br>
Also, it can't batch edit frequencies into many existing Anki cards at once like this website can do.
![image](https://user-images.githubusercontent.com/33069673/132285597-ab08045f-415a-4707-97a7-cb938cafc3b2.png)

Clicking on + and using the template `{frequencies}` leads to this:

![image](https://user-images.githubusercontent.com/33069673/132285638-33da5509-5cc1-4540-bb98-37848128a6bb.png)

Editing that manually for hundreds of cards is a hassle. That's why i made this script/website.


## Technical information
AnkiConnect API see [here](https://github.com/FooSoft/anki-connect) or [here (in color)](https://foosoft.net/projects/anki-connect/).<br>
The only action this script uses that can change your cards/notes is `updateNoteFields` (technically, also `multi`, which here includes multiple `updateNoteFields` requests). And it only changes the field that's contained in the request, namely the frequency field.

Uses [InnocentCorpus](https://foosoft.net/projects/yomichan/), a corpus of 5000+ books, which was bundled into a .js (~4.35MB) in `assets/js`.<br>
This means that the first visit of the website takes ~4.5MB of bandwidth.

If you want to run this locally, due to CORS, this only seems to work when hosted on a (local) server, e.g. with python3:<br>
`python -m http.server`<br>
Here, you may have to add `localhost:8000` to the `webCorsOriginList` in the AnkiConnect config,<br>
if `requestPermission` fails (happens on clicking 'Connect').
