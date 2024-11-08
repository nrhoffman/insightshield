chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "define",
        title: "Define",
        contexts: ["selection"]
    });
    chrome.contextMenus.create({
        id: "factCheck",
        title: "Fact-Check",
        contexts: ["selection"]
    });
    chrome.contextMenus.create({
        id: "analyze",
        title: "Analyze",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    // Inject the content script
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["./dist/content.bundle.js"]
    });

    // Inject the CSS
    await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["./content/content.css"]
    });

    // Define Button is pushed
    if (info.menuItemId === "define" && info.selectionText) {
        try {

            // Send the message to display the fact-check bubble
            chrome.tabs.sendMessage(tab.id, { action: "displayDefineBubble", selectedText: info.selectionText });

        } catch (error) {
            console.error("Error in context menu action:", error);
        }
    }

    // Fact Check Button is pushed
    else if (info.menuItemId === "factCheck" && info.selectionText) {
        try {

            // Send the message to display the fact-check bubble
            chrome.tabs.sendMessage(tab.id, { action: "displayFactCheckBubble", selectedText: info.selectionText });

        } catch (error) {
            console.error("Error in context menu action:", error);
        }
    }

    // Analyze Button is pushed
    else if (info.menuItemId === "analyze" && info.selectionText) {
        try {

            // Send the message to display the fact-check bubble
            chrome.tabs.sendMessage(tab.id, { action: "displayAnalysisBubble", selectedText: info.selectionText });

        } catch (error) {
            console.error("Error in context menu action:", error);
        }
    }
});