// Listener for messages from sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const sendButton = document.getElementById('sendButton');
  const chatWindow = document.getElementById('chatWindow');
  const outputElement = document.createElement('p');
  outputElement.className = 'bot-p';

  switch (request.action) {
    // Turns off loading circle when analysis is complete
    case "turnOffLoadingCircle":
      const loadingSpinner = document.getElementById('loadingSpinner');
      loadingSpinner.style.display = 'none';
      document.getElementById('loadingContainer').classList.remove('active');
      break;

    // Activates analysis button when summary generation is complete
    case "activateAnalyzeButton":
      const analyzeButton = document.getElementById('analyzeButton');
      analyzeButton.disabled = false;
      analyzeButton.innerText = 'Analyze';
      break;

    // Activates chat bot send button when model is ready
    case "activateSendButton":
      sendButton.disabled = false;
      chatWindow.innerHTML = '';
      outputElement.textContent = `Chatbot: I'm ready for any questions.`;

      // Append the new output element to the chat window
      chatWindow.appendChild(outputElement);
      break;

    // Adds output message to chat
    case "setChatBotOutput":
      sendButton.disabled = false;
      outputElement.textContent = `Chatbot: ${request.output}`;

      // Append the new output element to the chat window
      chatWindow.appendChild(outputElement);

      // Scroll to the bottom of the chat window
      chatWindow.scrollTop = chatWindow.scrollHeight;
      break;
  }
});

// Run when popup is opened
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tabId = tabs[0].id;

  // Inject script and CSS once when popup opens
  await chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ["./sidebar/content.js"]
  });

  await chrome.scripting.insertCSS({
    target: { tabId: tabId },
    files: ["./sidebar/sidebar.css"]
  });

  // Fetches selected content from web page
  const pageContent = await chrome.scripting.executeScript({
    target: { tabId: tabs[0].id },
    func: getSelectionContent,
  });

  // Checks the amount of characters selected
  const currentCharCount = document.getElementById('currentCharCount');
  if (pageContent[0].result.length > 0) {
    currentCharCount.textContent = `(Current Characters Selected: ${pageContent[0].result.length})`;
    if (pageContent[0].result.length > 4000) {
      currentCharCount.style.color = 'red';
    } else {
      currentCharCount.style.color = 'white';
    }
  } else {
    currentCharCount.innerText = `(Current Characters Selected: 0)`;
  }

  // Send the message to initialize model
  chrome.tabs.sendMessage(tabId, { action: "initializeModel", tabId: tabId });

  // Send the message to show sidebar after script injection
  chrome.tabs.sendMessage(tabId, { action: "showSidebar", tabId: tabId });
});

// Summarize button is pressed
document.getElementById('summarizeButton').addEventListener('click', async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const userInput = document.getElementById('userInput');

    // Update Analyze Button State
    const analyzeButton = document.getElementById('analyzeButton');
    analyzeButton.innerText = 'Analyze After Summary Generation';
    analyzeButton.disabled = true;

    console.log("Sending summarize message...");
    chrome.tabs.sendMessage(tabs[0].id, { action: "summarizeContent", focusInput: userInput.value });
  });
});

// Analyze button is pressed
document.getElementById('analyzeButton').addEventListener('click', async () => {
  const loadingSpinner = document.getElementById('loadingSpinner');
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const pageContent = await chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: getSelectionContent,
    });

    const filteredText = pageContent[0].result
      .split('\n')
      .filter(line => (line.match(/ /g) || []).length >= 8)
      .join('\n');

    if (filteredText.length === 0 || filteredText.length > 4000) {
      const errorText = filteredText.length === 0
        ? "Text must be highlighted."
        : "Selected characters must be under 4000.";
      displayError(errorText);
      return;
    }

    loadingSpinner.style.display = 'inline-block';
    document.getElementById('loadingContainer').classList.add('active');
    sendToSidebar(filteredText);
  });
});

// Send button for chat bot is pressed
document.getElementById('sendButton').addEventListener('click', async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const userInput = document.getElementById('chatInput');
    const chatWindow = document.getElementById('chatWindow');
    const input = userInput.value;
    userInput.value = '';

    // Update Send Button State
    const sendButton = document.getElementById('sendButton');
    sendButton.disabled = true;

    // Create a new paragraph element for the input
    const inputElement = document.createElement('p');
    inputElement.className = 'user-p';
    inputElement.textContent = `User: ${input}`;

    // Append the new output element to the chat window
    chatWindow.appendChild(inputElement);

    // Scroll to the bottom of the chat window
    chatWindow.scrollTop = chatWindow.scrollHeight;

    chrome.tabs.sendMessage(tabs[0].id, { action: "getChatBotOutput", chatInput: input });
  });
});

// Function to fetch the selected content of the webpage
function getSelectionContent() {
  const contentElements = window.getSelection();
  return contentElements.toString();
}

// Function to display error when analyze button is pressed and conditions are met
function displayError(message) {
  let errorMessage = document.querySelector('.error-message');
  if (!errorMessage) {
    errorMessage = document.createElement('div');
    errorMessage.classList.add('error-message');
    document.querySelector('.popup-container').insertBefore(errorMessage, document.getElementById('analyzeButton'));
  }
  errorMessage.innerText = message;
}

// Function to send data to sidebar for analysis and population
function sendToSidebar(pageData) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    console.log("Sending data for analysis...");
    chrome.tabs.sendMessage(tabId, { action: 'analyzeContent', tabId: tabId, pageData: pageData });
  });
}