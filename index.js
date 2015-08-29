import 'babelify/polyfill';
import Emitter from 'events';
import Keyboard from 'piano-keyboard';
import extend from 'xtend/mutable';
import audioContext from 'audio-context';
import sameMembers from 'same-members';
import qwertyStream from 'midi-qwerty-keys';
import uniqRandom from 'unique-random';
import key from 'piano-key';


/**
 * Piano-game component constructor
 */
class Game extends Emitter {
	constructor (options) {
		super();

		var self = this;

		extend(self, options);

		//ensure element
		if (!self.element) {
			self.element = document.createElement('div');
		}

		//ensure context
		if (!self.context) {
			self.context = audioContext;
		}

		//create stave
		self.stave = self.createStave(options.stave);

		//create kbd
		self.keyboard = self.createKeyboard(options.keyboard);

		//reassign own range, cause piano casts it to numbers
		// self.range = self.range.map(key.getNumber);

		//ask the first question
		self.question = self.generateQuestion();
		self.showQuestion(self.question);
	}


	/**
	 * Create staff based off options
	 *
	 * @param {[type]} options [description]
	 *
	 * @return {[type]} [description]
	 */
	createStave (options) {
		var self = this;

		var el = document.createElement('div');
		el.className = 'piano-game-score';

		el.innerHTML = `
			<div class="piano-game-stave" data-stave>
				<span class="piano-game-clef piano-game-clef-treble"></span>
				<span class="piano-game-clef piano-game-clef-bass"></span>
			</div>
		`;

		self.staveElement = el.querySelector('[data-stave]');

		//create lines
		var positionEl = document.createElement('div');
		positionEl.className = 'piano-game-position';

		var pos = key.getOctave(self.range[0]);

		for (var i = self.range[1]; i >= self.range[0]; i--) {
			//ignore black keys
			if (key.isBlack(i)) continue;

			var posEl = positionEl.cloneNode();
			posEl.setAttribute('data-position', i);


			if (!(pos++ % 2)) {
				posEl.classList.add('piano-game-position-space');
			}
			else {
				if (i === 40 || i > 57 || i < 23) {
					posEl.classList.add('piano-game-position-ledger');
					posEl.setAttribute('data-ledger', true);
				}
				else {
					posEl.classList.add('piano-game-position-line');
				}
			}

			posEl.setAttribute('data-position-sharp', i+1);
			posEl.setAttribute('data-position-flat', i-1);

			self.staveElement.appendChild(posEl)
		}

		self.element.appendChild(el);

		return el;
	}


	/**
	 * Create keyboard based off options
	 *
	 * @param {[type]} options [description]
	 *
	 * @return {[type]} [description]
	 */
	createKeyboard (options) {
		var self = this;

		// create element
		var el = document.createElement('div');
		el.className = 'piano-game-keyboard';

		// get options
		options = extend({
			range: ['c4', 'c5'],
			element: el
		}, options);

		var keyboard = new Keyboard(options);

		//insert element
		self.element.appendChild(keyboard.element);
		keyboard.update();


		// make sound
		keyboard.on('noteOn', function ({which, value, target}) {
			self.highlightNote(which);

			if (!self.checkAnswer(keyboard.activeNotes)) {
				target.classList.add('piano-keyboard-key-wrong');
			} else {
				target.classList.add('piano-keyboard-key-right');
				self.indicateCorrectAnswer(function () {
					self.clearNotes();
					self.question = self.generateQuestion();
					self.showQuestion(self.question);
				});
			}
		});

		keyboard.on('noteOff', function ({which, value, target}) {
			self.unhighlightNote(which);

			self.checkAnswer(keyboard.activeNotes);
		});

		//pipe qwerty keys to piano
		qwertyStream({
			mode: 'piano',
			offset: keyboard.range[0]
		}).pipe(keyboard);

		//TODO: make piano accept MIDI-input

		return keyboard;
	}


	/**
	 * Test passed notes on correctness to the question
	 */
	checkAnswer (notes) {
		var self = this;

		//check by octaves
		var answerNotes = [...notes].map(key.getNote);
		var questionNotes = [...self.question.notes].map(key.getNote);

		if (sameMembers(answerNotes, questionNotes)) {
			return true;
		}

		else {
			return false;
		}
	}


	/**
	 * Schedule indication of a question
	 */
	showQuestion (question) {
		var self = this;

		self.clearAnswerIndication();

		//TODO: generate proper chords
		self.showNotes(question.notes)

		return self;
	}


	/**
	 * Expose note[s] on a stave
	 */
	showNotes (notes) {
		var self = this;

		var note = notes[0];

		var noteElement = document.createElement('div');
		noteElement.className = 'piano-game-note';
		noteElement.setAttribute('data-note', note);

		var isSharp = false;
		var notePosition = self.stave.querySelector(`[data-position="${ note }"]`);

		//if no space found for an element - sharpen it
		if (!notePosition) {
			isSharp = true;
			notePosition = self.stave.querySelector(`[data-position-sharp="${ note }"]`);
			noteElement.setAttribute('data-sharp', true);
			noteElement.classList.add('piano-game-note-sharp');
		}
		notePosition.appendChild(noteElement);

		//hide all ledger lines
		[...self.stave.querySelectorAll('[data-ledger]')].forEach(function (ledger) {
			ledger.classList.remove('piano-game-position-ledger-visible');
		});

		//show ledger lines
		if (note > 57) {
			for ( var i = 50; i <= note + (isSharp ? 1 : 0); i++) {
				var ledger = self.stave.querySelector(`[data-ledger][data-position="${ i }"]`);
				if (ledger) ledger.classList.add('piano-game-position-ledger-visible');
			}
		}
		else if (note <= 23) {
			for ( var i = 28; i >= note - (isSharp ? 1 : 0); i--) {
				var ledger = self.stave.querySelector(`[data-ledger][data-position="${ i }"]`);
				if (ledger) ledger.classList.add('piano-game-position-ledger-visible');
			}
		}
		else if (note === 40 || note === 41) {
			self.stave.querySelector('[data-position="40"]').classList.add('piano-game-position-ledger-visible');
		}

		return self;
	}


	/**
	 * Remove all notes from stave
	 */
	clearNotes () {
		var self = this;

		var notes = [...self.stave.querySelectorAll(`[data-note]`)].forEach(function (note) {
				note.parentNode.removeChild(note);
			});

		//remove classes from the keyboard keys
		self.keyboard.noteElements.forEach(function (el) {
			el.classList.remove('piano-keyboard-key-right');
			el.classList.remove('piano-keyboard-key-wrong');
		});

		return self;
	}


	/**
	 * Show visually proper answer, invoke callback after delay
	 */
	indicateCorrectAnswer (callback) {
		var self = this;

		self.stave.querySelector('[data-note]').classList.add('piano-game-note-right');

		setTimeout(function () {
			callback.call(self);
		}, 1000);

		return self;
	}


	/**
	 * Show answer no more
	 */
	clearAnswerIndication () {
		var self = this;

		//TODO

		return self;
	}


	/**
	 * Generate a new question object
	 */
	generateQuestion () {
		var self = this;

		var question = {};

		question.notes = self.generateNotes(
			Math.ceil(Math.random() * self.maxNotes),
			self.range
		);

		//FIXME: what else to add to the question?

		return question;
	}


	/**
	 * Generate @number random notes within the @range
	 */
	generateNotes (number, range) {
		var self = this;

		var res = [];

		var random = uniqRandom(range[0], range[1]);

		for (var i = 0; i < number; i++) {
			res.push( random() );
		}

		return res;
	}


	/**
	 * Highlight specific note on a staff
	 */
	highlightNote (note) {
		var self = this;

		// var highlightedNote = self.noteElement.cloneNode(true);
		// highlightedNote.setAttribute('data-note', note);
		// highlightedNote.classList.add('piano-game-note-active');

		// self.stave.querySelector(`[data-position="${note}"]`).appendChild(highlightedNote);

		return self;
	}


	/**
	 * Clear highlight of a note on a staff
	 */
	unhighlightNote (note) {
		var self = this;

		// var noteEl = self.stave.querySelector(`[data-note="${note}"]`);

		// if (noteEl) {
		// 	noteEl.parentNode.removeChild(noteEl);
		// }

		return self;
	}


	/**
	 * Start game
	 */
	start () {
		var self = this;

		return self;
	}


	/**
	 * Update appearance: sizes etc
	 */
	update () {
		var self = this;

		self.keyboard.update();
	}
}


/** Require octave during the answer */
Game.prototype.requireOctave = false;


/** Max number of notes to ask */
Game.prototype.maxNotes = 1;


/** Default range to generate notes between */
Game.prototype.range = [key.getNumber('a1'), key.getNumber('e6')];


export default Game;