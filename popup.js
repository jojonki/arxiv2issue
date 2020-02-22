"use strict";

let ARXIV_URL = 'https://arxiv.org/*';

function postIssue(arxiv_url, tab) {
    $.ajax({
        type: "GET",
        url: arxiv_url,
        success: function (data) {
            let $dom = $($.parseHTML(data));
            let title = $dom.find('h1.title').text().split('Title:')[1];
            let authors = $dom.find('div.authors').text().split('Authors:')[1];
            authors = authors.replace(/\n/g, '');
            let comment = $dom.find('div.metatable').find('.comments').text();
            let info = null;
            let date = $dom.find('div.dateline').text().trim()
            let year = '';
            let pattern = /\s?([12]{1}\d{3})\)?/; // 1XXXX or 2XXXX
            let result = date.match(pattern);
            if (result != undefined && result.length > 1) {
                year = result[1];
            }

            if (comment != '') {
                info = [title, authors, comment, arxiv_url].join('\n');
            } else {
                info = [title, authors, arxiv_url].join('\n');
            }
            copyToClipboard(info);
            getIssues(title, info, year, function(issues) {
                createIssue(title, info, year, issues, showPopup);
            });

            // hide popup automatically
            setTimeout(function () {
                window.close();
            }, 10000);
        }
    });
}

function getCurrentTabUrl(callback) {
    let queryInfo = {
        url: ARXIV_URL,
        active: true,
        currentWindow: true
    };

    chrome.tabs.query(queryInfo, (tabs) => {
        if (tabs.length > 0) {
            let tab = tabs[0];
            let url = tab.url;
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

function getIssues(title, body, year, callback) {
    let base_url = 'https://api.github.com/repos';
    chrome.storage.sync.get(['uname', 'repo', 'token'], function(data) {
        let uname = data.uname;
        let repo = data.repo;
        let token = data.token;
        let url = [base_url, uname, repo, 'issues'].join('/');

        console.log('URL: ' + url);

        let request = new XMLHttpRequest();
        request.open('GET', url);
        request.setRequestHeader('Authorization', 'Bearer ' + token);
        request.onreadystatechange = function () {
            if (request.readyState != 4) {
            } else if (request.status != 200) {
                console.log(request.responseText);
                callback('Failed to post an issue.');
            } else {
                let resp = JSON.parse(request.responseText);
                let issues = []
                for (let i=0; i<resp.length; i++) {
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

function createIssue(title, body, year, issues, callback) {
    let base_url = 'https://api.github.com/repos';
    chrome.storage.sync.get(['uname', 'repo', 'token'], function(data) {
        let uname = data.uname;
        let repo = data.repo;
        let token = data.token;
        console.log(issues);
        let url = [base_url, uname, repo, 'issues'].join('/');
        // url = url += '?access_token=' + token;
        // alert('POST URL: ' + url);

        console.log('TITLE:' + title);
        let issue_title = ['🚧', year + ':', title].join(' ');
        let duplicated_issue = null;
        for (let i=0; i<issues.length; i++) {
            console.log('registered issue: ' + issues[i].title);
            if (issues[i].title.indexOf(title) >= 0) {
                duplicated_issue = issues[i];
                break;
            }
        }

        if (duplicated_issue) {
            callback('You have already posted this paper, ', uname, repo, duplicated_issue.number);
        } else {
            let data = JSON.stringify({
                'title': issue_title,
                'body': body
            });

            let request = new XMLHttpRequest();
            request.open('POST', url);
            request.setRequestHeader('Authorization', 'Bearer ' + token);
            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            request.setRequestHeader('Accept', 'application/vnd.github.symmetra-preview+json');
            request.onreadystatechange = function () {
                if (request.readyState != 4) {
                } else if (request.status != 201) {
                    alert(request.status + " " + request.responseText);
                    callback('Failed to post an issue. ' + request.responseText);
                } else {
                    let resp = JSON.parse(request.responseText);
                    callback('Issue posted!', uname, repo, resp.number);
                }
            };
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
        let url = 'https://github.com/' + uname + '/' + repo + '/issues/' + issue_num;
        $('#result').html('<a target="_blank" href="' + url + '">' + msg + ' #' + issue_num + '</a>');
    } else {
        $('#result').text(msg);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    getCurrentTabUrl((url, tab) => {
        if (url.startsWith("https://arxiv.org/pdf/")) {
            // from pdf page to abs page
            url = url.replace('\.pdf', '');
            url = url.replace('pdf', 'abs');
            postIssue(url, tab);
        } else if (url.startsWith('https://arxiv.org/abs/')) {
            postIssue(url, tab);
        } else {
            $('#result').text('Unknown arXiv page style');

            // hide popup automatically
            setTimeout(function () {
                window.close();
            }, 6000);
        }
    });
});
