[The Piano Game](https://dfcreative.github.io/piano-game).

Become a better pianist.


[![npm install piano-game](https://nodei.co/npm/piano-game.png?mini=true)](https://nodei.co/npm/piano-game/)


```js
var PianoGame = require('piano-game');
var audioContext = require('audio-context');

var game = new PianoGame({
	element: document.querySelector('.piano-game'),
	context: audioContext,
	range: ['c2', 'c#3'], //range of keys to ask
	maxNotes: 4, //maximum number of notes in a question
	requireOctave: false //require exact octave for a note
});
```