Module.add( 'script', ()=>{

/*
cast: just the id's of anything - a person, an item, a site, etc.

stateHash: hash of states. Always gets an implicit state called 'complete' if not exists
<state>: array of sequential commands
	- onEvent: <who> <conditional> <finish> <do>(see below)

* onEvent specifies who it applies to, and may be
	- types are onTick, onTalk, onInteract
* conditionals, which can include not:1 include
	- query: (anyId)
		isAt (anyId)
		isState (some state)
		isSstage (some quest stage)
		has (itemId)
		lt: less than
		gt: greater than
	-change - just like any change statement. Will return True on success.
* finish can be
	- goto: <state>
	- exit - to stop processing and exit the dialog
	- deadend - to just stop processing but keep talking

* do [ sequence of commands ]

* commands include
	- journal - alters the journal with done, start and mark
	- pl: what the player says
	- me: what I say
	- if: any conditional... do: ... else: ...
	- choice: n adds a choice to the speech's list of player choices. can combine with "if"
	- ask: n stops adding choices and pauses execution until a choice is made
	- pick: choose one option for an array
	- change(anyId) - pick as target and does an operation upon them
		- ops are gold/amount, setState/st, give/itemId, travelTo/id, talkTo/whom etc.
	- await: [ list of conditionals ] all must be true to continue execution
	  we can even check whether, for example, a character is actually heading for a location...
	- goto 'state'. Clears the EVENT array for current state. (must always end a sequence)
	- exit 'state'  Just like goto, except the leaves the dialog
	- run 'label'. Runs the label named.

EVENTS implement as a great big array. If something has a label then it get kept
instead of getting immediately run.
journal | state | who | onEvent | label | condition | finish | do

COMMANDS also implement as a big array.

Each event keeps its own state.
*/

let Script = {};

Script.Result = {
	ADVANCE: 1,
	AWAIT_REPLY: 2,
	AWAIT_CONDITION: 4,
	END: 8,
	POP: 16 & 1,
};

Script.Command = new function() {
	this.eventIdHash = {
		'talk': 1,
		'tick': 1,
		'trade': 1,
		'hit': 1,
		'suffer': 1
	};

	this.specHash = {
		sGenerator: {
			tString: 'tEntityId',
			tFunction: true
		},
		sCastHash: {
			thisObjectIsKeyValuePairs: true,
			tObject: 'sCastDef',
		},
		sCastDef: {
			tString: 'tEntityId',
			tNull: true
		},
		sFlagHash: {
			thisObjectIsKeyValuePairs: true,
			tObject: 'sFlagDef'
		},
		sFlagDef: {
			tObject: 'commandType:FLAG',
			tArray: 'sConditional',
			tBoolean: true,
			tUndefined: true
		},
		sDeclareHash: {
			thisObjectIsKeyValuePairs: true,
			tObject: 'sDeclareDef'
		},
		sDeclareDef: {
			tArray: 'sCommandBlock'
		},
		sStateHash: {
			thisObjectIsKeyValuePairs: true,
			tObject: 'sStateDef'
		},
		sStateDef: {
			tArray: 'sStateCommandBlock'
		},
		sStateCommandBlock: {
			tObject: 'commandType:STATE',
		},
		sConditional: {
			tBoolean: true,
			tString: 'tFlagId',
			tObject: 'commandType:CONDITIONAL',
			tArray:  'sConditional'
		},
		sCommandBlock: {
			tObject: 'commandType:CMD',
		},
		sDialog: {
			tString: 'tString'
		},
		sQuestStateTarget: {
			tNumber: true,
			tString: 'tStateId',
			tObject: 'tQuestStateId'
		},
	}
	Object.assignIds(this.specHash);

	this.cmdHash = {
		definition: {
			commandKeys: {
				id:			['tString'],
				generator:	'sGenerator',
				cast:		'sCastHash',
				flag:		'sFlagHash',
				priority:	'tPriority',
				declareHash: 'sDeclareHash',
				stateHash:	'sStateHash'
			}
		},
		priority: {
			cmdFn: 'cmdPriority',
			allow: ['DEF','CMD'],
			commandKeys: {
				priority:	['tPriority']
			}
		},
		query: {
			cmdFn: 'cmdQuery',
			allow: ['CONDITIONAL','FLAG'],
			commandKeys: {
				query: 		['tCastId','tFlagId','tJournalId'],
				key:		['tString','tUndefined'],
				eq:			['tString','tNumber','tBoolean','tUndefined'],
				lt:			['tNumber','tUndefined'],
				gt:			['tNumber','tUndefined'],
				lte:		['tNumber','tUndefined'],
				gte:		['tNumber','tUndefined'],
				isAt:		['tCastId','tUndefined'],
				has:		['tCastId','tUndefined'],
				hasState:	['tString','tUndefined'],
				stage:		['tString','tUndefined']
			}
		},
		event: {
			cmdFn: 'cmdEvent',
			allow: ['STATE'],
			commandKeys: {
				event:		['tEventId'],
				to:			['tCastId'],
				label:		['tLabel','tUndefined'],
				do:			'sCommandBlock',
			},
		},
		onEscape: {
			cmdFn: 'cmdOnEscape',
			allow: ['CMD'],
			commandKeys: {
				onEscape: 'sCommandBlock',
			},
		},
		journal: {
			cmdFn: 'cmdJournal',
			allow: ['STATE','CMD'],
			commandKeys: {
				journal:	['tJournalId'],
				done: 		['tJournalStage','tUndefined'],
				start:		['tJournalStage','tUndefined'],
				mark:		['tCastId','tUndefined'],
				complete:	['tBoolean','tUndefined'],
				fail:		['tBoolean','tUndefined'],
			},
		},
		pl: {
			cmdFn: 'cmdPl',
			allow: ['CMD'],
			commandKeys: {
				pl:			['tDialog'],
				do:			'sCommandBlock'
			},
		},
		me: {
			cmdFn: 'cmdMe',
			allow: ['CMD','PICK'],
			commandKeys: {
				me:			['tDialog'],
			},
		},
		say: {
			cmdFn: 'cmdMe',
			allow: ['CMD','PICK'],
			commandKeys: {
				say:		['tCastId'],
				text:		['tDialog'],
			},
		},
		if: {
			cmdFn: 'cmdIf',
			allow: ['STATE','CMD'],
			commandKeys: {
				if: 'sConditional',
				do: 'sCommandBlock',
				else: 'sCommandBlock',
			},
		},
		choice: {
			cmdFn: 'cmdChoice',
			allow: ['CMD'],
			commandKeys: {
				choice:		['tDialog'],
				do:			'sCommandBlock',
			},
		},
		ask: {
			cmdFn: 'cmdAsk',
			allow: ['CMD'],
			commandKeys: {
				ask:		['tTrue'],
			},
		},
		pick: {
			cmdFn: 'cmdPick',
			allow: ['CMD','PICK'],
			commandKeys: {
				pick:		['tPickArray'],
			},
		},
		set: {
			cmdFn: 'cmdSet',
			allow: ['CMD','CONDITIONAL'],
			commandKeys: {
				set:		['tFlagId'],
				value:		['tString','tNumber','tBoolean','tUndefined'],
			},
		},
		change: {
			cmdFn: 'cmdChange',
			allow: ['STATE','CMD','CONDITIONAL'],
			commandKeys: {
				change:		['tCastId'],
				key:		['tString','tUndefined'],
				value:		['tString','tNumber','tBoolean','tUndefined'],
				gold:		['tNumber','tUndefined'],
				give:		['tCastId','tUndefined'],
				travelTo:	['tCastId','tUndefined'],
				talkTo:		['tCastId','tUndefined'],
			},
		},
		await: {
			cmdFn: 'cmdAwait',
			allow: ['CMD'],
			commandKeys: {
				await: 'sConditional',
			},
		},
		goto: {
			cmdFn: 'cmdGoto',
			allow: ['CMD'],
			commandKeys: {
				goto: 'sQuestStateTarget',
			},
		},
		exit: {
			cmdFn: 'cmdExit',
			allow: ['CMD'],
			commandKeys: {
				exit: 'sQuestStateTarget',
			},
		},
		deadend: {
			cmdFn: 'cmdDeadend',
			allow: ['CMD'],
			commandKeys: {
				deadend: ['tNumber']
			}
		},
		run: {
			cmdFn: 'cmdRun',
			allow: ['CMD'],
			commandKeys: {
				run: 'tDeclareId',
			},
		},
		isTimer: {
			cmdFn: 'cmdIsTimer',
			allow: ['FLAG'],
			commandKeys: {
				isTimer:	['tBoolean'],
			},
		},
		timer: {
			cmdFn: 'cmdTimer',
			allow: ['CMD'],
			commandKeys: {
				timer:		['tFlagId'],
				start:		['tNumber']
			},
		},
		fn: {
			cmdFn: 'cmdFn',
			allow: ['FLAG'],
			commandKeys: {
				fn:			['tFunction'],
				cache:		['tBoolean','tUndefined']
			},
		},
	};
	Object.assignIds(this.cmdHash);

	this.cmdFind = (cmd) => {
		for( let commandId in this.cmdHash ) {
			if( cmd[commandId] !== undefined ) {
				return commandId;
			}
		}
		return null;
	}

	return this;
}

Script.Validator = class {
	constructor(world,manager) {
		this.world = world;
		this.manager = manager;
		this.reset();
		this.content = this.setupContent();
	}
	reset() {
		this.definition = null;
		this.cast = null;
		this.flag = null;
		this.stateHash = null;
		this.declareHash = {};

		this.commandContext = {};

		this.trail = [];
		this.error = null;
		this.issueList = [];
	}
	clearCommandContext() {
		for( let key in this.commandContext ) {
			delete this.commandContext[key];
		}
	}
	assert(value,text) {
		if( !value ) {
			let err = text+' in '+this.trail.join('.');
			console.logScriptValidate(err);
			this.issueList.push(err);
			return false;
		}
		return true;
	}
	test(value,text) {
		if( !value ) {
			console.assert(text);
			this.error = this.error || text;
			return false;
		}
		return true;
	}
	getType(value) {
		if( Array.isArray(value) ) return 'tArray';
		if( Object.isObject(value) ) return 'tObject';
		if( value === null ) return 'tNull';
		return 't'+String.capitalize(typeof value);
	}

	setupContent() {
		let priorityValues = { normal: 1, quest: 2 };

		let content = {};
		content.tCastId   = value => this.test( this.cast[value] !== undefined, 'cast "'+value+'" not found' );
		content.tFlagId   = value => this.test( this.flag[value] !== undefined, 'flag "'+value+'" not found' );
		content.tEventId  = value => this.test( Script.Command.eventIdHash[value] !== undefined, 'eventId "'+value+'" not found' );
		content.tEntityId = value => this.test( this.world.find(value), 'entity "'+value+'" not found' );
		content.tTrue     = value => this.test( value===true, 'must be true' );
		content.tBoolean  = value => this.test( value===true || value===false, 'must be boolean' );
		content.tNumber   = value => this.test( Number.isFinite(value), 'must be number' );
		content.tFunction = value => this.test( typeof value === 'function', 'must be function' );
		content.tString   = value => this.test( typeof value === 'string', 'must be string' );
		content.tDialog   = value => this.test( typeof value === 'string', 'dialog must be string' );
		content.tPriority = value => this.test( priorityValues[value] !== undefined, 'bad priority '+value );
		content.tDeclareId  = value => {
			return this.test( this.declareHash[value] !== undefined, 'declrare "'+value+'" not found' );
		}
		content.tStateId  = value => {
			return this.test( this.stateHash[value] !== undefined, 'state "'+value+'" not found' );
		}
		content.tQuestStateId = value => {
			let def = this.manager.getDefinition(value.quest);
			if( !this.test( def, 'Quest "'+value.quest+'" does not exist' ) ) {
				return;
			}
			return this.test( def.stateHash[value.state] !== undefined, 'state "'+value.state+'" not found' );
		}
		content.tLabel    = value => {
			let found = false;
			for( let stateId in this.stateHash ) {
				found = found || this.stateHash[stateId].label === value;
			}
			return this.test( found, 'label reference bad'+value );
		}
		content.tJournalId = value => {
			this.commandContext.journalId = value;
			return this.test( Journal.Data[value] !== undefined );
		}
		content.tJournalStage = value => {
			if( this.commandContext.journalId === undefined ) {
				this.assert( 'No journal: specified. Must specify journal: first.' );
			} 
			return this.test( Journal.Data[this.commandContext.journalId][value] !== undefined );
		}

		return content;
	}

	testContent(typeId,value) {
		console.assert( this.content[typeId] );
		return this.content[typeId](value);
	}

	checkHash(hash,structId) {
		let spec = Script.Command.specHash[structId];
		for( let key in hash ) {
			let typeId = this.getType(hash[key]);
			this.assert( spec[typeId], "Unsupported type "+typeId );
			//console.log('freeform is',key, spec.id+'.'+typeId );
			// id: sCastDef
			// tNull: true
			// tString: entityId
			this.validateKV( key, hash[key], spec[typeId] );
		}
	}

	checkCommand(commandHash,cmdId) {
		this.assert( cmdId, 'Unknown command '+JSON.stringify(commandHash) );
		this.trail.push(cmdId);
		console.assert( cmdId );
		console.assert( Script.Command.cmdHash[cmdId] );
		console.assert( Script.Command.cmdHash[cmdId].commandKeys );
		// This is the spec that describes the contents of this commandHash.
		let validCommands = Script.Command.cmdHash[cmdId].commandKeys;
		this.clearCommandContext();
		for( let key in commandHash ) {
			if( key.startsWith('__') ) {
				continue;
			}
			let structId = validCommands[key];
			this.assert( structId, "Invalid key "+key );

			// A command leads to its type, or a terminal type validation
			if( Script.Command.specHash[structId] ) {
				this.validateKV( key, commandHash[key], structId );
				console.logScriptValidate( '    ', key, 'is', structId );
			}
			else {
				this.trail.push(key);
				this.validateTerminus( commandHash[key], structId );
				this.trail.pop();
				console.logScriptValidate( '    ', key, 'terminus', structId );
			}
		}
		this.trail.pop();
	}

	validateTerminus( value, structId ) {
		// Is this just a reference to a another spec? If so, resolve it.
		if( structId === true ) {
			return;
		}

		// List of terminal types
		if( Array.isArray(structId) ) {
			let ok = false;
			for( let i in structId ) {
				ok = ok || this.testContent( structId[i], value );
			}
			this.assert( ok, "Type mismatch. "+JSON.stringify(value)+" must be ("+structId.join(', ')+")" );
			return;
		}

		// Singular type. Might require iteration, or not.
		if( this.content[structId] ) {
			this.error = null;
			let ok = this.testContent( structId, value );
			this.assert( ok, this.error );
			return;
		}

		let typeId = this.getType(value);
		if( ['tFunction','tString','tNumber','tBoolean'].includes(typeId) ) {
			debugger;
			return;
		}

		this.assert( false, "unhandled type "+structId );
	}

	validateKVInner(value,structId) {

		let typeId = this.getType(value);

		console.logScriptValidate('val',this.trail.join('.'),':',JSON.stringify(value).substr(0,30));
		console.logScriptValidate('   as',structId);

		if( typeId === 'tArray' ) {
			// What type is each record in the array?
			let spec = Script.Command.specHash[structId];
			console.assert( spec );
			console.logScriptValidate("ARRAY START",spec);
			for( let i=0 ; i<value.length ; ++i ) {
				let record   = value[i];
				let structId = spec[this.getType(record)];
				this.validateKV( i+1, record, structId );
			}
			return;
		}

		if( typeId === 'tObject' ) {
			if( Script.Command.cmdHash[structId] ) {
				this.checkCommand( value, structId );
				return;
			}

			console.assert( typeof structId === 'string' );
			if( structId.startsWith('commandType:') ) {
				let cmdId = Script.Command.cmdFind(value);
				this.checkCommand(value,cmdId);
				return;
			}

			let temp = Script.Command.specHash[structId];
			if( temp && temp.thisObjectIsKeyValuePairs ) {
				let hashStructId = Script.Command.specHash[structId].tObject;
				this.checkHash( value, hashStructId );
				return;
			}
		}

		if( Script.Command.specHash[structId] ) {
			let spec = Script.Command.specHash[structId];
			console.assert( spec[typeId] );
			this.validateKVInner( value, spec[typeId] );
			return;
		}

		return this.validateTerminus( value, structId );

	}

	validateKV(key,value,structId) {
		this.trail.push(key);
		this.validateKVInner(value,structId);
		this.trail.pop();
	}

	validate(definition) {
		this.reset();

		this.definition = definition;
		this.cast = definition.cast || {};
		this.flag = definition.flag || {};
		this.declareHash = definition.declareHash || {};
		this.stateHash = definition.stateHash || {};

		this.validateKV(
			definition.id,
			definition,
			'definition'
		);
		return this.issueList;
	}
}

Script.Query = new class {
	constructor() {
		this.process = null;
	}
	testOne(process,anyId,param) {
		this.process = process;
		let result = true;
		let f = this.process.flag(anyId);
		if( f ) {
			if( f.isTimer ) {
				return f.isComplete;
			}
			if( f.fn ) {
				return f.fn(process);
			}
			if( f.test ) {
				return this.testAny(process,f.test,{});
			}
			debugger;
			return result;
		}
		let entity = this.process.cast(anyId);
		if( entity ) {
			if( param.key !== undefined ) {
				result = result && this.key(entity,param.key,param);
			}
			if( param.isAt !== undefined ) {
				result = result && this.isAt(entity,param.isAt);
			}
			if( param.has !== undefined ) {
				result = result && this.has(entity,param.has);
			}
			if( param.hasState !== undefined ) {
				result = result && this.hasState(entity,param.hasState);
			}
			debugger;
			return result;
		}
		debugger;
		return result;
	}
	testList(process,conList,param) {
		let result = true;
		let i = 0;
		while( result && i < conList.length ) {
			result = result && this.testOne(process,conList[i],{});
			++i
		}
		return result;
	}
	testAny(process,anyId,param) {
		if( typeof con == 'string' ) {	// must be a flag to check
			return this.testOne(process,anyId,{});
		}
		if( Object.isObject(anyId) ) {
			let queryId = anyId.query;
			return this.testOne(process,queryId,anyId);
		}
		if( Array.isArray(anyId) ) {
			return this.testList(process,anyId);
		}
		debugger;
	}
	compare(lvalue,param) {
		if( param.eq  ) return lvalue == param.eq;
		if( param.lt  ) return lvalue <  param.eq;
		if( param.gt  ) return lvalue >  param.eq;
		if( param.lte ) return lvalue <= param.eq;
		if( param.gte ) return lvalue >= param.eq;
		return lvalue;
	}
	key(entity,key,param) {
		let lvalue = entity.key;
		return this.compare(lvalue,param);
	}
	isAt(entity,siteId) {
		let site   = this.process.world.find(siteId);
		return Distance.within(
			entity.circle.x-site.circle.x,
			entity.circle.y-site.circle.y,
			entity.circle.radius+site.circle.radius
		);
	}
	has(entity,itemId) {
		return this.entity.inventory.find( item=>item.id==itemId );
	}
	hasState(entity,state) {
		return entity.state == state;
	}
}

Script.Process = class {
	constructor( callerId, entry, stateId, eventId, entityId, labelId, cmdList ) {
		this.id       = entry.id+'.'+(eventId?eventId+'.':'')+(entityId?entityId+'.':'')+Date.makeUid();

		console.assert( entry.isEntry );
		this.entry    = entry;
		this.callerId = callerId;
		this.eventId  = eventId;

		console.assert( entityId===null || entry.world.find(entityId) );
		this.entityId = entityId;
		this.labelId  = labelId;
		this.stateId  = stateId;

		console.assert( Array.isArray(cmdList) );
		this.cmdList  = cmdList;
		this.ip       = 0;
		this.stack    = [];
		this.active   = false;
		this.$stateChange = null;
		this.$exitDialog  = false;

	}

	// QUICK ACCESS VARS
	get name() {
		return (this.labelId?this.labelId+':':'')+this.entry.id+'.'+this.stateId+'.'+this.eventId+'.'+this.entityId;
	}
	get observer() {
		return this.entry.manager.observer;
	}
	get world() {
		return this.observer.world;
	}
	get player() {
		return this.observer
	}
	get dialog() {
		return this.observer.dialog;
	}
	get manager() {
		return this.entry.manager;
	}

	/// STACK
	stackPush(cmdList) {
		this.ip += 1;	// So that a pop puts us back on the right line.
		this.stack.push(this.cmdList);
		this.stack.push(this.ip);
		this.cmdList = cmdList;
		this.ip = -1;
	}
	stackPop() {
		console.assert(this.stack.length > 0);
		this.ip = this.stack.pop();
		this.cmdList = this.stack.pop();
	}
/*
	resolve(n) {
		if( typeof n === 'function' ) {
			return n(this);
		}
		if( typeof n === 'string' ) {
			if( this.entry.castExists(n) ) {
				return this.world.find(this.entry.castGet(n));
			}
			if( this.entry.flagExists(n) ) {
				return this.entry.flagGet(n);
			}
			let entity = this.world.find(n);
			if( entity ) {
				return entity;
			}
			return n;
		}
		return n;
	}
*/
	// CAST
	cast(n) {
		return this.entry.cast(n);
	}
	castExists(n) {
		return this.entry.castExists(n);
	}

	// FLAG
	flag(n) {
		return this.entry.flag(n);
	}
	flagExists(n) {
		return this.entry.flagExists(n);
	}


	// HELPERS
	activate(state=true) {
		this.active = state;
	}

	cmdEvent(param) {
		let castId   = param.to;
		let eventId  = param.event;
		let entityId = this.cast(castId).id;
		let process = new Script.Process(
			this.id,
			this.entry,
			this.stateId,
			eventId,
			entityId,
			param.label,
			param['do']
		);
		this.entry.manager.addProcess(process);
		return Script.Result.ADVANCE;
	}
	cmdOnEscape(param) {
		this.observer.dialog.addSay( this.id, param.me );
		return Script.Result.END;
	}
	cmdJournal(param) {
		let journal = this.observer.journal;
		let journalId = param.journal;
		console.assert( Journal.Data[journalId] );
		let journalTitle = String.uncamel( journalId );

		journal.add( journalId, journalTitle );

		if( param.done !== undefined ) {
			journal.stageSetDone( journalId, param.done, Journal.Data[journalId][param.done] );
		}
		if( param.start !== undefined ) {
			journal.stageAdd( journalId, param.start, Journal.Data[journalId][param.start] );
		}
		if( param.mark !== undefined ) {
			let entity = this.cast(param.mark);
			journal.mark( journalId, entity );
		}
		if( param.complete ) {
			journal.setComplete( journalId );
		}
		if( param.fail ) {
			journal.setFailed( journalId );
		}
		return Script.Result.ADVANCE;
	}
	cmdPl(param) {
		this.observer.dialog.addReply( this.id, param.pl );
		return Script.Result.ADVANCE | Script.Result.AWAIT_REPLY;
	}
	cmdMe(param) {
		console.assert( !this.dialog.hasSay );
		this.observer.dialog.addSay( this.id, param.me );
		return Script.Result.ADVANCE;
	}
	cmdChoice(param) {
		this.observer.dialog.addReply( this.id, param.choice, param['do'] );
		return Script.Result.ADVANCE;
	}
	cmdAsk(param) {
		return Script.Result.ADVANCE | Script.Result.AWAIT_REPLY;
	}
	cmdQuery(param) {
		console.assert(false);
	}
	cmdAwait(param) {
		let result = Script.Query.testAny(this,param.await,param);
		if( !result ) {
			return Script.Result.AWAIT_CONDITION;
		}
		return Script.Result.ADVANCE;
	}
	cmdTimer(param) {
		console.assert( Number.isFinite(param.start) );
		let flagId = param.timer;
		let timer  = this.entry.flag[flagId];
		console.assert( timer.isTimer );
		timer.timeLeft = param.start;
		timer.isComplete = false;
		timer.isRunning = true;
		return Script.Result.ADVANCE;	
	}
	cmdIf(param) {
		let $if		= param['if'];
		let $then	= param['do'];
		let $else	= param['else'];
		if( Script.Query.testAny(this,$if,param) ) {
			this.stackPush($then);
		}
		else if( $else ) {
			this.stackPush($else);
		}
		return Script.Result.ADVANCE;
	}
	cmdSet(param) {
		let flagId = param.set;
		this.entry.flagHash[flagId] = param.value===undefined ? true : param.value;
	}
	cmdChange(param) {
		let castId = param.change;
		let entity = this.cast(castId);

		if( param.key ) {
			let value = param.value === undefined ? true : param.value;
			entity[param.key] = value;
		}
		if( Number.isFinite(param.gold) ) {
			entity.gold += param.gold;
		}
		if( param.give ) {
			let item = this.world.find(param.give);
			item.takeFrom(item.owner);
			item.giveTo(entity);
		}
		if( param.travelTo ) {
			let location = this.world.find(param.travelTo);
			entity.destination = location.circle;
		}
		if( param.talkTo ) {
			debugger;
		}
		return Script.Result.ADVANCE;	
	}
	jumpTo(target) {
		let entryId = Object.isObject(target) ? target.quest : this.entry.id;
		let stateId = Object.isObject(target) ? target.state : target;
		this.$stateChange = {
			entryId: entryId,
			stateId: stateId
		}
	}
	cmdGoto(param) {
		this.jumpTo(param.goto);
		return Script.Result.END;
	}
	cmdExit(param) {
		this.$exitDialog = true;
		if( !Number.isFinite(param.exit) ) {
			this.jumpTo(param.exit);
		}
		return Script.Result.END;
	}
	cmdRun(param) {
		debugger;
		let codeBlock = this.declareHash[param.run];
		this.stackPush(codeBlock);
	}
	cmdDeadend(param) {
		return Script.Result.POP;
	}
	execute() {
		console.assert( this.ip>=0 && this.ip<this.cmdList.length );
		let cmd = this.cmdList[this.ip];
		let spec = Script.Command.findSpec( cmd );
		console.assert(spec);
		let result = this[spec.cmdId](cmd);
		return result;
	}
	executeAll() {
		while( this.ip < this.cmdList.length ) {
			let result = this.execute();
			if( !(result & Script.Result.ADVANCE) ) {
				debugger;
			}
			this.ip += 1;
		}
		this.complete();
	}
	executeUntilStop() {
		let result;
		do {
			result = this.execute();
			if( result & Script.Result.POP ) {
				debugger;
				this.stackPop();
			}
			if( result & Script.Result.ADVANCE ) {
				this.ip += 1;
				while( this.ip >= this.cmdList.length ) {
					if( this.stack.length <= 0 ) {
						result = Script.Result.END;
						break;
					}
					this.stackPop();
				}
			}
		} while( result & Script.Result.ADVANCE );
		if( result & Script.Result.END ) {
			this.complete();
		}
		if( this.$stateChange ) {
			console.assert( result & Script.Result.END );
			this.manager.setEntryState(
				this.$stateChange.entryId,
				this.$stateChange.stateId,
				this.eventId,
				this.entityId
			);
			if( this.$exitDialog ) {
				this.manager.exitDialog();
			}
		}
		return {
			result: result,
			stateChange: this.$stateChange,
			exitDialog: this.$exitDialog
		}
	}
	complete() {
		this.isComplete = true;
	}
	run() {
		if( this.isComplete ) {
			return false;
		}
		return this.executeUntilStop();
	}
}

Script.State = class {
	constructor(entry,stateId,labelId) {
		this.stateId  = stateId;
		this.labelId  = labelid;
		this.onTalk   = {};
		this.onTick   = {};
	}
}

Script.Entry = class {
	constructor( manager, definition ) {
		this.manager = manager;
		this.definition = definition;
		this.castHash = null;
		this.flagHash = null;
		this.timerHash = {};
		this.stateId = null;
		this.stateProcess = null;
	}

	// ACCESS FUNCTIONS
	get id() {
		return this.definition.id;
	}
	get isEntry() {
		return true;
	}
	get world() {
		return this.manager.observer.world;
	}

	// CAST
	cast(n) {
		let value;
		if( this.castHash[n] !== undefined ) {
			value = this.castHash[n];
		}
		else {
			value = this.definition.cast[n];
		}
		console.assert( value !== undefined );
		if( typeof value === 'function' ) {
			value = value(this);
		}
		return this.world.find(value);
	}
	castExists(n) {
		return this.cast(n) !== undefined;
	}

	// FLAG
	flag(n) {
		let value;
		if( this.flagHash[n] !== undefined ) {
			value = this.flagHash[n];
		}
		else {
			value = this.definition.flag[n];
		}
		console.assert( value !== undefined );
		if( typeof value === 'function' ) {
			value = value(this);
		}
		return value;
	}
	flagExists(n) {
		return this.flag(n) !== undefined;
	}

	// TIMER
	setTimer(timerId,duration) {
	}

	castAssign(injectCastHash) {
		this.castHash = Object.assign( {}, injectCastHash );
	}
	flagAssign(injectFlagHash) {
		// For now we will assume that all flags just get recalculated
		// every time.
		this.flagHash = Object.assign( {}, injectFlagHash );
	}
	generate(genSpec) {
		console.assert(genSpec.cast && genSpec.cast.giver);
		this.castAssign(genSpec.cast || {});
		this.flagAssign(genSpec.flag || {});
	}
	setState(newStateId) {
		if( !this.cast ) {
		}
		if( this.stateId === newStateId ) {
			return true;
		}

		if( this.stateId ) {
			this.manager.killProcess( this.id, this.stateId );
		}

		console.logScript( this.id+'.state = '+newStateId );
		// At some point this needs to scan the process list and REMOVE all
		// processes that are not the incoming state.
		this.stateId = newStateId;
		this.flag.state = this.stateId;
		let commandList = this.definition.stateHash[this.stateId];
		console.assert( Array.isArray( commandList ) );

		this.stateProcess = new Script.Process( this.id, this, this.stateId, null, null, null, commandList );
		this.stateProcess.executeAll();
	}
	tickTimers() {
		for( let flagId in this.flagHash ) {
			let n = this.flagHash[flagId];
			if( !n.isTimer || !n.isRunning ) {
				continue;
			}
			console.assert(Number.isFinite(n.timeLeft));
			n.timeLeft -= 1;
			if( n.timeLeft <= 0 ) {
				n.timeLeft = 0;
				n.isComplete = true;
				n.isRunning = true;
			}
		}
	}
}

Script.Definition = class {
	constructor(data) {
		console.assert( data.id );
		Object.assign( this, data );

		this.cast = this.cast || {};
		this.cast.player = 'player';
		this.flag = this.flag || {};
		this.flag.state = false;
		this.flag.talkResumed = false;
		this.__giverList = {};

		for( let key in this.flag ) {
			if( typeof flag === 'function' ) {
				flag[key] = {
					readonly: true,
					value: flag[key]
				}
			}
		}
	}
	__testGeneration() {
		// For now we only have the VERY SIMPLEST possible generator.
		let entityId = this.generator;
		console.assert( typeof entityId === 'string' );
		if( this.__giverList[entityId] ) {
			return;
		}
		this.__giverList[entityId] = true;
		return {
			cast: {
				giver: entityId
			}
		}
	}
}



Script.Manager = class {
	constructor(validator) {
		this.observer       = null;
		this.definitionList = new ListManager([]);
		this.entryList      = new ListManager([]);
		this.processList    = new ListManager([]);
		this.secondAccumulator = 0;
	}
	setObserver(observer) {
		this.observer = observer;
	}
	getEntry(entryId) {
		return this.manager.entryList.find( e=>e.id==entryId );
	}
	getDefinition(definitionId) {
		return this.definitionList.find(d=>d.id==definitionId);
	}
	addDefinition( definitionRaw ) {
		console.logScript( 'add definition', definitionRaw.id );
		let definition = new Script.Definition( definitionRaw );
		this.definitionList.push( definition );
	}
	addDefinitionHash(definitionHash) {
		Object.each( definitionHash, (definition) => {
			this.addDefinition( definition );
		});
	}
	validateDefinitions(validator) {
		let issueList = [];
		this.definitionList.traverse( definition => {
			let issuesFound = validator.validate(definition,issueList);
			issueList.push(...issuesFound);
		});
		return issueList;
	}
	killProcess( entryId, stateId ) {
		let n = this.processList.remove( process => process.entry.id==entryId && process.stateId==stateId );
		debugger;
	}
	addProcess( process ) {
		console.logScript( 'add process', process.name );
		this.processList.push( process );
	}
	scanGenerators() {
		this.definitionList.traverse( definition => {
			let genSpec = definition.__testGeneration();
			if( !genSpec ) {
				return;
			}
			let entry = new Script.Entry( this, definition );
			this.entryList.add( entry );

			debugger;
			entry.generate(genSpec);
		});
	}
	setEntryState(entryId,stateId) {
		let entry = this.getEntry(entryId);
		// At some point, if the entry is not found, we might
		// instantiate it. Someday...
		console.assert( entry );
		console.assert( entry.definition.stateHash[stateId] );
		entry.setState( stateId );
	}
	exitDialog() {
		guiMessage('untalkPerson');
	}
	beginAsNeeded() {
		this.entryList.traverse( entry => {
			if( !entry.stateId && entry.definition.stateHash['BEGIN'] ) {
				entry.setState( 'BEGIN' );
			}
		});
	}
	collect(eventId,filterFn) {
		let list = [];

		this.processList.traverse( process => {
			if( process.eventId == eventId && filterFn(process) ) {
				list.push(process);
			}
		});

		return list;
	}
	eventTalk(speaker) {
		let list = this.collect('talk',p=>p.entityId==speaker.id);
		list.forEach( p=>p.run() );
	}
	eventTick(dt) {
		this.beginAsNeeded();
		let list = this.collect('tick',p=>true);
		list.forEach( p=>p.run() );

		this.secondAccumulator += dt;
		while( this.secondAccumulator >= 1.0 ) {
			this.entryList.traverse( entry => entry.tickTimers() );
			this.secondAccumulator -= 1.0;
		}
	}
}

Script.ViewHelper = new class {
	report(str) {
		var elem = document.createElement('div');
		elem.style.cssText = 'position:absolute; top:0px; left: 0px; width:100%; height:100%; opacity:1; z-index:100; background:#000; color:#fff; white-space:pre; font-family: "Courier New", Courier, monospace;';
		document.body.appendChild(elem);
		elem.innerHTML = '<h1>Script Errors</h1>'+str;
	}
}

function frog() {}

return {
	Script: Script
}

});
