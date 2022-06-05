# Anki Frequency Inserter
Inserts Japanese word frequencies into your [Anki](https://apps.ankiweb.net/) flashcards from the [InnocentCorpus](https://foosoft.net/projects/yomichan/), a corpus of 5000+ books.

Live here: https://sschmidtu.github.io/anki-frequency-inserter/

*[Version using BCCWJ corpus (~5.8MB)](https://sschmidtu.github.io/anki-frequency-inserter/index_BCCWJ.html?expressionFieldName=Expression&frequencyFieldName=FrequencyBCCWJ) (Contemporary Written Japanese, relative instead of absolute frequency: 100 = 100th most common word)*

![image](https://user-images.githubusercontent.com/33069673/132860267-ddff3b33-4699-42e5-8120-5a4e24f6667d.png)
(some UI elements were cut out of the screenshot for simplicity)

**The frequency number just tells you how often the word occurs** in the corpus of ~5000 books, you'll learn to judge it.<br>
Anything over 10k is very common, below 100 is rather rare, but can still be useful (私: ~900k, 新聞: ~30k, とろ火: 72).<br>

Also, since the frequencies are purely from books, they aren't universal. You probably won't find internet lingo here.<br>
I'm open to replacing the frequency corpus or at least offering another corpus additionally.

## Usage

Have Anki running and the [AnkiConnect Addon](https://ankiweb.net/shared/info/2055492159) installed.<br><br>
**Just click 'Connect to AnkiConnect' (which won't do any changes yet)**, and accept the connection in Anki.<br>
This will show you which notes the script will update, after you **click 'Execute changes'**.<br>

**Note that this currently does not work in Chrome online.** If you want to use this in Chrome, you have to download it and run it offline, see Troubleshooting section.

*For the technically minded: In the browser console, you can set `ankiInserter.ankiQueryAddition` e.g. to `Front:私` or `Expression:*ている*` to limit what cards are updated (e.g. for testing).*

## Requirements
* The Anki addon [AnkiConnect](https://ankiweb.net/shared/info/2055492159) needs to be installed (which should already be the case if you use [Yomichan](https://foosoft.net/projects/yomichan/)).
* Anki needs to be running.
* **The Anki browse window should be closed**, as tempting as it is to check the changes immediately.
I think the worst that can happen is that the currently opened card will not be updated. I tested this with ~900 changes and the rest was fine.
* **Your notes need to have a field *FrequencyInnocent* or similar** (you can change that name in the “frequency field” option near the top)<br>
If your notes don't have that field yet, you can add it in Anki via Tools -> Manage Note Types -> Fields.<br>
*Note that if you use Sync in Anki, adding a field to your notes requires a full upload to AnkiWeb for the next Sync.*

## Troubleshooting

* **For me this currently only works offline, not online in Chrome online due to CORS / Private Network Access changes in Chrome.**
  * To download the "offline version", just download this repository: At the top of this page, click Code -> Download ZIP. Extract it to a folder, then open one of the index.html files (BCCWJ uses the BCCWJ corpus with relative frequency, instead of the InnocentCorpus)
  * see https://developer.chrome.com/blog/private-network-access-preflight/
  * It still works offline in Chrome (see below), and used to work online in Firefox and Edge for a while. For another person it worked online in Linux Mint + Firefox.
  * A solution to this would be patching AnkiConnect to add a setting in the config to set the `Access-Control-Allow-Private-Network` header to true.
* If you're running this offline with a URL like file:// and getting an error like `Access to XMLHttpRequest at 'http://localhost:8765/' from origin 'null' has been blocked by CORS policy`, try this:
  * In Anki -> Tools -> Addons -> AnkiConnect -> Config, try adding `,"null"` to "webCorsOriginList", e.g.: `"webCorsOriginList": ["http:localhost", "null"]`
  * if that doesn't work, if using Chrome, try starting it with the command parameter --allow-file-access-from-files
  * Note that CORS offline support is limited.


## Disclaimer

This script should be very safe, it only updates the frequency field of notes (cards), if it already exists.<br>
**Still, even though this script is safe, please back up your Anki collection via File -> Export beforehand. It's good practice anyways.** Use the script at your own risk, I will not be responsible for changes to your Anki decks.

## Using this to sort/search your Anki cards by frequency in *Browse*

You can either use another addon like [Advanced Browser](https://ankiweb.net/shared/info/874215009) to be able to sort by custom fields:
![image](https://user-images.githubusercontent.com/33069673/132285260-3723586f-44a9-4095-8b13-e4e0318c9f53.png)

Or if you just want to search without sorting or addons, you can use a query like `deck:Yomichan FrequencyInnocent:9___` (3 underscores) which will find all cards with frequency 9xxx. (Or for frequency >10k: `_____*` (5 underscores + `*` wildcard)

To learn the most frequent words first, what i do is select some cards -> right click -> Reschedule / Set Due Date -> place in review queue (0/0).<br>
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

Uses [InnocentCorpus](https://foosoft.net/projects/yomichan/), a corpus of 5000+ books, which was bundled into a .js (~4.35MB, 1.9MB zipped) in `assets/js`.<br>
This means that the first visit to the website takes ~1.9MB of bandwidth (~5.8MB for BCCWJ version).

If you want to run this locally, this seems to work just by opening the index.html,
however the permission in AnkiConnect will be called "null". Also, there might be CORS issues.<br>
It's recommended to run a (local) server, e.g. with python3:<br>
`python -m http.server`<br>
The `requestPermission` call should add `localhost:8000` to the `webCorsOriginList` in the AnkiConnect config. (happens on clicking 'Connect')
