// content.js

// === CONFIGURATION ===
// === CONFIGURATION ===
const CONFIG = {
  // Thay vì 1 selector cứng, cho phép mảng các selector
  inputSelectors: [".exc-input", "input[type='text']", "input.spr"],
  exchangeButtonSelectors: [".btn-exchange", "a.spr", "a.btn", "button"],
  buttonTextMatch: ["đổi", "redeem", "exchange", "confirm"],
  resultSelectors: [
    ".toast",
    ".notification",
    ".message",
    ".alert",
    ".dialog",
    ".msg-content",
    ".pop-msg"
  ],
  inputDelay: 300,
  actionTimeout: 5000, // Giảm xuống 5s để biết lỗi nhanh hơn
  resultTimeout: 5000 
};
// =====================

// Hàm tìm phần tử dựa trên danh sách selector
function findElement(selectors, matchTexts = []) {
  for (const selector of selectors) {
    const els = document.querySelectorAll(selector);
    if (els.length === 0) continue;
    
    // Nếu không cần match text, trả về cái đầu tiên
    if (matchTexts.length === 0) return els[0];
    
    // Nếu cần match text (dành cho nút bấm)
    for (const el of els) {
      const text = el.textContent.trim().toLowerCase();
      if (matchTexts.some(t => text.includes(t))) {
        return el;
      }
    }
  }
  return null;
}

// Hàm chờ một element xuất hiện trên DOM
function waitForElement(selectors, matchTexts = [], timeout = CONFIG.actionTimeout) {
  return new Promise((resolve, reject) => {
    const el = findElement(selectors, matchTexts);
    if (el) {
      return resolve(el);
    }

    const observer = new MutationObserver((mutations, obs) => {
      const el = findElement(selectors, matchTexts);
      if (el) {
        obs.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout: Không tìm thấy phần tử (${selectors.join(', ')})`));
    }, timeout);
  });
}

// Hàm giả lập việc nhập liệu để kích hoạt event của framework
function setNativeValue(element, value) {
  try {
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    
    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else if (prototypeValueSetter) {
      prototypeValueSetter.call(element, value);
    } else {
      element.value = value;
    }
  } catch (e) {
    // Fallback nếu có lỗi
    element.value = value;
  }
}

// Hàm chờ kết quả trả về từ UI
async function waitForResult() {
  return new Promise((resolve) => {
    let resolved = false;
    
    // Tạo observer theo dõi toàn bộ thay đổi DOM để bắt toast/notification
    const observer = new MutationObserver((mutations) => {
      for (const selector of CONFIG.resultSelectors) {
        const resultEl = document.querySelector(selector);
        if (resultEl && resultEl.textContent.trim().length > 0) {
          const text = resultEl.textContent.toLowerCase();
          
          if (!resolved) {
            resolved = true;
            observer.disconnect();
            
            // Phân tích nội dung kết quả một cách tương đối
            if (text.includes("thành công") || text.includes("success") || text.includes("nhận được")) {
              resolve({ status: 'success' });
            } else if (text.includes("thất bại") || text.includes("fail") || text.includes("đã sử dụng") || text.includes("hết hạn") || text.includes("lỗi") || text.includes("error") || text.includes("không hợp lệ") || text.includes("invalid")) {
              resolve({ status: 'error', message: resultEl.textContent.trim() });
            } else {
              // Có thông báo nhưng không rõ thành công hay thất bại
              resolve({ status: 'sent', message: resultEl.textContent.trim() });
            }
          }
          return;
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    // Fallback: Nếu sau khoảng thời gian không bắt được thông báo nào, coi như đã gửi
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        observer.disconnect();
        resolve({ status: 'sent', message: 'Không xác định được kết quả' });
      }
    }, CONFIG.resultTimeout);
  });
}

// Lắng nghe message từ background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'process_code') {
    // Chạy logic bất đồng bộ và phải return true để Chrome biết sẽ có phản hồi trễ
    processCode(request.code)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ status: 'error', message: error.message }));
    
    return true; 
  }
});

async function processCode(code) {
  try {
    // 1. Tìm input
    const inputEl = await waitForElement(CONFIG.inputSelectors);
    
    // 2. Clear và set value
    setNativeValue(inputEl, code);
    
    // 3. Trigger events
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    inputEl.dispatchEvent(new Event('blur', { bubbles: true }));
    
    // 4. Chờ một chút để UI cập nhật
    await new Promise(resolve => setTimeout(resolve, CONFIG.inputDelay));
    
    // 5. Tìm nút Đổi
    const btnEl = await waitForElement(CONFIG.exchangeButtonSelectors, CONFIG.buttonTextMatch);
    
    // 6. Chuẩn bị hứng kết quả trước khi click để không bị lỡ
    const resultPromise = waitForResult();
    
    // 7. Click nút
    btnEl.click();
    
    // 8. Chờ và trả về kết quả
    const result = await resultPromise;
    return result;
    
  } catch (err) {
    return { status: 'error', message: err.message };
  }
}
