import Emitter from 'events';
import Keyboard from 'piano-keyboard';
import extend from 'xtend/mutable';
import Vex from 'vexflow';
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
		self.range = self.keyboard.range;

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

		var el = document.createElement('canvas');
		el.className = 'piano-game-stave';
		self.element.appendChild(el);

		var canvas = el;
		self.renderer = new Vex.Flow.Renderer(
			canvas, Vex.Flow.Renderer.Backends.CANVAS);

		var ctx = self.renderer.getContext();

		var style = getComputedStyle(el);

		canvas.width = parseInt(style.width);
		canvas.height = parseInt(style.height);

		self.staveTreble = new Vex.Flow.Stave(0, 0, canvas.width);
		self.staveTreble.addClef("treble").setContext(ctx).draw();

		self.staveBass = new Vex.Flow.Stave(0, 80, canvas.width);
		self.staveBass.addClef("bass").setContext(ctx).draw();

		return canvas;
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
			range: self.range,
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

		//get ctx
		var ctx = self.renderer.getContext();

		// Create a voice in 4/4
		var voice = new Vex.Flow.Voice({
			num_beats: 4,
			beat_value: 4,
			resolution: Vex.Flow.RESOLUTION
		});


		//generate vex notes from question notes
		var vexNotes = [];
		var vexKeys = [];

		for (var i = 0; i < question.notes.length; i++) {
			var note = question.notes[i];
			var noteName = key.getNote(note);
			var noteOctave = key.getOctave(note);

			vexKeys.push(noteName + '/' + noteOctave);
		}

		vexNotes.push(new Vex.Flow.StaveNote({
			keys: vexKeys,
			duration: 'w'
		}));

		// Add notes to voice
		voice.addTickables(vexNotes);

		// Format and justify the notes to 500 pixels
		var formatter = new Vex.Flow.Formatter().format([voice], self.stave.width);

		voice.draw(ctx, self.staveTreble);

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
Game.prototype.range = ['c3', 'c5'];


export default Game;