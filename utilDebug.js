(function() {

	/**
		console.watch(entity,...)
		- logs the message if entity.watch is true, prefixed with entity.logId or entity.id
		- if the first arg after entity is '?uniqueOnceId' then it will only log the message once
	*/
	console.watch = (entity, ...args) => {
		if( !entity.watch ) {
			return;
		}
		let id = entity.logId || entity.id;
		if( args[0].substring(0,1) == '?' ) {
			let flag = args.shift()+'-watchOnce';
			if( entity[flag] ) return;
			entity[flag] = true;
		}
		console.log(id+':',...args);
	}

	/**
		console.watchSpreadTo(target,source)
		- for use with console.watch
		- will spread the .watch flag to target if it is set in source
	*/
	console.watchSpreadTo = (target, source) => {
		target.watch = target.watch || source.watch;
	}

	/**
		Debug usage:
		1. Create all your debug functions via window.Debug = DebugSetup({ myDebugType: true });
		2. Call console.logMyDebugType(...) and it will log or not
		   - if you make the first param an object, that object's .logId, .id or .typeId will be used.
		3. Turn it off or on again later with Debug.myDebugType = false;
		Don't call DebugSetup twice unless you know what you're doing.
	*/
	function DebugSetup(debugFlags) {

		let getFunctionName = (prefix,id) => {
			return prefix+id.charAt(0).toUpperCase() + id.slice(1);
		}

		for( let id in debugFlags ) {
			(debugFlags[id]) ? console.log('Debug.'+id+' is on') : null;

			let logName = getFunctionName( 'log', id );
			console[logName] = (...args) => {
				if( !debugFlags[id] ) {
					return;
				}
				if( typeof args[0]==='object' && args[0]!==null ) {
					args[0] = args[0].logId || args[0].id;
				}
				console.log( ...args );
			}

			let watchName = getFunctionName( 'watch', id );
			console[watchName] = (...args) => {
				if( !debugFlags[id] ) {
					return;
				}
				return console.watch(...args);
			}

		}

		return debugFlags;
	}

	if( typeof module !== 'undefined' ) {
		module.exports = DebugSetup;
	}
	else {
		window.DebugSetup = DebugSetup;
	}

})();
