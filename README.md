# Anki Frequency Inserter
Inserts Japanese word frequencies from the InnocentCorpus into your Anki notes/cards.

WIP, currently only showing changes, but can't be executed yet:
![image](https://user-images.githubusercontent.com/33069673/132140807-6a817ef8-d402-4826-9564-1947b5df50b1.png)

To prevent a CORS error, you need to add the source from access the index.html (e.g. localhost:8000)
to the "webCorsOriginList" in Anki via Tools -> Addons -> Config on AnkiConnect.

To build innocent_terms_complete.js, execute `node parseCorpus.js` in the extracted innocent terms folder. then put it into assets/js.
(i'm considering adding it to the assets, though it's ~4.4MB right now)

Currently, this only seems to work when hosted on a (local) server, e.g. with python3:<br>
`python -m http.server`<br>
