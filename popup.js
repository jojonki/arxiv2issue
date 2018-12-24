ARXIV_URL = 'https://arxiv.org/*';

function getCurrentTabUrl(callback) {
	var queryInfo = {
		url: ARXIV_URL,
		active: true,
		currentWindow: true
	};

	chrome.tabs.query(queryInfo, (tabs) => {
		if (tabs.length > 0) {
			var tab = tabs[0];
			var url = tab.url;
			console.assert(typeof url == 'string', 'tab.url should be a string');
			callback(url);
		} else {
			$('#result').text('not arXiv!');
		}
	});
}

function modifyDOM() {
	return document.body.innerHTML;
}

function create_issue(title, body, year, callback) {
	var base_url = 'https://api.github.com/repos';
	chrome.storage.sync.get(['uname', 'repo', 'token'], function(data) {
		var uname = data.uname;
		var repo = data.repo;
		var token = data.token;
		var url = [base_url, uname, repo, 'issues'].join('/');

		var url = url += '?access_token=' + token;
		console.log('URL: ' + url);

		var data = JSON.stringify({
			'title': ['🚧', year + ':', title].join(' '),
			'body': body
		});
		var request = new XMLHttpRequest();
		request.open('POST', url);
		request.onreadystatechange = function () {
			if (request.readyState != 4) {
			} else if (request.status != 201) {
				console.log(request.responseText);
				callback('Failed to post an issue.');
			} else {
				var resp = JSON.parse(request.responseText);
				callback('Issue posted!: #' + resp.number);

			}
		};
		request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		request.setRequestHeader('Accept', 'application/vnd.github.symmetra-preview+json');
		request.send(data);
	});
}

function copyToClipboard(text) {
	const input = document.createElement('textarea');
	input.style.position = 'fixed';
	//input.style.opacity = 0;
	input.value = text;
	document.body.appendChild(input);
	input.select();
	document.execCommand('Copy');
	document.body.removeChild(input);
};

function showPopup(msg) {
	$('#result').text(msg);
}

document.addEventListener('DOMContentLoaded', () => {
	getCurrentTabUrl((url) => {
		chrome.tabs.executeScript({
			code: '(' + modifyDOM + ')();' //argument here is a string but function.toString() returns function's code
		}, (results) => {
			var $dom = $($.parseHTML(results[0]));
			var title = $dom.find('h1.title').text().split('Title:')[1];
			var authors = $dom.find('div.authors').text().split('Authors:')[1];
			var authors = authors.replace(/\n/g, '');
			var comment = $dom.find('div.metatable').find('.comments').text();
			var date = $dom.find('div.dateline').text().split(' ')
			var year = date[date.length - 1]; // "2018)"
			year = year.substring(0, year.length - 1) // remove last character ")"

			if (comment != '') {
				info = [title, authors, comment, url].join('\n');
			} else {
				info = [title, authors, url].join('\n');
			}

			copyToClipboard(info);
			// $('#result').text('copied!!');
			create_issue(title, info, year, showPopup);

			// hide popup automatically
			setTimeout(function () {
				window.close();
			}, 3000);
		});
	});
});
