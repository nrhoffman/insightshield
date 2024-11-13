let listenersInitialized = false;
let typingInterval = null;

const summarizeButton = document.getElementById('summarizeButton');
const sendButton = document.getElementById('sendButton');
const checkboxes = document.querySelectorAll('input[name="readingLevel"]');
const rewriteButton = document.getElementById('rewriteButton');
const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('chatInput');

/**
 * Message listener function to handle sidebar communication with the content script.
 */
const onMessageListener = (request, sender, sendResponse) => {

    switch (request.action) {
        case "activateButtons":
            summarizeButton.disabled = false;
            rewriteButton.disabled = false;
            rewriteButton.textContent = "Rewrite";
            sendButton.disabled = false;
            initChatBot();
            break;
        case "activateButtonsNotRewrite":
            summarizeButton.disabled = false;
            sendButton.disabled = false;
            initChatBot();
            break;
        case "initChatBot":
            initChatBot();
            break;
        case "setChatBotOutput":
            setChatBotOutput(request.output);
            break;
    }
};

/**
 * Initialize Chat Bot button and window
 */
function initChatBot() {
    chatWindow.innerHTML = '';

    // Create a chatbot message bubble
    const botMessage = document.createElement('div');
    botMessage.className = 'bot-message';
    botMessage.textContent = "I'm ready for any questions.";
    chatWindow.appendChild(botMessage);
}

/**
 * Updates the chat window with chatbot output and scrolls to the bottom.
 * @param {string} output - The chatbot's response text.
 */
function setChatBotOutput(output) {

    // Stop the typing indicator animation
    clearTypingIndicatorAnimation();

    // Remove typing indicator from chat window
    const typingIndicator = chatWindow.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }

    // Create a chatbot message bubble for the output
    const botMessage = document.createElement('div');
    botMessage.className = 'bot-message';
    botMessage.innerHTML = output;

    // Append the bot message to the chat window and scroll to the bottom
    chatWindow.appendChild(botMessage);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

/**
 * Initializes the message listeners and button event listeners only once.
 */
function initializeListeners() {
    if (!listenersInitialized) {
        chrome.runtime.onMessage.addListener(onMessageListener);
        listenersInitialized = true;

        // Attach button event listeners
        summarizeButton.addEventListener('click', summarizeContent);
        rewriteButton.addEventListener('click', rewriteContent);
        sendButton.addEventListener('click', sendChatMessage);
        userInput.addEventListener("keydown", function(event) {
            // Check if the key pressed is "Enter"
            if (event.key === "Enter") {
                // Prevent the default behavior (i.e., adding a new line)
                event.preventDefault();
                
                // Simulate a click on the send button
                sendButton.click();
            }
        });
    }
}

/**
 * Remove all message and button listeners to prevent memory leaks.
 */
function removeListeners() {
    if (listenersInitialized) {
        chrome.runtime.onMessage.removeListener(onMessageListener);
        summarizeButton.removeEventListener('click', summarizeContent);
        rewriteButton.removeEventListener('click', rewriteContent);
        sendButton.removeEventListener('click', sendChatMessage);
        listenersInitialized = false;
    }
}

/**
 * Ensure listeners are removed when the popup window is closed.
 */
chrome.windows.onRemoved.addListener(removeListeners);

/**
 * Runs when the popup window is opened and initializes content and message listeners.
 */
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tabId = tabs[0].id;

    // Ensure only one checkbox is selected at a time
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            checkboxes.forEach(cb => {
                if (cb !== this) cb.checked = false;
            });
        });
    });

    // Inject necessary scripts and CSS when the popup opens
    await injectScripts(tabId);

    // Send message to check status and initialize model if needed
    const status = await checkStatus(tabId);

    // Initialize listeners if the model isn't running or initialized
    if (status.notRunning === "yes" && status.initialized === "no") {
        chrome.tabs.sendMessage(tabId, { action: "initializeModel", tabId: tabId });
    }

    // Update button states based on model status
    updateButtonStates(status);

    // Initialize listeners after setup
    initializeListeners();
});

/**
 * Injects the CSS into the active tab.
 */
async function injectScripts(tabId) {
    await chrome.scripting.insertCSS({
        target: { tabId: tabId },
        files: ["./content/sidebar/sidebar.css"]
    });

    chrome.tabs.sendMessage(tabId, { action: "showSidebar", tabId: tabId });
}

/**
 * Check the current status of the tab to determine which actions to take.
 */
async function checkStatus(tabId) {
    return chrome.tabs.sendMessage(tabId, { action: "getStatuses", tabId: tabId });
}

/**
 * Update button states based on the current status of the model.
 */
function updateButtonStates(status) {

    if (status.notRunning === "yes" && status.initialized === "yes") {
        summarizeButton.disabled = false;
        sendButton.disabled = false;
        initChatBot();
    }

    if (status.summarized === "yes" && status.notRunning === "yes") {
        rewriteButton.disabled = false;
        rewriteButton.textContent = "Rewrite";
    }
}

/**
 * Handles the summarize button click event, sends message to summarize content.
 */
async function summarizeContent() {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const userInput = document.getElementById('userInput');

        // Disable buttons during summarization
        summarizeButton.disabled = true;
        rewriteButton.disabled = true;
        sendButton.disabled = true;

        console.log("Sending summarize message...");
        chrome.tabs.sendMessage(tabs[0].id, { action: "summarizeContent", focusInput: userInput.value });
    });
}

/**
 * Handles the rewrite button click event, sends message to rewrite content.
 */
async function rewriteContent() {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {

        // Get the selected reading level
        const selectedReadingLevel = getSelectedReadingLevel();

        // Disable buttons during rewrite
        summarizeButton.disabled = true;
        sendButton.disabled = true;
        rewriteButton.disabled = true;

        console.log("Sending rewrite message...");
        chrome.tabs.sendMessage(tabs[0].id, {
            action: "rewriteContent",
            readingLevel: selectedReadingLevel
        });
    });
}

/**
 * Returns the selected reading level based on checkbox selection.
 */
function getSelectedReadingLevel() {
    const childrenCheckbox = document.getElementById('childrenLevel');
    const collegeCheckbox = document.getElementById('collegeLevel');
    const currentCheckbox = document.getElementById('currentLevel');

    if (childrenCheckbox.checked) return `a children's reading level`;
    if (collegeCheckbox.checked) return 'a college reading level';
    if (currentCheckbox.checked) return `the reading level it's currently at`;
    return '';
}

/**
 * Handles the send button click event, sends user input to the chatbot.
 */
async function sendChatMessage() {
    const input = userInput.value.trim();
    if (!input) return; // Prevent empty messages from being sent

    // Clear the input field and disable the send button
    userInput.value = '';
    sendButton.disabled = true;
    summarizeButton.disabled = true;
    rewriteButton.disabled = true;

    // Create and append user message bubble to chat window
    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = input;
    chatWindow.appendChild(userMessage);

    // Check if an existing typing indicator exists and remove it
    const existingTypingIndicator = chatWindow.querySelector('.typing-indicator');
    if (existingTypingIndicator) existingTypingIndicator.remove();

    // Create and append typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.textContent = '...'; // Start with a single dot
    chatWindow.appendChild(typingIndicator);

    // Start the typing animation
    startTypingIndicatorAnimation(typingIndicator);

    // Scroll to the bottom of the chat window
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Send the input message to the background script or content script for chatbot processing
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "getChatBotOutput", chatInput: input });
    });
}

/**
 * Starts an animated typing indicator that cycles between ".", "..", and "..."
 * to simulate the chatbot "typing" while processing a response.
 * @param {HTMLElement} typingIndicator - The element displaying the typing animation.
 */
function startTypingIndicatorAnimation(typingIndicator) {
    let dotCount = 1;
    clearTypingIndicatorAnimation();
    typingInterval = setInterval(() => {
        typingIndicator.textContent = '.'.repeat(dotCount); // Update the text to ".", "..", "..."
        dotCount = (dotCount % 3) + 1; // Cycle dotCount between 1 and 3
    }, 500); // Update every 500ms
}

/**
 * Stops the typing indicator animation by clearing the interval.
 */
function clearTypingIndicatorAnimation() {
    if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
    }
}