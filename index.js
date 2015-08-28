import Emitter from 'events';
import Keyboard from 'piano-keyboard';
import extend from 'xtend/mutable';
import audioContext from 'audio-context';
import sameMembers from 'same-members';
import qwertyStream from 'midi-qwerty-keys';
import uniqRandom from 'unique-random';
import key from 'piano-key';
import slice from 'sliced';


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
			<div class="piano-game-stave">
				<ul class="piano-game-lines">
					<li class="piano-game-space piano-game-gap" data-space="57"></li>
					<li class="piano-game-space piano-game-ledger" data-space="56" data-ledger></li>
					<li class="piano-game-space piano-game-gap" data-space="55"></li>
					<li class="piano-game-space piano-game-ledger" data-space="54" data-ledger></li>
					<li class="piano-game-space piano-game-gap" data-space="53"></li>
					<li class="piano-game-space piano-game-ledger" data-space="52" data-ledger></li>
					<li class="piano-game-space piano-game-gap" data-space="51"></li>
					<li class="piano-game-space piano-game-line" data-space="50"></li>
					<li class="piano-game-space piano-game-gap" data-space="49"></li>
					<li class="piano-game-space piano-game-line" data-space="48"></li>
					<li class="piano-game-space piano-game-gap" data-space="47"></li>
					<li class="piano-game-space piano-game-line" data-space="46"></li>
					<li class="piano-game-space piano-game-gap" data-space="45"></li>
					<li class="piano-game-space piano-game-line" data-space="44"></li>
					<li class="piano-game-space piano-game-gap" data-space="43"></li>
					<li class="piano-game-space piano-game-line" data-space="42"></li>
					<li class="piano-game-space piano-game-gap" data-space="41"></li>
					<li class="piano-game-space piano-game-ledger" data-space="40" data-ledger><span class="piano-game-note" data-note>&#x1D15D</span></li>
					<li class="piano-game-space piano-game-gap" data-space="39"></li>
					<li class="piano-game-space piano-game-line" data-space="38"></li>
					<li class="piano-game-space piano-game-gap" data-space="37"></li>
					<li class="piano-game-space piano-game-line" data-space="36"></li>
					<li class="piano-game-space piano-game-gap" data-space="35"></li>
					<li class="piano-game-space piano-game-line" data-space="34"></li>
					<li class="piano-game-space piano-game-gap" data-space="33"></li>
					<li class="piano-game-space piano-game-line" data-space="32"></li>
					<li class="piano-game-space piano-game-gap" data-space="31"></li>
					<li class="piano-game-space piano-game-line" data-space="30"></li>
					<li class="piano-game-space piano-game-gap" data-space="29"></li>
					<li class="piano-game-space piano-game-ledger" data-space="28" data-ledger></li>
					<li class="piano-game-space piano-game-gap" data-space="27"></li>
					<li class="piano-game-space piano-game-ledger" data-space="26" data-ledger></li>
					<li class="piano-game-space piano-game-gap" data-space="25"></li>
					<li class="piano-game-space piano-game-ledger" data-space="24" data-ledger></li>
					<li class="piano-game-space piano-game-gap" data-space="23"></li>
				</ul>
				<span class="piano-game-clef piano-game-clef-treble">&#x1D11E;</span>
				<span class="piano-game-clef piano-game-clef-bass">&#x1D122;</span>
			</div>
		`;

		self.noteElement = el.querySelector('[data-note]');

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
		keyboard.on('noteOn', function () {
			self.highlightNotes(keyboard.activeNotes);

			self.checkAnswer(keyboard.activeNotes);
		});

		keyboard.on('noteOff', function () {
			self.unhighlightNotes();

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
	checkAnswer (answerNotes) {
		var self = this;

		//FIXME: check by octaves, if needed
		if (sameMembers(answerNotes, self.question.notes)) {
			self.indicateCorrectAnswer();
			self.question = self.generateQuestion();
			self.showQuestion(self.question);
		}

		else {

		}

		return self;
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

		var noteSpace = self.stave.querySelector('[data-space="' + note + '"]');
		noteSpace.appendChild(self.noteElement);

		//hide all ledger lines
		slice(self.stave.querySelectorAll('[data-ledger]')).forEach(function (ledger) {
			ledger.classList.remove('piano-game-ledger-visible');
		});

		//show ledger lines
		if (note > 50) {
			for ( var i = 50; i <= note; i +=2) {
				self.stave.querySelector('[data-space="' + i + '"]').classList.add('piano-game-ledger-visible');
			}
		}
		else if (note <= 28) {
			for ( var i = 28; i >= note; i -=2) {
				self.stave.querySelector('[data-space="' + i + '"]').classList.add('piano-game-ledger-visible');
			}
		}
		else if (note === 40) {
			self.stave.querySelector('[data-space="40"]').classList.add('piano-game-ledger-visible');
		}
		console.log(note)

		return self;
	}


	/**
	 * Show visually, play nice sound
	 */
	indicateCorrectAnswer () {
		var self = this;

		//TODO

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
			Math.ceil(Math.random() * (self.maxNotes - 1)),
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
	highlightNotes (note) {
		var self = this;

		return self;
	}


	/**
	 * Clear highlight of a note on a staff
	 */
	unhighlightNotes (note) {
		var self = this;

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
Game.prototype.maxNotes = 3;


/** Default range to generate notes between */
Game.prototype.range = [23, 57];


export default Game;