async function getInitialCommitsUrl({ owner, repo } = {}) {
    async function request(page) {
        console.log(owner);

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=100&page=${page}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch data, may be a private repo`);
        }

        const linkHeader = response.headers.get('Link');
        const data = await response.json();

        if (!linkHeader || page !== 1) {
            return data[data.length - 1];
        }
        console.log(linkHeader);

        const lastPage = parseLinkHeader(linkHeader);

        if (lastPage !== -1 && page !== lastPage) {
            return request(lastPage);
        }

        return data[data.length - 1];
    }

    return request(1);
}

function parseLinkHeader(header) {
    if (!header || header.length === 0) {
        return -1;
    }

    let lastPage = -1;
    const parts = header.split(',');
    parts.forEach(part => {
        const section = part.split(';');
        const urlPart = section[0].trim();
        const relPart = section[1].trim();

        if (relPart.includes('rel="last"')) {
            const match = urlPart.match(/[\?&]page=(\d+)/);
            if (match) {
                lastPage = parseInt(match[1], 10);
            }
        }
    });
    return lastPage;
}

async function loadFirstCommit(info, tab) {
    try {
        const pageUrl = info.pageUrl.replace(/.+:\/\/(www\.)?github.com\/?/, '');
        const [owner, repo] = pageUrl.split('/');
        console.log(owner);
        const url = await getInitialCommitsUrl({ owner, repo });
        console.log(url.html_url);
        chrome.tabs.update(tab.id, {
            url: url.html_url
        });
    } catch (error) {
        console.error('Error in loadFirstCommit:', error);
        showError(tab)
    }
}

console.log("init.........");

chrome.contextMenus.create({
    id: 'firstCommitMenuItemAA45',
    title: 'Go to Initial Commit',
    documentUrlPatterns: ['*://github.com/*/*'],
    contexts: ['all'],
});

// Listen for clicks on the context menu
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'firstCommitMenuItemAA45') {
        console.log("clicked......");
        loadFirstCommit(info, tab);
    }
});

// function showError(tab) {
//     chrome.scripting.executeScript({
//         target: { tabId: tab.id },
//         function: alertUser,
//     });
// }

// function alertUser() {
//     alert("Failed to fetch data, may be a private repo or some unknown reason");
// }

function showError(tab) {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: alertUser,
        args: ["Failed to fetch data, may be a private repo or some unknown reason"]
    });
}

function alertUser(errorMessage) {
    alert(errorMessage);
}