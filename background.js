// Listener for Chrome extension installation event. Creates context menu options when the extension is installed.
chrome.runtime.onInstalled.addListener(() => {
    createContextMenus();
});

/**
 * Creates the context menu items for the extension.
 */
function createContextMenus() {
    createContextMenuItem("define", "Define");
    createContextMenuItem("factCheck", "Fact-Check");
    createContextMenuItem("analyze", "Analyze");
}

/**
 * Creates a context menu item.
 * 
 * @param {string} id - The ID for the context menu item.
 * @param {string} title - The title displayed for the context menu item.
 */
function createContextMenuItem(id, title) {
    chrome.contextMenus.create({
        id: id,
        title: title,
        contexts: ["selection"]
    });
}

/**
 * Handles clicks on context menu items. Sends messages to the content script based on the clicked menu item.
 * 
 * @param {Object} info - Information about the clicked context menu item, including selected text.
 * @param {Object} tab - Details of the active tab where the context menu was clicked.
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {

    // Inject the necessary scripts and styles for the context menu action
    await injectScriptsAndStyles(tab.id);

    // Handle specific context menu actions based on the selected item
    handleContextMenuAction(info, tab);
});

/**
 * Injects required styles into the current tab.
 * 
 * @param {number} tabId - The ID of the active tab where styles need to be injected.
 */
async function injectScriptsAndStyles(tabId) {
    try {
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ["./content/bubbles/bubbles.css"]
        });
    } catch (error) {
        console.error("Error injecting scripts and styles:", error);
    }
}

/**
 * Handles the specific action based on the clicked context menu item.
 * 
 * @param {Object} info - Information about the clicked menu item, including the selected text.
 * @param {Object} tab - Details of the active tab where the context menu was clicked.
 */
function handleContextMenuAction(info, tab) {
    const actionMap = {
        "define": "displayDefineBubble",
        "factCheck": "displayFactCheckBubble",
        "analyze": "displayAnalysisBubble"
    };

    const action = actionMap[info.menuItemId];

    // Check if selected text exists and the action is valid
    if (action && info.selectionText) {
        try {
            // Send the appropriate action to the content script
            chrome.tabs.sendMessage(tab.id, { action: action, selectedText: info.selectionText });
        } catch (error) {
            console.error("Error in context menu action:", error);
        }
    }
}
