Module.add( 'quest', ()=>{


let Quest = {
	Data: {},
	hash: []
};

Journal.Data.aBladeInTheDark = {
	rent:	{
		bullet: "Rent the Attic Room in Riverwood",
		detail: "Somebody got to the horn of Jurgen Windcaller before me. I need to meet them in Riverwood."
	},
	meet1:	{
		bullet: "Enter the room",
	},
	meet2: {
		bullet: "Meet Delphine",
	},
	find: {
		bullet: "Find Esbern in Riften"
	}
};

Quest.Data.tavernKeeper = {
	generator: 'delphine',
	cast: {
		giver:		null,
		bedroom:	'bedroomSleepingGiantInn',
	},
	flag: {
		roomCost:	10,
		canAfford:	c=>c.cast.player.gold >= c.flag.roomCost,
		takeGold:	c=>c.cast.player.gold -= c.flag.roomCost,
		roomRented: { isTimer: true },
	},
	priority: 'normal',
	stateHash: {
		BEGIN: [
			{ to: 'giver2', event: 'talk', do: [
				{ if: { query: 'giver', key: 'noTavern' }, do: [
					{ exit: 0 }
				]},
				{ me: "Welcome to the Sleeping Giant Inn." },
				{ pl: c=>"I'd like to rent a room. ("+c.flag.roomCost+" gold)" },
				{ if: 'canAfford', do: [
					{ run: 'takeGold' },
					{ me: "OK. Follow me." },
					{ exit: 'lead' }
				],
				else: [
					{ me: "Come back when you have more coin." },
				]}

			]}
		],
		lead: [
			{ to: 'giver', event: 'talk', do: [
				{ me: "Follow me to your room." }
			]},
			{ to: 'giver', event: 'tick', do: [
				{ change: 'giver', travelTo: 'bedroom' },
				{ await: [
					{ query: 'giver', isAt: 'bedroom' },
					{ query: 'player', isAt: 'bedroom' },
				]},
				{ me: "Here you are. Have a good night sleep." },
				{ exit: 'rented' }
			]}
		],
		rented: [
			{ to: 'giver', event: 'talk', do: [
				{ me: "I hope you are enjoying your room." }
			]},
			{ to: 'giver', event: 'tick', do: [
				{ timer: 'roomRented', start: 50 },
				{ await: 'roomRented' },
				{ goto: 'BEGIN' }
			]}
		]
	}
}

Quest.Data.aBladeInTheDark = {
	generator: 'delphine',
	cast: {
		// Possibly the player is always in the cast...
		giver:		null,
		delphine:	'delphine',
		brynjolf:	'brynjolf',
		esbern:		'esbern',
		bedroom:	'bedroomSleepingGiantInn',
		delroom:	'delphinesRoom',
		delroomDoor:'delphinesRoomDoor',
		horn:		'hornOfJurgen',
		wardrobe:	'delphineWardrobe',
		bladeRoom:	'bladesHiddenRoom',
	},
	flag: {
		// This can't be calculated immediately, because you might improve your
		// stats and then return. So we calculate it on-demand, and re-use it
		// thereafter.
		brPersuade:	{ fn: c=>c.player.persuade(50), cache: true }
	},
	priority: 'quest',
	declareHash: {
		reveal: [
			{ me: "Yeah. I bet I know your guy. He's hiding out in the Ratway Warrens. Paying us good coin for nobody to know about it." },
			{ deadend: 1 }
		]
	},
	stateHash: {
		BEGIN: [
			{ journal: 'aBladeInTheDark', start: 'rent', mark: 'delphine' },
			{ to: 'delphine', event: 'talk', do: [
				{ priority: 'normal' },
				{ pl: "I'd like to rent the attic room. (10 gold)" },
				{ change: 'player', gold: -10 },
				{ me: "Attic room, eh? Well... we don't have an attic room, but you can have the one on the left. Make yourself at home." },
				{ exit: 'meet1' }
			]}
		],
		meet1: [
			{ change: 'delphine', key: 'noTavern', value: 'true' },
			{ journal: 'aBladeInTheDark', done: 'rent', start: 'meet1', mark: 'bedroom' },
			{ to: 'delphine', event: 'tick', do: [
				{ change: 'delphine', travelTo: 'bedroom' },
				{ await: [
					{ query: 'delphine', isAt: 'bedroom' },
					{ query: 'player', isAt: 'bedroom' }
				]},
				{ me: "So you're the Dragonborn I've been hearing so much about." },
				{ me: "I think you're looking for this." },
				{ change: 'player', give: 'horn' },
				{ me: "We need to talk. Follow me." },
				{ exit: 'meet2' }
			]}
		],
		meet2: [
			{ journal: 'aBladeInTheDark', done: 'meet1', start: 'meet2', mark: 'delroom' },
			{ to: 'delphine', event: 'tick', do: [
				{ change: 'delphine', travelTo: 'delroom' },
				{ await: [
					{ query: 'delroom', isAt: 'delroom' },
					{ query: 'player', isAt: 'delroom' },
					{ query: 'delroomDoor', hasState: 'open' },
				]},
				{ me: "Close the door." },
				{ exit: 0 }
			]},
			{ to: 'delphine', event: 'tick', do: [
				{ await: [
					{ query: 'delroomDoor', hasState: 'closed' }
				]},
				{ me: "Now we can talk." },
				{ goto: 'meet3' }
			]}
		],
		meet3: [
			{ journal: 'aBladeInTheDark', mark: 'bladeRoom' },
			{ change: 'wardrobe', key: 'state', value: 'open' },
			{ change: 'delphine', travelTo: 'bladeRoom' },
			{ to: 'delphine', event: 'tick', do: [
				{ await: [
					{ query: 'delphine', isAt: 'bedroom' },
					{ query: 'player', isAt: 'bedroom' }
				]},
				{ me: "The greybeards seem to think you're the dragonborn. I hope they're right." },
				{ pl: "So what now?" },
				{ goto: 'find' }
			]}
		],
		find: [
			{ to: 'delphine', event: 'talk', do: [
				{ onEscape: [
					{ me: "You'll be back. If you're really Dragonborn this is your destiny." },
				]},
				{ if: 'talkResumed', do: [
					{ me: "Have you found Esbern yet? Get to it!" },
				],
				else: [
					{ me: "Go find Esbern." },
				]},
				{ exit: 0 }
			]},
			{ to: 'esbern', event: 'talk', do: [
				{ me: "You found me!" },
				{ exit: 'complete' }
			]},
			{ to: 'brynjolf', event: 'talk', do: [
				{ pl: "I'm looking for this old guy hiding out in Riften." },
				{ if: { query: 'aChanceArrangement', stage: 'complete' }, do: [
					{ run: 'reveal' }
				]},
				{ me: "Expecting free information, eh? Help me deal with business first.\n"+
					  "Besides, you look like your pockets are a little light on coin, am I right?"
				},
				{ choice: "Let me find him first. Dragons are bad for business. (Persuade)", do: [
					{ if: 'brPersuade', do: [
						{ me: "Aye, you've got a point there." },
						{ run: 'reveal' },
					],
					else: [
						{ me: "Passing on a golden opportunity is worse." },
						{ goto: { quest: 'aChanceArrangement', state: 'getInstructions' } }
					]}
				]},
				{ choice: "Hold on - I just wanted some information.", do: [
					{ me: "And I'm busy. You help me out, and I'll help you out. That's just how it is." },
					{ deadend: 1 },
				]},
				{ ask: true }
			]},
		],
		complete: [
			{ journal: 'aBladeInTheDark', complete: true },
			{ to: 'delphine', event: 'talk', do: [
				{ me: "Well done. I'm glad you found Esbern." },
				{ exit: 'complete' }
			]},
		]
	}
}

Journal.Data.miscellaneous = {
	listenBrynjolf: {
		bullet: "Listen to Brynjolf's Scheme"
	}
}

Journal.Data.aChanceArrangement = {
	meet:	{
		bullet: "Meet Brynjolf During Daytime",
	},
	steal:	{
		bullet: "Steal Madesi's Ring",
	},
	plant:	{
		bullet: "Plant Madesi's Ring on Brand-Shei",
	},
	speak:	{
		bullet: "Speak to Brynjolf"
	}
};



Quest.Data.aChanceArrangement = {
	generator: 'brynjolf',
	cast: {
		brynjolf:	'brynjolf',
		bStall:		'brynjolfStall',
		madesi:		'madesi',
		mStall:		'madesiStall',
		brandShei:	'brandShei',
		ring:		'madesiRing',	// auto found among all items
	},
	flag: {
		// these all go directly onto 'c'
		seekingEsbern:	{ fn: c => c.quest.findEsbern.inProgress },
		framedMadesi:	{ fn: c => c.quest.aChanceArrangement.complete },
		persuade1:		{ fn: c => c.player.persuade(50) },
		haveGold:		{ fn: c => c.player.gold >= 500 },
		killedGuard:	{ fn: c => c.quest.riftenGate.killedGuard },
		scamTime:		{ fn: c => c.time >= 8 && c.time <= 12+8 },
		stoleRing:		{ query: 'player', has: 'ring' },
		plantedRing:	{ query: 'brandShei', has: 'ring' },
		atStallDaytime:	[
			{ query: 'scamTime' },
			{ query: 'brynjolf', isAt: 'bStall' },
			{ query: 'player', isAt: 'bStall' },
		],
	},
	declareHash: {
		explain: [
			{ if: { query: 'state', eq: 'getStarted' }, do: [
				{ choice: "I'm ready. Let's get this started.", do: [
					{ me: "Good. Wait until I start the distraction, etc..." },
					{ exit: 'stealRing' }
				]}
			]},
			{ choice: "Why are we doing this to Brand-Shei?", do: [
				{ me: "We've been contracted..." },
				{ deadend: 1 }
			]},
			{ choice: "How am I supposed to do all of this?", do: [
				{ me: "Do you want me to hold... blah blah" },
				{ deadend: 1 }
			]},
			{ ask: true }
		],
		speechify: [
			{ me: 'Gather round everyone.' },
			{ me: 'etc etc. some of you will doubt...' },
			{ say: 'madesi', text: 'Is this another scam like last time?' }
		]
	},
	stateHash: {
		BEGIN: [
			{ to: 'brynjolf', event: 'tick', do: [
				{ await: 'atStallDaytime' },
				{ change: 'brynjolf', talkTo: 'player' }
			]},
			{ to: 'brynjolf', event: 'talk', do: [
				{ onEscape: [
					{ me: "I can take a hint. You want to make some coin, come find me." },
					{ exit: 'getInstructions' },
				]},
				{ if: 'haveGold', do: [
					{ me: "Never done an honest day's work in your life for all that coin you carry..." },
				],
				else: [
					{ me: "Running a little light in the pockets, lad?" }
				]},
				{ journal: 'miscellaneous', start: 'listenBrynjolf', mark: 'brynjolf' },
				{ pl: "I'm sorry, what?", do: [
					{ me: "I'm saying you've got the coin, but you didn't earn a Septim of it honestly. I can tell." },
					{ deadend: 1 },
				]},
				{ choice: "How could you possibly know that?", do: [
					{ me: "Look how you sniffed out my little scheme at the North Gate. You knew it was a shakedown and you called him on it. That's what I'm talking about." },
					{ pl: "So the guard at the North Gate was your man?" },
					{ me: "Aye, that he was..." },
					{ if: 'killedGuard', do: [
						{ me: "Killing him was impulsive, but I'll let it go." },
					],
					else: [
						{ me: "I admire how you handled that." }
					]},
					{ pl: "You seem to be well acquainted with wealth." },
					{ me: "Wealth is my business. Help me out and I can add to yours. Would you like a taste?" }
				]},
				{ choice: "My wealth is none of your business.", do: [
					{ me: "Oh, but that's where your wrong lad. Wealth is my business. Maybe you'd like a taste?" },
				]},
				{ ask: true },
				{ pl: "What do you have in mind?" },
				{ me: "A bit of an errand. Need extra hands." },
				{ goto: 'getInstructions' }
			]}
		],
		getInstructions: [
			{ to: 'brynjolf', event: 'talk', do: [
				{ if: 'talkResumed', do: [
					{ me: "Glad to see you came to your senses." },
				]},
				{ choice: "What do I have to do?", do: [
					{ me: "Simple... I'm going to cause... Steal Madesi's ring and plant it on Brand-Shei." },
				]},
				{ choice: "No, nevermind.", do: [
					{ me: "You're trying my patience." },
					{ exit: 0 }
				]},
				{ ask: true },
				{ choice: "Why plant the ring on Brand-Shei?", do: [
					{ me: "There's someone that want to see him put out of business permanently. That's all you need to know." },
					{ if: 'scamTime', do: [
						{ me: "Now, you tell me when you're ready and we'll get started." },
					],
					else: [
						{ me: "I'll be out in the market all day. Meet me then if you've still got the stomach for it." },
					]},
				]},
				{ choice: "Break the law? Are you kidding?", do: [
					{ me: "Sorry... I usually have a nose for this kind of thing. Never mind then, lad. If you change your mind, come find me." },
					{ exit: 0 }
				]},
				{ ask: true },
				{ exit: 'getStarted' },
			]},
		],
		getStarted: [
			{ journal: 'miscellaneous', done: 'listenBrynjolf' },
			{ journal: 'aChanceArrangement', start: 'meet', mark: 'brynjolf' },
			{ to: 'brynjolf', event: 'tick', do: [
				{ await: 'scamTime' },
				{ change: 'brynjolf', travelTo: 'bStall' },
			]},
			{ to: 'brynjolf', event: 'tick', do: [
				{ await: 'atStallDaytime' },
				{ me: "I'm ready when you are. Just give the word." },
				{ change: 'brynjolf', talkTo: 'player' }
			]},
			{ run: 'explain' }
		],
		stealRing: [
			{ run: 'explain' },
			{ run: 'speechify' },
			{ journal: 'aChanceArrangement', done: 'meet', start: 'steal', mark: 'ring' },
			{ to: 'player', event: 'tick', do: [
				{ await: 'stoleRing' },
				{ goto: 'plantRing' }
			]}
		],
		plantRing: [
			{ run: 'explain' },
			{ run: 'speechify' },
			{ journal: 'aChanceArrangement', done: 'steal', start: 'plant', mark: 'brandShei' },
			{ to: 'player', event: 'tick', do: [
				{ await: 'plantedRing' },
				{ goto: 'speakBrynjolf' }
			]}
		],
		speakBrynjolf: [
			{ journal: 'aChanceArrangement', done: 'plant', start: 'speak', mark: 'brynjolf' },
			{ to: 'brynjolf', event: 'talk', do: [
				{ journal: 'aChanceArrangement', done: 'speak', complete: true },
				{ me: "My organization's been having a run of bad luck... There's more if you think you can handle it." },
			]}
		]
	}
};


return {
	Quest: Quest,
}

});
