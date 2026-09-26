// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const codesInput = document.getElementById('codes-input');
  const codeCount = document.getElementById('code-count');
  const btnPaste = document.getElementById('btn-paste');
  const btnClear = document.getElementById('btn-clear');
  const delayInput = document.getElementById('delay-input');
  const btnStart = document.getElementById('btn-start');
  const btnStop = document.getElementById('btn-stop');
  const progressText = document.getElementById('progress-text');
  const progressBar = document.getElementById('progress-bar');
  const resultsContainer = document.getElementById('results-container');
  const statusBadge = document.getElementById('status');

  // Khôi phục dữ liệu từ storage
  chrome.storage.local.get(['codes', 'delay', 'results', 'appState'], (data) => {
    if (data.codes) {
      codesInput.value = data.codes.join('\n');
      updateCodeCount();
    }
    if (data.delay) {
      delayInput.value = data.delay;
    }
    if (data.results) {
      renderResults(data.results);
    }
    
    // Khôi phục trạng thái UI nếu đang chạy
    if (data.appState) {
      updateUIState(data.appState);
    }
  });

  // Lắng nghe thay đổi từ storage để cập nhật UI realtime (nếu background đang chạy)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.appState) {
        updateUIState(changes.appState.newValue);
      }
      if (changes.results) {
        renderResults(changes.results.newValue);
      }
    }
  });

  // Cập nhật số lượng code
  codesInput.addEventListener('input', () => {
    updateCodeCount();
    saveData();
  });

  delayInput.addEventListener('change', () => {
    saveData();
  });

  function updateCodeCount() {
    const codes = getCodes();
    codeCount.textContent = `${codes.length} code`;
  }

  function getCodes() {
    const text = codesInput.value;
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  function saveData() {
    const codes = getCodes();
    const delay = parseInt(delayInput.value) || 5;
    chrome.storage.local.set({ codes, delay });
  }

  // Nút Dán
  btnPaste.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      const currentText = codesInput.value;
      codesInput.value = currentText + (currentText.endsWith('\n') || currentText === '' ? '' : '\n') + text;
      updateCodeCount();
      saveData();
    } catch (err) {
      alert('Không thể đọc clipboard. Vui lòng dùng Ctrl+V.');
    }
  });

  // Nút Xóa
  btnClear.addEventListener('click', () => {
    codesInput.value = '';
    updateCodeCount();
    saveData();
    chrome.storage.local.set({ results: [] });
    renderResults([]);
    updateProgress(0, 0);
    setStatus('ready');
  });

  // Render kết quả
  function renderResults(results) {
    if (!results) return;
    resultsContainer.innerHTML = '';
    
    results.forEach(res => {
      const item = document.createElement('div');
      item.className = 'result-item';
      
      const codeSpan = document.createElement('span');
      codeSpan.className = 'result-code';
      codeSpan.textContent = res.code;
      
      const statusSpan = document.createElement('span');
      statusSpan.className = 'result-status';
      
      switch (res.status) {
        case 'waiting':
          statusSpan.textContent = '⏳ Chờ';
          statusSpan.classList.add('status-waiting');
          break;
        case 'processing':
          statusSpan.textContent = '⏳ Đang xử lý';
          statusSpan.classList.add('status-processing');
          break;
        case 'success':
          statusSpan.textContent = '✓ Thành công';
          statusSpan.classList.add('status-success');
          break;
        case 'error':
          statusSpan.textContent = `✕ Lỗi: ${res.message || 'Thất bại'}`;
          statusSpan.classList.add('status-error');
          break;
        case 'sent':
          statusSpan.textContent = '✓ Đã gửi';
          statusSpan.classList.add('status-sent');
          break;
      }
      
      item.appendChild(codeSpan);
      item.appendChild(statusSpan);
      resultsContainer.appendChild(item);
    });
  }

  function updateProgress(current, total) {
    progressText.textContent = `${current} / ${total}`;
    const percent = total > 0 ? (current / total) * 100 : 0;
    progressBar.style.width = `${percent}%`;
  }

  function setStatus(status) {
    statusBadge.className = 'status-badge ' + status;
    switch (status) {
      case 'ready': statusBadge.textContent = 'Sẵn sàng'; break;
      case 'running': statusBadge.textContent = 'Đang chạy'; break;
      case 'stopped': statusBadge.textContent = 'Đã dừng'; break;
      case 'completed': statusBadge.textContent = 'Hoàn tất'; break;
    }
  }

  function updateUIState(appState) {
    if (!appState) return;

    if (appState.isRunning) {
      btnStart.disabled = true;
      btnStop.disabled = false;
      codesInput.disabled = true;
      delayInput.disabled = true;
      btnPaste.disabled = true;
      btnClear.disabled = true;
      setStatus('running');
    } else {
      btnStart.disabled = false;
      btnStop.disabled = true;
      codesInput.disabled = false;
      delayInput.disabled = false;
      btnPaste.disabled = false;
      btnClear.disabled = false;
      
      if (appState.isCompleted) {
        setStatus('completed');
      } else if (appState.currentIndex > 0) {
        setStatus('stopped');
      } else {
        setStatus('ready');
      }
    }
    
    updateProgress(appState.currentIndex, appState.totalCodes);
  }

  // Nút Bắt đầu
  btnStart.addEventListener('click', () => {
    const codes = getCodes();
    if (codes.length === 0) {
      alert('Vui lòng nhập ít nhất 1 code!');
      return;
    }
    
    const delay = parseInt(delayInput.value) || 5;
    
    // Gửi message cho background script để bắt đầu
    chrome.runtime.sendMessage({
      action: 'start',
      codes: codes,
      delay: delay
    });
  });

  // Nút Dừng
  btnStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stop' });
  });
});
