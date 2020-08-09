// STATIC UTILITY FUNCTIONS
Module.add('utilities',function(){

	//
	// MATH
	//
	Math.clamp = function(value,min,max) {
		return Math.max(min,Math.min(max,value));
	}
	// assumes num is 0-1, and converts to min-to-max
	Math.range = function(num,min,max) {
		return min+(num*(max-min));
	}
	Math.normalize = function( num, min, max ) {
		return Math.clamp( (num-min) / (max-min), 0.0, 1.0 );
	}
	Math.rangeRange = function(num,numMin,numMax,min,max) {
		let n = Math.clamp( (num-numMin) / (numMax-numMin), 0.0, 1.0 );
		return Math.range( n, min, max );
	}

	// Does not include max.
	Math.randInt = function(min, max) {
		return Math.floor(Math.random() * (max - min)) + min;
	}
	Math.randIntBell = function(min, max) {
		let span = (max-min)/3;
		return min + Math.floor( Math.random()*span + Math.random()*span + Math.random()*span );
	}
	Math.rand = function(min, max) {
		return Math.random()*(max-min)+min;
	}
	Math.randBell = function(min, max) {
		let span = (max-min)/3;
		return min + Math.random()*span + Math.random()*span + Math.random()*span;
	}
	Math.triangular = function(n) {
		// 1, 3, 6, 10, 15, 21, 28 etc.
		return (n*(n+1))/2;
	}
	Math.fChance = function(percent) {
		console.assert( percent >= 0.0 && percent <= 1.0 );
		return Math.random() < percent;
	}
	Math.chance = function(percent) {
		return Math.rand(0,100) < percent;
	}

	// Important - this is how the game will take x,y coords and consider which tile they fall into.
	Math.toTile = Math.round; //floor; //round;

	Math.fixed = function(value,decimals) {
		let p = Number.parseFloat(value).toString().split('.');
		if( p[1] == undefined ) p[1] = '0';
		while( p[1].length < decimals ) p[1]+='0';
		return p[0]+'.'+p[1].substr(0,decimals);
	}
	// Takes a number 0.0 to 1.0
	Math.percent = function(value,decimals=0) {
		let p = 100*Math.pow(10,decimals);
		let n = '            '+Math.floor(value*p);
		n = n.substr(0,n.length-decimals)+(decimals>0 ? '.'+n.substr(n.length-decimals) : '');
		return n.substr(-(3+decimals));
	}

	//
	// NUMBER
	//

	Number.roman = function(num) {
		var lookup = {M:1000,CM:900,D:500,CD:400,C:100,XC:90,L:50,XL:40,X:10,IX:9,V:5,IV:4,I:1},roman = '',i;
		for ( i in lookup ) {
			while ( num >= lookup[i] ) {
				roman += i;
				num -= lookup[i];
			}
		}
		return roman;
	}

	//
	// STRING
	//

	String.validGender = function(s) {
		return s=='M' || s=='F';
	}
	String.splice = function(str, start, delCount, newSubStr) {
        return str.slice(0, start) + newSubStr + str.slice(start + Math.abs(delCount));
    }
	String.insert = function (str, index, string) {
		if (index > 0)
			return str.substring(0, index) + string + str.substring(index, str.length);
		else
			return string + str;
	}
	String.capitalize = function(s) {
	    return s.charAt(0).toUpperCase() + s.slice(1);
	}
	String.uncamel = function(id) {
		let s = '';
		for( let i=0 ; i<id.length ; ++i ) {
			let c = id.charAt(i);
			s += c != c.toLowerCase() ? ' '+c.toLowerCase() : c;
		}
		return s;
	}
	String.padLeft = function(s,len,char=' ') {
		s = ''+s;	// force it to become a string.
		while( s.length < len ) {
			s = char + s;
		}
		return s;
	}
	String.getIs = function(s) {
		return 'is'+String.capitalize(s);
	}
	String.getOf = function(s) {
		return 'of'+String.capitalize(s);
	}
	String.coords = function(x,y) {
		if( x==Math.floor(x) && y==Math.floor(y) ) {
			return '('+x+','+y+')';
		}
		return '('+Math.fixed(x,3)+','+Math.fixed(y,3)+')';
	}

	//
	// ARRAY
	//

	Array.filterInPlace = function(a, condition, thisArg) {
		let j = 0;
		// I made this a for loop to optimize speed.
		for( let i=0 ; i<a.length ; ++i ) {
			let e = a[i];
			if (condition.call(thisArg, e, i, a)) {
				if (i!==j) a[j] = e; 
				j++;
			}
		}

		a.length = j;
		return a;
	}
	Array.filterPairsInPlace = function(a, condition, thisArg) {
		let j = 0;
		let i = 0;
		while( i < a.length ) {
			if( condition.call(thisArg, a[i], a[i+1], i, a)) {
				if (i!==j) {
					a[j] = a[i]; 
					a[j+1] = a[i+1];
				} 
			}
			i += 2;
		}

		a.length = j;
		return a;
	}
	Array.count = function(array,fn) {
		let total = 0;
		array.forEach( a => {
			let n = fn(a);
			total += n===true ? 1 : (typeof n == 'number' ? n : 0);
		});
		return total;
	}
	Array.shuffle = function(array) {
		for (let i = array.length - 1; i > 0; i--) {
			let j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}
	Array.shufflePairs = function(array) {
		for (let i = array.length/2 - 1; i > 0; i-=1) {
			let j = Math.floor(Math.random() * (i + 1));
			[array[2*i+0],array[2*i+1], array[2*j+0],array[2*j+1]] = [array[2*j+0],array[2*j+1], array[2*i+0],array[2*i+1]];
		}
		return array;
	}
	Array.traverseSpan = function(array,span,fn) {
		for( let i=0 ; i<array.length ; i+=span ) {
			if( fn(array[i+0],array[i+1],array[i+2],array[i+3],array[i+4]) === false ) {
				return;
			}
		}
	}
	Array.traversePairs = function(array,fn) {
		for( let i=0 ; i<array.length ; i+=2 ) {
			if( fn(array[i+0],array[i+1]) === false ) {
				return;
			}
		}
	}
	Array.pickFromPairs = function(array) {
		let n = Math.randInt(0,array.length/2) * 2;
		return [array[n+0],array[n+1]];
	}
	Array.move = function(array, from, to) {
	    array.splice(to, 0, array.splice(from, 1)[0]);
	}
	Array.joinAnd = function(a) {
		let s = '';
		for( let i=0 ; i<a.length ; ++i ) {
			if( i>0 ) {
				if( i==a.length-1 ) {
					s += ', and ';
				}
				else {
					s+= ', ';
				}
			}
			s += a[i];
		}
		return s;
	}
	Array.assure = function(a) {
		return Array.isArray(a) ? a : [a];
	}

	//
	// OBJECT
	//

	Object.assignIds = function(obj) {
		Object.each( obj, (value,key)=>value.id=key );
	}


	Object.isObject = function(obj) {
		return typeof obj=='object' && obj !== null && !Array.isArray(obj);
	}

	Object.isEmpty = function(obj) {
		for(var key in obj) {
			if(obj.hasOwnProperty(key))
				return false;
		}
		return true;
	}
	Object.count = function(obj) {
		let count = 0;
		for(var key in obj) {
			if(obj.hasOwnProperty(key))
				++count;
		}
		return count;
	}
	Object.each = function(obj,fn) {
		for( let key in obj ) {
			if( fn(obj[key],key) === false ) {
				break;
			}
		}
	}
	Object.manyEach = function() {
		let fn = arguments[arguments.length-1];
		for( let i=0 ; i<arguments.length-1 ; ++i ) {
			let obj = arguments[i];
			if( !obj ) continue;
			for( let key in obj ) {
				if( fn(obj[key],key) === false ) {
					return false;
				}
			}
		}
	}
	Object.map = function(obj,fn) {
		let result = {};
		Object.each(obj,(value,key)=>result[key]=fn(value,key));
		return result;
	}
	Object.merge = function(target,source,ignore) {
		if( source ) {
			for( let key in source ) {
				if( ignore[key] ) {
					continue;
				}
				target[key] = source[key];
			}
		}
		return target;
	}
	Object.copySelected = function(target,source,select) {
		if( source ) {
			for( let key in source ) {
				if( select[key] !== undefined ) {
					target[key] = source[key];
				}
			}
		}
		return target;
	}
	Object.strip = function(target,fn) {
		for( let key in target ) {
			if( !fn || fn(target[key],key) ) {
				delete target[key];
			}
		}
		return target;
	}

	// Produces a new object composed of each key that the fn returned true for.
	Object.filter = function(obj,fn) {
		let result = {};
		for( let key in obj ) {
			if( fn(obj[key],key) ) {
				result[key] = obj[key];
			}
		}
		return result;
	}
	Object.filterInPlace = function(obj,fn) {
		let temp = Object.assign({},obj);
		for( let key in temp ) {
			if( !fn(temp[key],key) ) {
				delete obj[key];
			}
		}
		return obj;
	}
	Object.find = function(obj,fn) {
		for( let key in obj ) {
			if( fn(obj[key],key) ) {
				return obj[key];
			}
		}
		return false;
	}
	Object.findKey = function(obj,fn) {
		for( let key in obj ) {
			if( fn(obj[key],key) ) {
				return key;
			}
		}
		return false;
	}
	// Converts an incoming object into another object. The fn should return an object that will be object assigned into the source object.
	Object.convert = function(obj,fn) {
		let result = {};
		for( let key in obj ) {
			Object.assign(result, fn.call(obj,obj[key],key));
		}
		return result;
	}
	// Creates a result object.
	Object.extract = function(obj,memberId) {
		let result = {};
		for( let key in obj ) {
			result[obj[key][memberId]] = true;
		}
		return result;
	}
	Object.findByFlag = function( target, flagValueList ) {
		for( let key in flagValueList ) {
			if( target[key] ) {
				return flagValueList[key];
			}
		}
	}

	Array.supplyConcat = function(...args) {
		let result = [];
		for( let i=0 ; i <args.length ; ++i ) {
			if( !args[i] ) continue;
			if( Array.isArray(args[i]) ) {
				if( !args[i].length ) {
					continue;
				}
				result.push(...args[i]);
				continue;
			}
			result.push(args[i]);
		}
		return result;
	}

/*
Supplies can come in two forms: String and Object. Both can be encapsulated in an array if you wish to 
describe a list of supplies.

STRING FORM
	3x 50% TypeFilter permuteCode
	- every part is optional except TypeFilter
	- Rolls 4 times, with 10% chance to appear each time.
	- The permuteCode cooresponds one of 1,L,V,2,3,4,5,6,F to force certain permutations.
	- TypeFilter is a filter string. See filterStringParse for dtails.

ARRAY FORM
	{ count: n, chance: 60, id: 'weapon.dagger', permute: 'L', typeFilter: 'itemType.etc.etc' }
	Instead of typeFilter it may contain { pick: [ 'floor', 'pit', 'mist' ] } to choose one of those randomly
*/

	let ChParser = /\s*([\d]+x)*\s*(\d+%)*\s*([^/,]+)(\/([a-zA-Z0-9$]+\s*)|\s*,?)/g;
	Array.supplyParse = function(supplyMixed) {

		function supplyStringParse(supplyString) {
			let supply = [];
			supplyString.replace( ChParser, function( match, count, chance, typeFilter, ignore, permute) {
				count = count ? (parseInt(count) || 1) : 1;
				if( chance===undefined ) { chance='100'; }
				chance = parseInt(chance)||100;
				let result = { count: count, chance: chance, typeFilter: typeFilter };
				if( permute ) {
					result.permute = permute;
				}
				supply.push( result );
			});
			return supply;
		}

		let supplyArray = [];
		supplyMixed = Array.isArray(supplyMixed) ? supplyMixed : [supplyMixed];
		for( let mix of supplyMixed ) {
			if( typeof mix == 'string' ) {
				supplyArray.push(...supplyStringParse(mix));
			}
			if( typeof mix == 'object' ) {
				console.assert( mix.typeFilter || mix.pick );
				if( mix.pick ) {
					supplyArray.push( mix );	// { pick: [ 'floor', 'pit', 'mist' ] }
				}
				else {
					supplyArray.push(Object.assign({},{count:1, chance:100},mix));
				}
			}
		}
		return supplyArray;
	}

	Array.supplyValidate = function( supplyArray, typeList ) {
		supplyArray.forEach( supply => {
			if( supply.pick ) {
				supply.pick.forEach( typeFilter => console.assert(typeList[typeFilter.split('.')[0]]) );
			}
			else {
				console.assert(typeList[supply.typeFilter.split('.')[0]]);
			}
		});
	}

	Array.supplyToMake = function(supplyArray,sandBag=1.0,onPick=pick) {
		let makeList = [];
		for( let supply of supplyArray ) {
			if( supply.pick ) {
				makeList.push({typeFilter: onPick(supply.pick)});
				continue;
			}
			for( let i=0 ; i<(supply.count||1) ; ++i ) {
				let chance = supply.chance || 100;
				if( Math.chance(chance>= 100 ? 100 : chance*sandBag) ) {
					let temp = Object.assign({},supply);
					delete temp.count;
					delete temp.chance;
					makeList.push(temp);
				}
			}
		}
		return makeList;
	}

	String.combine = function(delim,...args) {
		let result = '';
		for( let i=0 ; i <args.length ; ++i ) {
			if( !args[i] ) continue;
			if( result ) {
				result += delim;
			}
			result += args[i];
		}
		return result;
	}

	String.arSplit = function(s,delim=',') {
		return (s || '')
			.split(delim)
			.filter( entry => entry !== undefined && entry !== null && entry !== '' )
			.filter( (value,index,self) => self.indexOf(value)===index );
	}
	String.arAdd = function(str,add) {
		let a = String.arSplit(str)
			.concat( String.arSplit(add) )
			.filter( (value,index,self) => self.indexOf(value)===index );
		return a.join(',');
	}
	String.arSub = function(str,remove) {
		let temp = String.arSplit(str);
		let index = temp.find(remove);
		if( index !== undefined ) {
			temp.splice(index,1);
		}
		return temp.join(',');
	}
	String.arIncludes = function(str,find) {
		return String.arSplit(str).includes(find);
	}
	String.arExtra = function(base,comp) {
		let aBase = String.arSplit(base);
		let aComp = String.arSplit(comp);
		for( let i=0 ; i<aBase.length ; ++i ) {
			if( !aComp.includes(aBase[i]) ) {
				return aBase[i];
			}
		}
		return '';
	}
	String.uncamelTypeId = function(typeId) {
		let result = String.uncamel(typeId);
		if( result.charAt(1) == ' ' ) {	// converts eMyEffect to e my effect and then my effect.
			result = result.substr(2);
		}
		return result;
	}

	String.isLowercase = function(s) {
		return s == s.toLowerCase() && s != s.toUpperCase();
	}

	String.startsWith = function(str,s) {
		return str.substring(0,s.length) == s;
	}

	String.calcName = function(obj) {
		// When calculating names for effects, they should have a name, but if not you can try to use their op.
		obj.namePattern = obj.namePattern || obj.name || String.uncamelTypeId(obj.typeId || obj.op || '');
		if( obj.namePattern == obj.op ) {
			console.log('fallback to op');
		}
		if( !obj.namePattern ) {
			debugger;
		}
		obj.name  = String.tokenReplace(obj.namePattern,obj);
		obj.aboutPattern = obj.aboutPattern || obj.about || '';
		obj.about = String.tokenReplace(obj.aboutPattern,obj);
	}

	String.tokenReplace = function(s,obj) {
		return s.replace(/{([%]*)([?]*)([+]*)(\w+)}|([\w\s]+)/g,function(whole,pct,hasQ,plus,key,words) {
			if( words !== undefined ) return words;

			let isPercent = pct=='%';
			let isPlus = plus=='+';
			let useOf = hasQ=='?';

			if( (useOf || isPlus) && obj[key] === undefined ) {
				return '';
			}
			if( typeof obj[key] == 'number' ) {
				if( isPlus && !obj[key] ) return '';
				let p = isPlus && obj[key] ? ' +' : '';
				return p+(obj[key] * (isPercent?100:1))+(isPercent?'%':'');
			}
			if( obj[key] === false ) {
				return '';
			}
			if( typeof obj[key] == 'string' ) {
				if( obj[key] === '' ) return '';
				return (useOf && obj[key] ? ' of ' : '')+obj[key];
			}
			if( Array.isArray(obj[key]) ) {
				return obj[key].join(',');
			}
			if( typeof obj[key] == 'object' ) {
				if( obj[key] ) {
					if( obj[key].name === false || obj[key].name === '' ) return '';
					if( !obj[key].name && !obj[key].typeId ) debugger;
					let name = obj[key].name || String.uncamelTypeId(obj[key].typeId || 'NOTYPE2');
					return (useOf && name ? ' of ' : '')+(name || 'NONAME ['+key+']');
				}
			}
			debugger;
			return 'UNKNOWN '+key;
		});
	}

	Date.makeUid = (function() {
		let codes = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
		let counter = 0;

		return function() {
			counter = (counter+1)%100000;	// assumes we won't make more than n items in the same millisecond
			let n = Math.floor(Date.now()/1000)*100000 + counter;
			let uid = '';
			while( n > 0 ) {
				let q = n - Math.floor(n/codes.length)*codes.length;
				n = Math.floor(n/codes.length);
				uid += codes.charAt(q);
			}
			return uid;
		}
	})();

	Date.makeEntityId = (function() {
		let humanNameList = null;
		let shuffled = false;

		return function(typeId,level) {
			if( !shuffled && getHumanNameList ) {
				humanNameList = Array.shuffle(getHumanNameList());
				shuffled = true;
			}

			let id = (humanNameList?pick(humanNameList)+'.':'')+typeId+(level?'.'+level:'')+'.'+Date.makeUid();
			return id;
		}

	})();

});

Module.add('utilities2',function() {

	let Cookie = {
		set: function(name,value,days) {
			var expires = "";
			if( days === undefined ) {
				days = 365*10;
			}
			if (days) {
				var date = new Date();
				date.setTime(date.getTime() + (days*24*60*60*1000));
				expires = "; expires=" + date.toUTCString();
			}
			document.cookie = name + "=" + (value || "")  + expires + "; path=/";
		},
		get: function(name) {
			var nameEQ = name + "=";
			var ca = document.cookie.split(';');
			for(var i=0;i < ca.length;i++) {
				var c = ca[i];
				while (c.charAt(0)==' ') c = c.substring(1,c.length);
				if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
			}
			return null;
		},
		erase: function(name) {   
			document.cookie = name+'=; Max-Age=-99999999;';  
		}
	}

	function pick(listRaw) {
		let list = listRaw;
		if( typeof list == 'object' && !Array.isArray(list) ) {
			var keys = Object.keys(list);
			if( keys.length <= 0 ) {
				return null;
			}
			let n;
			do {
				n = Math.randInt(0,keys.length);
			} while( list[keys[n]].neverPick );

		    return list[keys[n]];
		}
		return list.length==0 ? null : list[Math.randInt(0,list.length)];
	}


	function shootRange(x1,y1,x2,y2,testFn,onStep) {
		x1=Math.floor(x1);
		y1=Math.floor(y1);
		x2=Math.floor(x2);
		y2=Math.floor(y2);
		// Define differences and error check
		var dx = Math.abs(x2 - x1);
		var dy = Math.abs(y2 - y1);
		var sx = (x1 < x2) ? 1 : -1;
		var sy = (y1 < y2) ? 1 : -1;
		var err = dx - dy;

		let ok = true;
		if( onStep ) onStep(x1,y1,ok);
		while (!((x1 == x2) && (y1 == y2))) {
			var e2 = err << 1;
			if (e2 > -dy) {
				err -= dy;
				x1 += sx;
			}
			if (e2 < dx) {
				err += dx;
				y1 += sy;
			}
			ok = ok && testFn(x1,y1);
			if( onStep ) onStep(x1,y1,ok);
		}
		return ok;
	}

	let Distance = {
		get:		(dx,dy)				=> Math.sqrt(dx*dx+dy*dy),
		within:		(dx,dy,dist)		=> (dx*dx)+(dy*dy) < dist*dist,
		squared:	(dx,dy)				=> (dx*dx)+(dy*dy),
		cast:		(cx,cy,rads,radius) => [cx+Math.cos(rads)*radius,cy+Math.sin(rads)*radius],
		clockPick:	(cx,cy,radius)		=> {
			console.assert( Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(radius) );
			let rads = Math.random()*2*Math.PI;
			let x = cx+Math.cos(rads)*(radius+0.00001);
			let y = cy+Math.sin(rads)*(radius+0.00001);
			console.assert( Distance.get(x-cx,y-cy) >= radius );
			return [x,y];
		}
	};

	// All these curvese take input from 0 to 1 and return a value from 0 to 1
	let Curve = {
		bounded:	(pct) =>	Math.clamp(pct,0.0,1.0),
		linear:		(pct) =>	pct,
		inverse: 	(pct) =>	1-pct,
		// Rises a bit slowly. at 70% it is only half way
		squared:	(pct) =>	pct*pct,
		// Rises a bit fast. at 50% it hits 75%
		invSquared:	(pct) =>	1-(1-pct)*(1-pct),
		// Rises slowly. at 80% it is only half way
		cubed:		(pct) =>	pct*pct*pct,
		// Rises fast. At 10% it hits 27%, at 25% it hits 58%, at 50% it hits 87%
		invCubed:	(pct) =>	1-(1-pct)*(1-pct)*(1-pct),
		sine:		(pct) =>	Math.sin( pct * Math.PI / 2),
		// Nice S centered on 0.5. Touches 0 and 1 within 0.01%
		logistic:	(pct) =>	1.005 / ( 1+ Math.pow(Math.E,-12*(x-0.5)) ) - 0.0025,
	};

	let Hash = Object;

	class Finder {
		constructor(source) {
			if( source && !Array.isArray(source) ) {
				this.result = Object.values( source );
			}
			else {
				this.result = source ? source.slice() : [];
			}
		}
		get first() {
			return this.result[0];
		}
		get all() {
			return this.result;
		}
		get count() {
			return this.result.list;
		}
		find( fn ) {
			return this.result.find( fn );
		}
		filter(fn) {
			if( fn ) {
				this.result = this.result.filter(fn);
			}
			return this;
		}
		pick( fn ) {
			let n = Math.randInt(0,this.result.length);
			return this.result[n];
		}
	}


	class ListManager {
		constructor(list=[]) {
			this.list = list;
			this.validatorFn = null;
		}
		setValidator(validatorFn) {
			this.validatorFn = validatorFn;
			return this;
		}
		get length() {
			return this.list.length;
		}
		add( element ) {
			console.assert( element );
			if( this.validatorFn ) {
				this.validatorFn(element);
			}
			this.list.push( element );
			return element;
		}
		push( element ) {
			return this.add(element);
		}
		duplicate() {
			let m = new ListManager( this.list.slice(), this.validatorFn );
			return m;
		}
		filter( fn ) {
			return this.list.filter(fn);
		}
		remove( fn ) {
			return Array.filterInPlace( this.list, (...args)=>!fn(...args) );
		}
		map( fn ) {
			return this.list.map( fn );
		}
		find( fn ) {
			return this.list.find( fn );
		}
		sort( fn ) {
			return this.list.sort( fn );
		}
		best( fn ) {
			let bestDelta = null;
			let bestElement = null;
			this.traverse( element => {
				let delta = fn(element);
				if( delta === false ) {
					return;
				}
				if( bestDelta === null || delta < bestDelta ) {
					bestDelta = delta;
					bestElement = element;
				}
			});
			return bestElement;
		}
		pick(fn) {
			if( !fn ) {
				fn = () => { return true; };
			}
			let legalList = this.list.filter( fn );
			let n = Math.randInt(0,legalList.length);
			return legalList[n];
		}
		get finder() {
			return new Finder(this.list);
		}
		count(fn) {
			return this.sum( element => fn(element) ? 1 : 0 );
		}
		sum(fn) {
			let total = 0;
			this.traverse( element => total += fn(element) );
			console.assert( Number.isFinite(total) );
			return total;
		}
		reduce(fn) {
			return this.list.reduce(fn);
		}
		traverse( fn ) {
			return this.list.forEach( fn );
		}
		shuffle() {
			let a = Array.shuffle( this.list );
			console.assert( a===this.list && a[0] !== undefined ); 
			return this.list;
		}
	}

	class HashManager {
		constructor() {
			this.hash = {};
		}
		add(id,data) {
			console.assert( !data.id || data.id == id );
			this.hash[id] = data;
			data.id = id;
		}
		get(id) {
			return this.hash[id];
		}
		pickId() {
			let list = Object.keys( this.hash );
			return list[Math.randInt(0,list.length)];
		}
		get count() {
			return Object.count(this.hash);
		}
		find(fn) {
			return Object.find( this.hash, fn );
		}
		traverse(fn) {
			return Object.each( this.hash, fn );
		}
	}


	return {
		Cookie: Cookie,
		Hash: Hash,
		Distance: Distance,
		Curve: Curve,
		Finder: Finder,
		ListManager: ListManager,
		HashManager: HashManager,
		pick: pick,
		shootRange: shootRange
	}
});