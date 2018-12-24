// Saves options to chrome.storage
function save_options() {
	var uname = document.getElementById('user-name').value;
	var repo  = document.getElementById('repo').value;
	var token = document.getElementById('token').value;
	chrome.storage.sync.set({
		uname : uname,
		repo  : repo,
		token : token
	}, function() {
		var status = document.getElementById('status');
		status.textContent = 'Options saved.';
		setTimeout(function() {
			status.textContent = '';
		}, 750);
	});
}

// Restores values
function restore_options() {
	chrome.storage.sync.get({
		uname: '',
		repo: '',
		token: ''
	}, function(items) {
		document.getElementById('user-name').value = items.uname;
		document.getElementById('repo').value = items.repo;
		document.getElementById('token').value = items.token;
	});
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
