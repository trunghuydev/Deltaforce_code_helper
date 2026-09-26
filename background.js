// background.js

let state = {
  isRunning: false,
  isCompleted: false,
  currentIndex: 0,
  totalCodes: 0,
  delayMs: 5000,
  codes: [],
  results: []
};

function saveState() {
  chrome.storage.local.set({
    appState: {
      isRunning: state.isRunning,
      isCompleted: state.isCompleted,
      currentIndex: state.currentIndex,
      totalCodes: state.totalCodes
    },
    results: state.results
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'start') {
    if (state.isRunning) return;
    
    state.codes = request.codes;
    state.delayMs = request.delay * 1000;
    state.totalCodes = state.codes.length;
    state.currentIndex = 0;
    state.isRunning = true;
    state.isCompleted = false;
    
    // Khởi tạo mảng kết quả
    state.results = state.codes.map(code => ({
      code: code,
      status: 'waiting',
      message: ''
    }));
    
    saveState();
    processQueue();
  } 
  else if (request.action === 'stop') {
    state.isRunning = false;
    saveState();
  }
});

async function processQueue() {
  if (!state.isRunning || state.currentIndex >= state.codes.length) {
    if (state.currentIndex >= state.codes.length && state.codes.length > 0) {
      state.isCompleted = true;
      state.isRunning = false;
      saveState();
    }
    return;
  }

  const currentCode = state.codes[state.currentIndex];
  
  // Cập nhật trạng thái đang xử lý
  state.results[state.currentIndex].status = 'processing';
  saveState();

  try {
    // Lấy active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      throw new Error("Không tìm thấy tab hoạt động.");
    }
    
    const activeTabId = tabs[0].id;
    
    // Gửi code tới content script
    const response = await chrome.tabs.sendMessage(activeTabId, {
      action: 'process_code',
      code: currentCode
    }).catch(err => {
      throw new Error("Không thể kết nối với trang web. Vui lòng reload lại trang Delta Force.");
    });
    
    if (response && response.status === 'success') {
      state.results[state.currentIndex].status = 'success';
    } else if (response && response.status === 'sent') {
      state.results[state.currentIndex].status = 'sent';
    } else {
      state.results[state.currentIndex].status = 'error';
      state.results[state.currentIndex].message = response?.message || "Lỗi không xác định";
    }
    
  } catch (error) {
    state.results[state.currentIndex].status = 'error';
    state.results[state.currentIndex].message = error.message;
  }
  
  state.currentIndex++;
  saveState();
  
  // Chờ delay rồi chạy tiếp
  if (state.isRunning && state.currentIndex < state.codes.length) {
    setTimeout(processQueue, state.delayMs);
  } else if (state.currentIndex >= state.codes.length) {
    state.isCompleted = true;
    state.isRunning = false;
    saveState();
  }
}
