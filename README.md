# Delta Force Code Helper

Chrome Extension hỗ trợ nhập và đổi nhiều giftcode tự động trên trang web Delta Force. 

## Cấu trúc Project

```
DeltaForce-Code-Helper/
├── manifest.json       # Cấu hình extension (Manifest V3)
├── background.js       # Service worker quản lý queue chạy ngầm
├── content.js          # Script can thiệp DOM trên trang Delta Force
├── popup.html          # Giao diện popup
├── popup.css           # Style (Dark theme)
├── popup.js            # Xử lý logic giao diện
└── README.md           # Hướng dẫn
```

## Cách Cài Đặt (Load Unpacked)

1. Mở trình duyệt Chrome.
2. Truy cập vào trang quản lý tiện ích mở rộng bằng URL: `chrome://extensions/`
3. Ở góc trên cùng bên phải, bật công tắc **Developer mode** (Chế độ dành cho nhà phát triển).
4. Nhấn nút **Load unpacked** (Tải tiện ích đã giải nén).
5. Chọn thư mục `deltaforce_tool` chứa source code này.

## Cách Reload

Sau khi bạn chỉnh sửa source code (ví dụ: thay đổi selector trong `content.js` hoặc chỉnh giao diện):
1. Mở lại trang `chrome://extensions/`.
2. Tìm đến extension **Delta Force Code Helper**.
3. Nhấn vào nút biểu tượng **Reload** (Vòng lặp) để tải lại code mới.
4. (Lưu ý quan trọng) Reload lại trang web Delta Force để content script mới được inject vào.

## Cách Debug & Xem Lỗi

- **Lỗi ở Popup**: Click chuột phải vào biểu tượng của extension trên thanh công cụ -> Chọn **Inspect popup** (Kiểm tra thẻ bật lên). Chuyển sang tab **Console** để xem log/lỗi.
- **Lỗi ở Background (Service Worker)**: Vào `chrome://extensions/` -> Tìm extension này -> Nhấn vào chữ **service worker** màu xanh. Một cửa sổ DevTools sẽ mở ra để xem log ngầm.
- **Lỗi ở Content Script**: Mở trang web Delta Force -> Nhấn **F12** (hoặc chuột phải -> Kiểm tra) -> Mở tab **Console**. Content script chạy trong context của trang web nên log sẽ hiện ở đây.

## Cách Thay Đổi Cấu Hình (CONFIG)

Toàn bộ thông số về DOM và timeout được gom gọn trong file `content.js`. Bạn mở file này bằng VS Code và tìm đoạn đầu tiên:

```javascript
const CONFIG = {
  inputSelector: ".exc-input",             // Class/ID của ô nhập code
  exchangeButtonSelector: ".btn-exchange", // Class/ID của nút Đổi
  resultSelectors: [                       // Các Class/ID có thể chứa thông báo kết quả
    ".toast", ".notification", ".message", ".alert"
  ],
  inputDelay: 300,                         // Thời gian (ms) chờ sau khi nhập code trước khi click Đổi
  actionTimeout: 10000,                    // Thời gian (ms) chờ tối đa để tìm thấy input hoặc nút bấm
  resultTimeout: 5000                      // Thời gian (ms) chờ tối đa để tìm thấy thông báo sau khi click
};
```

Sau khi sửa xong, nhớ làm theo hướng dẫn **Reload** ở trên.

## Cách Thay Đổi Delay Mặc Định

Delay (thời gian chờ giữa các code) mặc định có thể được thay đổi bằng cách sửa trực tiếp trong file `popup.html`:
Tìm dòng: `<input type="number" id="delay-input" min="1" max="60" value="10">`
Sửa `value="10"` thành số giây bạn muốn.

Hoặc thay đổi mặc định trong quá trình khởi tạo ở file `background.js`:
```javascript
let state = {
  // ...
  delayMs: 10000, // Thay đổi 10000 thành thời gian (ms) mong muốn
  // ...
};
```

## Đóng Gói (ZIP)

Nếu muốn gửi cho người khác hoặc lưu trữ:
1. Đảm bảo mọi thứ hoạt động tốt qua quá trình Load unpacked.
2. Nén toàn bộ các file trong thư mục `deltaforce_tool` thành một file `.zip` (Lưu ý: Nén các file bên trong, không nén bao gồm thư mục cha nếu không Chrome có thể báo lỗi cấu trúc khi người khác Load unpacked).
