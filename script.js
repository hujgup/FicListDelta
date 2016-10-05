function FicList(text) {
	var _text = text;
	this.ficsByUrl = {};
	this.removedFics = {};

	this.reconstructLine = function(url) {
		var res = "";
		if (this.ficsByUrl.hasOwnProperty(url)) {
			res += "<a href='"+url+"' target='_blank'>";
			res += this.ficsByUrl[url];
			res += "</a>";
		}
		return res;
	};
	this.delta = function(newerList) {
		var delta = new FicList();
		var unseen = Object.keys(this.ficsByUrl);
		var index;
		for (var url in newerList.ficsByUrl) {
			if (newerList.ficsByUrl.hasOwnProperty(url)) {
				if (!this.ficsByUrl.hasOwnProperty(url)) {
					delta.ficsByUrl[url] = newerList.ficsByUrl[url];
				}
				index = unseen.indexOf(url);
				if (url !== -1) {
					unseen.splice(index,1);
				}
			}
		}
		for (var i = 0; i < unseen.length; i++) {
			delta.removedFics[unseen[i]] = this.ficsByUrl[unseen[i]];
		}
		return delta;
	};
	this.getRawText = function() {
		return _text;
	};
	this.save = function() {
		return new Promise(function(resolve,reject) {
			var obj = {};
			obj[FicList.STORAGE_KEY] = _text;
			chrome.storage.local.set(obj,function() {
				if (chrome.runtime.lastError) {
					reject(chrome.runtime.lastError);
				} else {
					resolve();
				}
			});
		});
	};

	if (typeof text !== "undefined") {
		var startIndex = text.indexOf(FicList.START_STRING);
		if (startIndex !== -1) {
			var lines = text.substring(startIndex + FicList.START_STRING.length + 1).split("\n");
			var line;
			var match;
			for (var i = 0; i < lines.length; i++) {
				line = lines[i];
				match = FicList.ENTRY_REGEX.exec(line);
				if (match !== null) {
					this.ficsByUrl[match[1]] = match[2];
				}
			}
		}
	}
}
FicList.START_STRING = "Entry-level fics:";
FicList.ENTRY_REGEX = /^(https?:\/\/\S+?) - ([\s\S]+)$/;
FicList.STORAGE_KEY = "localList";
FicList.fromFile = function() {
	return new Promise(function(resolve,reject) {
		chrome.storage.local.get(FicList.STORAGE_KEY,function(items) {
			if (chrome.runtime.lastError) {
				resolve(new FicList());
			} else {
				resolve(new FicList(items[FicList.STORAGE_KEY]));
			}
		});
	});
};
FicList.fromPastebin = function() {
	return new Promise(function(resolve,reject) {
		var req = new XMLHttpRequest();
		req.open("GET","http://echostuff.net/ext/fic-list-delta/get.php",true);
		req.onload = function() {
			if (req.status === 200) {
				resolve(new FicList(req.responseText));
			} else {
				reject(req);
			}
		};
		req.onerror = function() {
			reject(req);
		};
		req.send();
	});
};

var LAST_CHANGES_KEY = "localLastChanges";
function getLastChanges() {
	return new Promise(function(resolve,reject) {
		chrome.storage.local.get(LAST_CHANGES_KEY,function(items) {
			if (chrome.runtime.lastError) {
				reject();
			} else {
				resolve(items[LAST_CHANGES_KEY]);
			}
		});
	});
}
function setLastChanges(html) {
	return new Promise(function(resolve,reject) {
		var obj = {};
		obj[LAST_CHANGES_KEY] = html;
		chrome.storage.local.set(obj,function() {
			if (chrome.runtime.lastError) {
				reject(chrome.runtime.lastError);
			} else {
				resolve();
			}
		});
	});

}

var localPromise = FicList.fromFile();
var masterPromise = FicList.fromPastebin();
window.addEventListener("DOMContentLoaded",function() {
	var secChanges = document.getElementById("changes");
	var secLast = document.getElementById("last");
	var secRaw = document.getElementById("raw");
	localPromise.then(function(local) {
		masterPromise.then(function(master) {
			var savePromise = master.save();
			var delta = local.delta(master);
			var change = [];
			for (var url in delta.ficsByUrl) {
				if (delta.ficsByUrl.hasOwnProperty(url)) {
					change.push(delta.reconstructLine(url));
				}
			}
			for (var url in delta.removedFics) {
				if (delta.removedFics.hasOwnProperty(url)) {
					change.push("[REMOVED] ==> "+local.reconstructLine(url));
				}
			}

			secChanges.textContent = "";
			secLast.textContent = "";
			secRaw.textContent = "";
			var pre = document.createElement("pre");
				pre.className = "raw";
				pre.textContent = master.getRawText().trim();
			secRaw.appendChild(pre);

			if (change.length === 0) {
				var p = document.createElement("p");
					p.textContent = "None.";
				secChanges.appendChild(p);
				getLastChanges().then(function(html) {
					secLast.innerHTML = html;
				},function(err) {
					console.error(err);
				});
			} else {
				var p;
				for (var i = 0; i < change.length; i++) {
					p = document.createElement("p");
						p.className = "no-margin";
						p.innerHTML = change[i];
					secChanges.appendChild(p);
				}
				secLast.textContent = "See above.";
				setLastChanges(secChanges.innerHTML).then(function() {
				},function(err) {
					console.log(err);
				});
			}
			savePromise.then(function() {
			},function(err) {
				console.error(err);
			});
		},function(req) {
			console.error(req);
		});
	},function(err) {
		console.error(err);
	});
});












