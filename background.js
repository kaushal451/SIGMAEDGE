// Background Service Worker - LeadHarvest Chrome Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('LeadHarvest installed successfully');
});

// Handle any background messages if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'ok' });
  }
  return true;
});
