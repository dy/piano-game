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
		self.range = self.range.map(key.getNumber);

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
		el.className = 'piano-game-stave';
		self.element.appendChild(el);

		var canvas = document.createElement('canvas');
		canvas.className = 'piano-game-stave-canvas';
		el.appendChild(canvas);
		canvas.width = 272;
		canvas.height = 240;

		Vex.Flow.STAVE_LINE_THICKNESS = 1;

		//Create vexflow canvas renderer
		self.renderer = new Vex.Flow.Renderer(
			canvas, Vex.Flow.Renderer.Backends.CANVAS);
		var ctx = self.renderer.getContext();

		//create grand stave
		var topStave =
		self.topStave = new Vex.Flow.Stave(0, 28, canvas.width, {
			fill_style: 'rgba(127,127,127,.5)'
		});
		//clean endlines
		self.topStave.modifiers.length = 0;
		self.topStave.addClef("treble").setContext(ctx).draw();

		var bottomStave =
		self.bottomStave = new Vex.Flow.Stave(0, 89, canvas.width, {
			fill_style: 'rgba(127,127,127,.5)'
		});
		self.bottomStave.modifiers.length = 0;
		self.bottomStave.addClef("bass").setContext(ctx).draw();

		// var brace = new Vex.Flow.StaveConnector(topStave, bottomStave).setType(3); // 3 = brace

		// var lineRight = new Vex.Flow.StaveConnector(topStave, bottomStave).setType(0);
		// var lineLeft = new Vex.Flow.StaveConnector(topStave, bottomStave).setType(1);

		// brace.setContext(ctx).draw();
		// lineRight.setContext(ctx).draw();
		// lineLeft.setContext(ctx).draw();

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

		//FIXME: generate proper chords
		var note = 39//question.notes[0];
		var noteName = key.getNote(note);
		var noteOctave = key.getOctave(note);
		var noteClef = note > key.getNumber('c4') ? 'treble' : 'bass';

		vexNotes.push(new Vex.Flow.StaveNote({
			keys: [noteName + '/' + noteOctave],
			duration: 'w',
			align_center: true,
			clef: noteClef
		}));

		voice.addTickables(vexNotes);

		//Aliging by center is a kinda tricky in vexflow
		var offset = 90;
		var formatter = new Vex.Flow.Formatter().format([voice], self.stave.width - offset, {
		});

		//Choose proper stave
		var stave = noteClef === 'treble' ? self.topStave : self.bottomStave;

		//render a note
		voice.draw(ctx, stave);

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