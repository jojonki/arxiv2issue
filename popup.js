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

function get_issues(title, body, year, callback) {
    var base_url = 'https://api.github.com/repos';
    chrome.storage.sync.get(['uname', 'repo', 'token'], function(data) {
        var uname = data.uname;
        var repo = data.repo;
        var token = data.token;
        var url = [base_url, uname, repo, 'issues'].join('/');

        var url = url += '?access_token=' + token;
        console.log('URL: ' + url);

        var request = new XMLHttpRequest();
        request.open('GET', url);
        request.onreadystatechange = function () {
            if (request.readyState != 4) {
            } else if (request.status != 200) {
                console.log(request.responseText);
                callback('Failed to post an issue.');
            } else {
                var resp = JSON.parse(request.responseText);
                var issues = []
                for (var i=0; i<resp.length; i++) {
                    issues.push({
                        'title': resp[i].title,
                        'html_url': resp[i].html_url,
                        'number': resp[i].number
                    });
                }
                console.log(issues);
                callback(issues);
            }
        };
        request.send();
    });
}

function create_issue(title, body, year, issues, callback) {
    var base_url = 'https://api.github.com/repos';
    chrome.storage.sync.get(['uname', 'repo', 'token'], function(data) {
        var uname = data.uname;
        var repo = data.repo;
        var token = data.token;
        console.log(issues);
        var url = [base_url, uname, repo, 'issues'].join('/');

        var url = url += '?access_token=' + token;
        console.log('URL: ' + url);

        console.log('TITLE:' + title);
        var issue_title = ['🚧', year + ':', title].join(' ');
        duplicated_issue = null;
        for (var i=0; i<issues.length; i++) {
            if (issues[i].title.indexOf(title) >= 0) {
                duplicated_issue = issues[i];
                break;
            }
        }

        if (duplicated_issue) {
            callback('You have already posted this paper, ', uname, repo, duplicated_issue.number);
        } else {
            var data = JSON.stringify({
                'title': issue_title,
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
                    callback('Issue posted!', uname, repo, resp.number);
                }
            };
            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            request.setRequestHeader('Accept', 'application/vnd.github.symmetra-preview+json');
            request.send(data);
        }
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

function showPopup(msg, uname, repo, issue_num) {
    if (issue_num) {
        var url = 'https://github.com/' + uname + '/' + repo + '/issues/' + issue_num;
        $('#result').html('<a target="_blank" href="' + url + '">' + msg + ' #' + issue_num + '</a>');
    } else {
        $('#result').text(msg);
    }
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
            var date = $dom.find('div.dateline').text().trim()
            var year = '';
            var pattern = /\s?([12]{1}\d{3})\)?/; // 1XXXX or 2XXXX
            result = date.match(pattern);
            if (result != undefined && result.length > 1) {
                year = result[1];
            }

            if (comment != '') {
                info = [title, authors, comment, url].join('\n');
            } else {
                info = [title, authors, url].join('\n');
            }

            copyToClipboard(info);
            get_issues(title, info, year, function(issues) {
                create_issue(title, info, year, issues, showPopup);
            });

            // hide popup automatically
            setTimeout(function () {
                window.close();
            }, 6000);
        });
    });
});
